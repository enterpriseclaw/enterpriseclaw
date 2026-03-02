# Sprint 2 — Walking Skeleton

> **Epic:** Epic 2 — Chat end-to-end with stub LLM  
> **Goal:** A real user can type a message, it hits the backend, and a streaming NDJSON response renders live in the browser. No real LLM required — stub returns fake tokens.  
> **Prerequisites:** Sprint 1 complete (`task test` green, all entities + repositories exist)  
> **Test Gate:** Full message round-trip visible in browser with stub · NDJSON stream correctly parsed · Session created and persisted · All tests green

---

## Context

This sprint proves the entire pipe works: React → `POST /api/v1/chat` → `ResponseBodyEmitter` → NDJSON stream → `apiLongRequest` → `MessageThread`. A stub `ChatClient` emits pre-canned tokens so no real OpenAI key is needed.

This is the **highest-risk integration** in the whole project. Proving it early de-risks every subsequent sprint.

---

## Backend Deliverables

### 1. ChatEvent record

```java
// com/enterpriseclaw/chat/dto/ChatEvent.java
public record ChatEvent(
    String type,
    String text,
    String tool,
    String questionId,
    String message
) {
    public static ChatEvent token(String text)                  { return new ChatEvent("token",     text, null, null, null); }
    public static ChatEvent toolCall(String tool)               { return new ChatEvent("tool_call", null, tool, null, null); }
    public static ChatEvent toolDone(String tool)               { return new ChatEvent("tool_done", null, tool, null, null); }
    public static ChatEvent question(String qId, String text)   { return new ChatEvent("question",  text, null, qId,  null); }
    public static ChatEvent done()                              { return new ChatEvent("done",      null, null, null, null); }
    public static ChatEvent error(String msg)                   { return new ChatEvent("error",     null, null, null, msg);  }
}
```

### 2. Request/Response records

```java
// com/enterpriseclaw/chat/dto/ChatRequest.java
public record ChatRequest(
    @NotBlank String sessionId,
    @NotBlank String message,
    String model
) {}

// com/enterpriseclaw/chat/dto/SessionSummary.java
public record SessionSummary(
    String sessionId,
    String title,
    Instant lastMessageAt
) {}

// com/enterpriseclaw/chat/dto/AnswerRequest.java
public record AnswerRequest(
    @NotBlank String sessionId,
    @NotBlank String questionId,
    @NotBlank String answer
) {}
```

### 3. ChatService interface

```java
// com/enterpriseclaw/chat/ChatService.java
public interface ChatService {
    SessionSummary createSession();
    List<SessionSummary> listSessions();
    void deleteSession(String sessionId);
    void updateSessionTitle(String sessionId, String title);
    ResponseBodyEmitter streamChat(ChatRequest request);
    void submitAnswer(AnswerRequest request);
}
```

### 4. StubChatServiceImpl (Sprint 2 only — replaced in Sprint 3)

```java
// com/enterpriseclaw/chat/StubChatServiceImpl.java
@Service
@Primary  // overrides real impl until Sprint 3
@RequiredArgsConstructor
@Slf4j
public class StubChatServiceImpl implements ChatService {

    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final ObjectMapper objectMapper;

    @Override
    public SessionSummary createSession() {
        ChatSession session = ChatSession.builder()
            .id(UUID.randomUUID().toString())
            .userId("solo")
            .status(SessionStatus.ACTIVE)
            .createdAt(Instant.now())
            .lastMessageAt(Instant.now())
            .build();
        sessionRepo.save(session);
        return new SessionSummary(session.getId(), null, session.getLastMessageAt());
    }

    @Override
    public ResponseBodyEmitter streamChat(ChatRequest request) {
        // persist user message
        messageRepo.save(ChatMessage.builder()
            .id(UUID.randomUUID().toString())
            .sessionId(request.sessionId())
            .role(MessageRole.USER)
            .content(request.message())
            .createdAt(Instant.now())
            .build());

        ResponseBodyEmitter emitter = new ResponseBodyEmitter(30_000L);

        Thread.ofVirtual().start(() -> {
            try {
                String[] tokens = ("Stub response to: " + request.message()).split(" ");
                for (String token : tokens) {
                    emit(emitter, ChatEvent.token(token + " "));
                    Thread.sleep(80);
                }
                emit(emitter, ChatEvent.done());
                emitter.complete();
            } catch (Exception e) {
                emit(emitter, ChatEvent.error(e.getMessage()));
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    private void emit(ResponseBodyEmitter emitter, ChatEvent event) {
        try {
            emitter.send(objectMapper.writeValueAsString(event) + "\n");
        } catch (Exception e) {
            log.warn("Emit failed", e);
        }
    }

    // listSessions, deleteSession, updateSessionTitle, submitAnswer — basic CRUD implementations
}
```

