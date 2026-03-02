# Sprint 3 — Real AI Core

> **Epic:** Epic 3 — ChatClient + SkillsTool + AskUserQuestionTool + EnterpriseAuditAdvisor  
> **Goal:** Replace the stub with a real Spring AI `ChatClient`. Skills in `.claude/skills/` are discovered and invoked. The agent can pause and ask clarifying questions. Every interaction is written to the audit log.  
> **Prerequisites:** Sprint 2 complete (walking skeleton green)  
> **Test Gate:** Real LLM call works end-to-end · Question card pause/resume works · Audit row written · All tests green

---

## Context

This is the core AI sprint. The stub `ChatServiceImpl` is replaced with a real implementation backed by Spring AI's `ChatClient`. Three major capabilities come online:

1. **SkillsTool** — semantic skill discovery and execution from `.claude/skills/`
2. **AskUserQuestionTool** — agent pauses stream, asks user, resumes on answer
3. **EnterpriseAuditAdvisor** — every interaction written to `agent_run_log`

---

## Backend Deliverables

### 1. Spring AI dependencies (add to build.gradle)

```groovy
// build.gradle additions
implementation platform('org.springframework.ai:spring-ai-bom:2.0.0-M2')
implementation 'org.springframework.ai:spring-ai-starter-model-openai'
implementation 'org.springframework.ai:spring-ai-starter-model-anthropic'
implementation 'org.springframework.ai:spring-ai-starter-vector-store-simple'
implementation 'org.springaicommunity:spring-ai-agent-utils:0.4.2'
```

### 2. AgentConfig bean

```java
// com/enterpriseclaw/agent/AgentConfig.java
@Configuration
@RequiredArgsConstructor
public class AgentConfig {

    private final SkillsTool skillsTool;
    private final AskUserQuestionTool askUserQuestionTool;
    private final ChatMemory chatMemory;
    private final EnterpriseAuditAdvisor auditAdvisor;

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .defaultToolCallbacks(skillsTool)
            .defaultTools(askUserQuestionTool)
            .defaultTools(FileSystemTools.builder().build())
            .defaultTools(ShellTools.builder().build())
            .defaultAdvisors(
                new MessageChatMemoryAdvisor(chatMemory),
                auditAdvisor
            )
            .build();
    }

    @Bean
    public ChatMemory chatMemory() {
        return new MessageWindowChatMemory(100); // 100 messages per session
    }
}
```

### 3. SkillsTool bean

```java
// com/enterpriseclaw/agent/SkillsConfig.java
@Configuration
public class SkillsConfig {

    @Bean
    public SkillsTool skillsTool(ResourceLoader resourceLoader) {
        return SkillsTool.builder()
            .addSkillsDirectory(".claude/skills")
            .addSkillsResource(resourceLoader.getResource("classpath:.claude/skills"))
            .build();
    }

    @Bean
    public AskUserQuestionTool askUserQuestionTool() {
        return AskUserQuestionTool.builder().build();
    }
}
```

### 4. EnterpriseAuditAdvisor

```java
// com/enterpriseclaw/audit/EnterpriseAuditAdvisor.java
@Component
@RequiredArgsConstructor
@Slf4j
public class EnterpriseAuditAdvisor implements CallAroundAdvisor {

    private final AgentRunLogRepository auditRepo;

    @Override
    public AdvisedResponse aroundCall(AdvisedRequest req, CallAroundAdvisorChain chain) {
        Instant start = Instant.now();
        AdvisedResponse resp = chain.nextAroundCall(req);
        try {
            String skillName = extractSkillName(resp);
            auditRepo.save(AgentRunLog.builder()
                .id(UUID.randomUUID().toString())
                .userId(contextValue(req, "userId", "solo"))
                .sessionId(contextValue(req, "sessionId", ""))
                .promptTokens(safePromptTokens(resp))
                .completionTokens(safeCompletionTokens(resp))
                .skillActivated(skillName)
                .durationMs(Duration.between(start, Instant.now()).toMillis())
                .createdAt(start)
                .build());
        } catch (Exception e) {
            log.warn("Failed to write audit log", e);
        }
        return resp;
    }

    @Override
    public int getOrder() { return Ordered.LOWEST_PRECEDENCE; }

    private String contextValue(AdvisedRequest req, String key, String fallback) {
        Object val = req.toolContext().get(key);
        return val != null ? val.toString() : fallback;
    }

    private String extractSkillName(AdvisedResponse resp) {
        // extract from tool calls in response if present
        return resp.response().getResults().stream()
            .filter(r -> r.getMetadata().containsKey("skillName"))
            .map(r -> r.getMetadata().get("skillName").toString())
            .findFirst().orElse(null);
    }

    private int safePromptTokens(AdvisedResponse resp) {
        try { return resp.response().getMetadata().getUsage().getPromptTokens(); }
        catch (Exception e) { return 0; }
    }

    private int safeCompletionTokens(AdvisedResponse resp) {
        try { return resp.response().getMetadata().getUsage().getGenerationTokens(); }
        catch (Exception e) { return 0; }
    }
}
```