### 5. ChatController

```java
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/sessions")
    public ResponseEntity<SessionSummary> createSession() {
        return ResponseEntity.ok(chatService.createSession());
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<SessionSummary>> listSessions() {
        return ResponseEntity.ok(chatService.listSessions());
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable String id) {
        chatService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/sessions/{id}/title")
    public ResponseEntity<Void> updateTitle(@PathVariable String id,
                                             @RequestBody Map<String, String> body) {
        chatService.updateSessionTitle(id, body.get("title"));
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/chat", produces = "application/x-ndjson")
    public ResponseBodyEmitter chat(@Valid @RequestBody ChatRequest request) {
        log.debug("Chat: sessionId={}", request.sessionId());
        return chatService.streamChat(request);
    }

    @PostMapping("/chat/answer")
    public ResponseEntity<Void> submitAnswer(@Valid @RequestBody AnswerRequest request) {
        chatService.submitAnswer(request);
        return ResponseEntity.ok().build();
    }
}
```

---

## Frontend Deliverables

### 1. domain/chat/types.ts

```ts
export interface ChatSession {
  sessionId: string;
  title: string | null;
  lastMessageAt: string;
}

export interface Message {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'done' | 'error';
  toolChips?: ToolChip[];
  questionCard?: QuestionCard;
}

export interface ToolChip {
  tool:   string;
  status: 'running' | 'done' | 'error';
}

export interface QuestionCard {
  questionId: string;
  text:       string;
  answered:   boolean;
}

export interface ChatEvent {
  type:       'token' | 'tool_call' | 'tool_done' | 'question' | 'done' | 'error';
  text?:      string;
  tool?:      string;
  questionId?:string;
  message?:   string;
}
```

### 2. domain/chat/chat.service.ts

```ts
import { apiRequest } from '@/lib/http';
import { config }     from '@/lib/config';
import type { ChatSession } from './types';

class ChatService {
  async createSession(): Promise<ChatSession> {
    return apiRequest<ChatSession>(config.api.endpoints.sessions, { method: 'POST' });
  }
  async listSessions(): Promise<ChatSession[]> {
    return apiRequest<ChatSession[]>(config.api.endpoints.sessions);
  }
  async deleteSession(id: string): Promise<void> {
    await apiRequest(config.api.endpoints.session(id), { method: 'DELETE' });
  }
  async updateTitle(id: string, title: string): Promise<void> {
    await apiRequest(config.api.endpoints.session(id) + '/title', {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }
  async submitAnswer(sessionId: string, questionId: string, answer: string): Promise<void> {
    await apiRequest(config.api.endpoints.chatAnswer, {
      method: 'POST',
      body: JSON.stringify({ sessionId, questionId, answer }),
    });
  }
}

let instance: ChatService | null = null;
export function getChatService(): ChatService {
  if (!instance) instance = new ChatService();
  return instance;
}
```

### 3. domain/chat/useChat.ts