### 5. Real ChatServiceImpl (replaces StubChatServiceImpl)

```java
// com/enterpriseclaw/chat/ChatServiceImpl.java
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    private final ChatClient chatClient;
    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final ObjectMapper objectMapper;

    // Map of sessionId → pending question (for AskUserQuestion pause/resume)
    private final Map<String, CompletableFuture<String>> pendingAnswers = new ConcurrentHashMap<>();

    @Override
    public ResponseBodyEmitter streamChat(ChatRequest request) {
        persistUserMessage(request);
        ResponseBodyEmitter emitter = new ResponseBodyEmitter(60_000L);

        Thread.ofVirtual().start(() -> {
            try {
                chatClient.prompt()
                    .user(request.message())
                    .toolContext(Map.of(
                        "sessionId", request.sessionId(),
                        "userId",    "solo",
                        "mode",      "solo"
                    ))
                    .stream()
                    .chatResponse()
                    .subscribe(
                        chunk  -> emitToken(emitter, chunk),
                        error  -> { emit(emitter, ChatEvent.error(error.getMessage())); emitter.complete(); },
                        ()     -> { emit(emitter, ChatEvent.done()); emitter.complete(); }
                    );
            } catch (Exception e) {
                log.error("Stream error for session {}", request.sessionId(), e);
                emit(emitter, ChatEvent.error(e.getMessage()));
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    @Override
    public void submitAnswer(AnswerRequest request) {
        CompletableFuture<String> future = pendingAnswers.remove(request.questionId());
        if (future != null) {
            future.complete(request.answer());
        } else {
            log.warn("No pending question for id {}", request.questionId());
        }
    }

    private void emitToken(ResponseBodyEmitter emitter, ChatResponse chunk) {
        String text = chunk.getResult().getOutput().getText();
        if (text != null && !text.isEmpty()) {
            emit(emitter, ChatEvent.token(text));
        }
    }

    private void emit(ResponseBodyEmitter emitter, ChatEvent event) {
        try {
            emitter.send(objectMapper.writeValueAsString(event) + "\n");
        } catch (Exception e) {
            log.warn("Emit failed", e);
        }
    }

    private void persistUserMessage(ChatRequest request) {
        messageRepo.save(ChatMessage.builder()
            .id(UUID.randomUUID().toString())
            .sessionId(request.sessionId())
            .role(MessageRole.USER)
            .content(request.message())
            .createdAt(Instant.now())
            .build());

        sessionRepo.findById(request.sessionId()).ifPresent(s -> {
            s.setLastMessageAt(Instant.now());
            sessionRepo.save(s);
        });
    }
}
```

**Remove `@Primary` from `StubChatServiceImpl`** or delete it entirely.

### 6. Session title auto-generation

After the first assistant response completes, generate a short title (≤ 60 chars):

```java
// Called async after stream completes
private void generateTitle(String sessionId, String firstUserMessage) {
    String title = chatClient.prompt()
        .system("Generate a short title (max 60 chars) for a chat session. Reply with ONLY the title.")
        .user(firstUserMessage)
        .call()
        .content();

    sessionRepo.findById(sessionId).ifPresent(s -> {
        s.setTitle(title.trim());
        sessionRepo.save(s);
    });
}
```

### 7. Built-in `.claude/skills/` directory

Create the following structure in the project root:

```
.claude/skills/
├── code-reviewer/
│   └── SKILL.md
├── web-search/
│   └── SKILL.md
└── doc-generator/
    └── SKILL.md
```

Example `code-reviewer/SKILL.md`:
```markdown
---
name: code-reviewer
description: Reviews code for security issues, best practices, and Spring Boot conventions. Use when user asks to review, analyze, or audit code files.
allowed-tools: Read, Grep
model: gpt-4o
---

# Code Reviewer

## Instructions
When reviewing code:
1. Check for security vulnerabilities (SQL injection, XSS, secrets in code)
2. Verify Spring Boot conventions (@Service, @Repository, etc.)
3. Look for potential null pointer exceptions
4. Suggest improvements for readability and maintainability
5. Provide specific, line-by-line feedback with code examples
```

---

## Frontend Deliverables

### 1. Streaming Markdown rendering

Replace plain-text rendering in `MessageBubble` with incremental Markdown:

```tsx
// Install: bun add react-markdown remark-gfm highlight.js
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return <div className="bg-muted rounded-lg px-4 py-2 self-end max-w-lg">{message.content}</div>;
  }
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
      {message.status === 'streaming' && <span className="inline-block w-1 animate-pulse">▋</span>}
    </div>
  );
}
```