```ts
export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<QuestionCard | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string, model: string) => {
    setStreaming(true);
    abortRef.current = new AbortController();

    // add user message immediately
    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text }]);

    // add empty assistant message for streaming into
    const asstMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: asstMsgId, role: 'assistant', content: '', status: 'streaming' }]);

    try {
      for await (const event of apiLongRequest<ChatEvent>(
        config.api.endpoints.chat,
        { sessionId, message: text, model },
        abortRef.current.signal
      )) {
        switch (event.type) {
          case 'token':
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId ? { ...m, content: m.content + (event.text ?? '') } : m
            ));
            break;
          case 'tool_call':
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId
                ? { ...m, toolChips: [...(m.toolChips ?? []), { tool: event.tool!, status: 'running' }] }
                : m
            ));
            break;
          case 'tool_done':
            setMessages(prev => prev.map(m =>
              m.id === asstMsgId
                ? { ...m, toolChips: m.toolChips?.map(c => c.tool === event.tool ? { ...c, status: 'done' } : c) }
                : m
            ));
            break;
          case 'question':
            setPendingQuestion({ questionId: event.questionId!, text: event.text!, answered: false });
            setStreaming(false);
            return;
          case 'done':
            setMessages(prev => prev.map(m => m.id === asstMsgId ? { ...m, status: 'done' } : m));
            setStreaming(false);
            break;
          case 'error':
            setMessages(prev => prev.map(m => m.id === asstMsgId ? { ...m, status: 'error' } : m));
            setStreaming(false);
            break;
        }
      }
    } catch (err) {
      setStreaming(false);
    }
  }, [sessionId]);

  return { messages, streaming, pendingQuestion, sendMessage, setPendingQuestion };
}
```

### 4. ChatPage, MessageThread, MessageInput components

**ChatPage** (`domain/chat/ChatPage.tsx`):
- On mount: `POST /api/v1/sessions` → sets `sessionId` → updates URL to `/chat/:sessionId`
- Renders `<MessageThread>` and `<MessageInput>`
- If no messages: shows `WelcomeBanner` with 3 example prompt chips

**MessageThread** (`domain/chat/MessageThread.tsx`):
- Renders list of `<MessageBubble>` components
- Shows `<ThinkingIndicator>` (spinner) while `streaming === true` and last message has no content yet
- Shows `<ToolCallChip>` for each tool chip in a message
- Shows `<QuestionCard>` when `pendingQuestion` is set

**MessageInput** (`domain/chat/MessageInput.tsx`):
- Textarea + Send button
- Disabled while `streaming === true` or `pendingQuestion !== null`
- Enter sends (Shift+Enter = newline)
- Model selector chip (dropdown, populated from config)

**QuestionCard** (`domain/chat/QuestionCard.tsx`):
```tsx
export function QuestionCard({ question, onSubmit }: { question: QuestionCard; onSubmit: (answer: string) => void }) {
  const [answer, setAnswer] = useState('');
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <p className="font-medium">🤔 Before I continue…</p>
      <p className="mt-2 text-sm">{question.text}</p>
      <div className="mt-3 flex gap-2">
        <input value={answer} onChange={e => setAnswer(e.target.value)}
               className="flex-1 rounded border px-3 py-1.5 text-sm" />
        <button onClick={() => onSubmit(answer)}
                className="rounded bg-primary px-3 py-1.5 text-sm text-white">Submit</button>
      </div>
    </div>
  );
}
```

### 5. Sidebar session list

- `GET /api/v1/sessions` on mount → render list of last 50 sessions
- Each entry: session title (or "New Chat" if null), `lastMessageAt` relative time
- Clicking a session navigates to `/chat/:sessionId`
- **⋮** menu: Rename, Delete (confirmation dialog)

---

## Tests

### Backend — `@WebMvcTest ChatController`