### 2. Tool call chip expansion

```tsx
export function ToolCallChip({ chip }: { chip: ToolChip }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded px-2 py-0.5">
      {chip.status === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-500" />}
      {chip.tool}
    </button>
  );
}
```

### 3. Session title auto-update

After stream completes, poll `GET /api/v1/sessions` to pick up the auto-generated title and refresh the sidebar list.

---

## Tests

### Backend — Unit: `EnterpriseAuditAdvisor`

```java
class EnterpriseAuditAdvisorTest {

    AgentRunLogRepository mockRepo = mock(AgentRunLogRepository.class);
    EnterpriseAuditAdvisor advisor = new EnterpriseAuditAdvisor(mockRepo);

    @Test
    void aroundCall_savesAuditRow() {
        AdvisedRequest req = mockRequest(Map.of("userId", "u1", "sessionId", "s1"));
        AdvisedResponse resp = mockResponse(10, 20);
        CallAroundAdvisorChain chain = r -> resp;

        advisor.aroundCall(req, chain);

        ArgumentCaptor<AgentRunLog> captor = ArgumentCaptor.forClass(AgentRunLog.class);
        verify(mockRepo).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo("u1");
        assertThat(captor.getValue().getPromptTokens()).isEqualTo(10);
    }

    @Test
    void aroundCall_doesNotThrow_whenAuditFails() {
        doThrow(new RuntimeException("DB down")).when(mockRepo).save(any());
        // should not propagate
        assertThatCode(() -> advisor.aroundCall(mockRequest(Map.of()), r -> mockResponse(0, 0)))
            .doesNotThrowAnyException();
    }
}
```

### Backend — Integration: WireMock end-to-end

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@WireMockTest(httpPort = 9090)
class ChatIntegrationTest {

    @Autowired TestRestTemplate rest;
    @Autowired AgentRunLogRepository auditRepo;

    @Test
    void fullChatRoundTrip_writesAuditRow() throws Exception {
        // stub OpenAI streaming response
        stubFor(post(urlEqualTo("/v1/chat/completions"))
            .willReturn(ok()
                .withHeader("Content-Type", "text/event-stream")
                .withBody(FAKE_OPENAI_STREAM)));

        // create session
        SessionSummary session = rest.postForObject("/api/v1/sessions", null, SessionSummary.class);

        // call chat
        ResponseEntity<String> resp = rest.exchange(
            RequestEntity.post("/api/v1/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new ChatRequest(session.sessionId(), "hello", "gpt-4o")),
            String.class
        );

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        // parse NDJSON
        List<String> eventTypes = parseNdjsonTypes(resp.getBody());
        assertThat(eventTypes).contains("token", "done");

        // audit row written
        List<AgentRunLog> logs = auditRepo.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getUserId()).isEqualTo("solo");
    }
}
```

### Frontend — Question card integration test

```tsx
test('disables input and shows question card on question event', async () => {
  server.use(http.post('/api/v1/chat', () =>
    new HttpResponse(
      ndjsonStream([
        { type: 'question', questionId: 'q1', text: 'Which branch?' },
      ]),
      { headers: { 'Content-Type': 'application/x-ndjson' } }
    )
  ));

  render(<ChatPage sessionId="s1" />);
  await userEvent.type(screen.getByRole('textbox'), 'Review my code{enter}');

  await screen.findByText('Which branch?');
  expect(screen.getByRole('textbox', { name: /message/i })).toBeDisabled();
});
```

---

## Acceptance Criteria

- [ ] `StubChatServiceImpl` removed or `@Primary` removed — real `ChatClient` wired
- [ ] Sending a message to a running instance with a valid API key returns real LLM tokens
- [ ] `.claude/skills/code-reviewer/SKILL.md` exists and is discovered on startup
- [ ] `EnterpriseAuditAdvisor` writes a row to `agent_run_log` after each interaction
- [ ] `AskUserQuestionTool` pause/resume flow works: question event → card → submit answer → stream resumes
- [ ] Session title auto-generated after first assistant response
- [ ] Markdown code blocks render with syntax highlighting
- [ ] WireMock integration test passes without a real API key
- [ ] `task test` fully green

---

## Handover Notes

- Keep `OPENAI_API_KEY` in `.env` — the real flow needs it for manual testing but WireMock handles CI.
- `AskUserQuestionTool` pause/resume is complex — the `pendingAnswers` `ConcurrentHashMap` approach above is a starting point; review for thread safety.
- `spring-ai-agent-utils` version `0.4.2` — check for newer versions before starting.
- If OpenAI streaming format changes, update WireMock stub in `ChatIntegrationTest`.
- `FileSystemTools` and `ShellTools` are sandboxed by Docker in production — document this in the README.