```java
@WebMvcTest(ChatController.class)
class ChatControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean  ChatService chatService;

    @Test
    void post_chat_returnsNdjsonStream() throws Exception {
        ResponseBodyEmitter emitter = new ResponseBodyEmitter();
        // pre-populate emitter synchronously for test
        given(chatService.streamChat(any())).willReturn(stubNdjsonEmitter(
            ChatEvent.token("Hello "), ChatEvent.token("world"), ChatEvent.done()
        ));

        MvcResult result = mockMvc.perform(post("/api/v1/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"sessionId":"s1","message":"hi","model":"gpt-4o"}"""))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", containsString("application/x-ndjson")))
            .andReturn();

        String body = result.getResponse().getContentAsString();
        List<String> types = parseNdjsonTypes(body);
        assertThat(types).containsExactly("token", "token", "done");
    }

    @Test
    void post_sessions_createsSession() throws Exception {
        given(chatService.createSession()).willReturn(
            new SessionSummary("session-1", null, Instant.now())
        );

        mockMvc.perform(post("/api/v1/sessions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessionId").value("session-1"));
    }
}
```

### Backend — `StubChatServiceImpl` unit test

```java
class StubChatServiceImplTest {

    @Test
    void streamChat_emitsTokensForEachWord() throws Exception {
        // given
        StubChatServiceImpl service = new StubChatServiceImpl(mockSessionRepo, mockMessageRepo, new ObjectMapper());
        ChatRequest req = new ChatRequest("s1", "hello world", "gpt-4o");

        // when
        ResponseBodyEmitter emitter = service.streamChat(req);

        // then — collect events from emitter
        List<ChatEvent> events = collectEmitterEvents(emitter);
        assertThat(events).extracting(ChatEvent::type)
            .containsSubsequence("token", "done");
    }
}
```

### Frontend — `useChat` hook test

```ts
test('sendMessage streams tokens into messages', async () => {
  server.use(http.post('/api/v1/chat', () => {
    const enc = new TextEncoder();
    return new HttpResponse(
      new ReadableStream({ start(c) {
        c.enqueue(enc.encode('{"type":"token","text":"Hello "}\n'));
        c.enqueue(enc.encode('{"type":"token","text":"world"}\n'));
        c.enqueue(enc.encode('{"type":"done"}\n'));
        c.close();
      }}),
      { headers: { 'Content-Type': 'application/x-ndjson' } }
    );
  }));

  const { result } = renderHook(() => useChat('session-1'));
  act(() => { result.current.sendMessage('hi', 'gpt-4o'); });

  await waitFor(() =>
    expect(result.current.messages.at(-1)?.content).toBe('Hello world')
  );
  expect(result.current.streaming).toBe(false);
});
```

### Frontend — `ChatPage` component test

```tsx
test('shows welcome banner when no messages', () => {
  render(<ChatPage />);
  expect(screen.getByText(/Welcome to EnterpriseClaw/i)).toBeInTheDocument();
});

test('creates session on mount and updates URL', async () => {
  server.use(http.post('/api/v1/sessions', () =>
    HttpResponse.json({ sessionId: 'new-session-id', title: null })
  ));
  render(<ChatPage />, { wrapper: MemoryRouterWrapper });
  await waitFor(() =>
    expect(window.location.pathname).toContain('new-session-id')
  );
});
```

---

## Acceptance Criteria

- [ ] `POST /api/v1/sessions` creates a session and returns `{ sessionId, ... }`
- [ ] `POST /api/v1/chat` returns `application/x-ndjson` stream with `token` + `done` events
- [ ] Browser: type a message → see it appear in thread → see streaming tokens → see finalised response
- [ ] Session URL updates to `/chat/:sessionId` on page load
- [ ] Session list appears in sidebar (pulled from `GET /api/v1/sessions`)
- [ ] `QuestionCard` renders and disables input when `question` event received
- [ ] `ToolCallChip` renders when `tool_call` event received
- [ ] `task test` fully green
- [ ] `task build` produces working JAR

---

## Handover Notes

- The `StubChatServiceImpl` has `@Primary` — it will be removed in Sprint 3 when real AI wiring is added.
- The `ChatClient` interface does not need to exist yet — just the stub impl.
- Keep the stub realistic: real token-by-token delays (80ms) to validate the streaming UX.
- Do **not** implement AskUserQuestion server-side logic — just render the card client-side for now.
- Markdown rendering of assistant messages is NOT required this sprint — plain text is fine.
