# EnterpriseClaw — Test Strategy

> Cross-cutting test strategy for all sprints. Every developer and QA engineer should read this before starting.  
> Stack: Vitest + RTL + msw (frontend) · JUnit 5 + WireMock + Spring Boot Test (backend)

---

## Test Pyramid

```
          ┌─────────────────┐
          │   E2E Smoke     │  .http files via ijhttp — 1 happy path per endpoint group
          │   (slowest)     │
        ┌─┴─────────────────┴─┐
        │  Integration Tests  │  WireMock LLM stub + full Spring context
        │                     │  @SpringBootTest + msw (frontend)
      ┌─┴─────────────────────┴─┐
      │      Slice Tests        │  @WebMvcTest, @DataJpaTest
      │                         │  RTL component tests
    ┌─┴─────────────────────────┴─┐
    │        Unit Tests           │  Pure Java/TS, no framework, fastest
    │        (fastest)            │  Services, hooks, utilities
    └─────────────────────────────┘
```

---

## Layer 1 — Unit Tests

**When to use:** Any class/function with business logic that has no framework dependency.

### Backend

```java
// No Spring context, no annotations, just plain Java
class ChatServiceImplTest {

    ChatServiceImpl service = new ChatServiceImpl(
        mock(ChatClient.class),
        mock(ChatSessionRepository.class),
        new ObjectMapper()
    );

    @Test
    void createSession_returnsSessionWithGeneratedId() {
        when(sessionRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        SessionSummary result = service.createSession();
        assertThat(result.sessionId()).isNotBlank();
    }
}
```

**Target coverage:** ≥ 80% line coverage on service layer

**Run with:** `./gradlew test --tests "*Test"` (fast — no Spring context startup)

### Frontend

```ts
// Pure function tests — no render, no DOM
import { buildSkillMd, parseSkillFrontmatter } from '@/domain/skills/utils';

test('buildSkillMd produces valid SKILL.md with frontmatter', () => {
  const md = buildSkillMd({ name: 'test-skill', description: 'Does things', allowedTools: 'Read', model: '' }, '# Content');
  expect(md).toMatch(/^---\nname: test-skill/);
});

// Hook tests with renderHook
test('useChat initializes with empty messages', () => {
  const { result } = renderHook(() => useChat('session-1'));
  expect(result.current.messages).toEqual([]);
  expect(result.current.streaming).toBe(false);
});
```

**Run with:** `bun run vitest --run`

---

## Layer 2a — Spring Slice Tests

### `@WebMvcTest` — Controller testing

```java
@WebMvcTest(ChatController.class)
class ChatControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean  ChatService chatService;  // mock the service, test only the controller

    @Test
    void post_chat_requiresSessionId() throws Exception {
        mockMvc.perform(post("/api/v1/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"message":"hello","model":"gpt-4o"}"""))  // missing sessionId
            .andExpect(status().isBadRequest());
    }

    @Test
    void get_sessions_returns200() throws Exception {
        given(chatService.listSessions()).willReturn(List.of());
        mockMvc.perform(get("/api/v1/sessions"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$").isArray());
    }
}
```

**Rules:**
- One `@WebMvcTest` class per controller
- `@MockBean` for every service dependency — test controller wiring, validation, and response shapes only
- Test happy path + validation failure + not-found for each endpoint

### `@DataJpaTest` — Repository testing

```java
@DataJpaTest
class AgentRunLogRepositoryTest {

    @Autowired AgentRunLogRepository repo;

    @Test
    void skillUsageStats_groupsAndOrders() {
        repo.save(log("code-reviewer")); repo.save(log("code-reviewer")); repo.save(log("web-search"));

        List<Object[]> stats = repo.skillUsageStats();

        assertThat(stats).hasSize(2);
        assertThat(stats.get(0)[0]).isEqualTo("code-reviewer");
        assertThat(stats.get(0)[1]).isEqualTo(2L);
    }
}
```

**Rules:**
- Uses in-memory H2 automatically (no config needed)
- Test every custom `@Query` method
- Seed data in `@BeforeEach` or in-test

---

## Layer 2b — React Component Tests (RTL)

```tsx
// Every page component has at minimum these tests:
// 1. Renders without crashing
// 2. Displays loading state
// 3. Displays data from API
// 4. Handles empty state
// 5. Handles error state

describe('SkillsPage', () => {
  test('shows loading skeleton while fetching', () => {
    server.use(http.get('/api/v1/skills', async () => {
      await delay(Infinity);  // never resolves
      return HttpResponse.json([]);
    }));
    render(<SkillsPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();  // loading spinner
  });

  test('renders skill cards', async () => {
    server.use(http.get('/api/v1/skills', () =>
      HttpResponse.json([{ name: 'code-reviewer', description: 'Reviews code', source: 'built-in' }])
    ));
    render(<SkillsPage />);
    await screen.findByText('code-reviewer');
  });

  test('filters by search term', async () => {
    // seed 2 skills, type in search box, assert only matching one shown
  });

  test('shows empty state when no skills', async () => {
    server.use(http.get('/api/v1/skills', () => HttpResponse.json([])));
    render(<SkillsPage />);
    await screen.findByText(/no skills/i);
  });
});
```

---

## Layer 3 — Integration Tests (WireMock)

Full Spring context with real database (H2) and LLM calls stubbed via WireMock.

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@WireMockTest(httpPort = 9090)
@ActiveProfiles("solo")
class ChatIntegrationTest {

    @Autowired TestRestTemplate rest;
    @Autowired AgentRunLogRepository auditRepo;

    @Test
    void fullChatFlow_persistsAuditRow_andReturnsNdjsonStream() {
        // 1. Stub OpenAI
        stubFor(post(urlEqualTo("/v1/chat/completions"))
            .willReturn(ok()
                .withHeader("Content-Type", "text/event-stream")
                .withBody(openAiStreamBody("Hello from stub!"))));

        // 2. Create session
        SessionSummary session = rest.postForObject("/api/v1/sessions", null, SessionSummary.class);

        // 3. Send message
        ResponseEntity<String> chatResp = rest.exchange(
            RequestEntity.post("/api/v1/chat")
                .contentType(APPLICATION_JSON)
                .header("Accept", "application/x-ndjson")
                .body(new ChatRequest(session.sessionId(), "hello", "gpt-4o")),
            String.class
        );

        // 4. Assert NDJSON
        assertThat(chatResp.getStatusCode()).isEqualTo(OK);
        List<String> types = parseNdjsonTypes(chatResp.getBody());
        assertThat(types).contains("token", "done");

        // 5. Assert audit row
        assertThat(auditRepo.count()).isEqualTo(1);
    }
}
```

### WireMock OpenAI stream response helper

```java
private static String openAiStreamBody(String text) {
    return "data: " + """
        {"id":"chatcmpl-1","choices":[{"delta":{"content":"%s"},"index":0}]}
        """.formatted(text) + "\n\ndata: [DONE]\n\n";
}
```

---

## NDJSON Test Helpers

### Backend helper

```java
// src/test/java/com/enterpriseclaw/TestHelpers.java
public class TestHelpers {

    public static List<String> parseNdjsonTypes(String body) {
        return Arrays.stream(body.split("\n"))
            .filter(line -> !line.isBlank())
            .map(line -> {
                try { return (String) JsonPath.read(line, "$.type"); }
                catch (Exception e) { return null; }
            })
            .filter(Objects::nonNull)
            .toList();
    }

    public static List<Map<String, Object>> parseNdjsonEvents(String body) {
        ObjectMapper om = new ObjectMapper();
        return Arrays.stream(body.split("\n"))
            .filter(line -> !line.isBlank())
            .map(line -> {
                try { return (Map<String, Object>) om.readValue(line, Map.class); }
                catch (Exception e) { return null; }
            })
            .filter(Objects::nonNull)
            .toList();
    }

    public static ResponseBodyEmitter stubNdjsonEmitter(ChatEvent... events) {
        ResponseBodyEmitter emitter = new ResponseBodyEmitter();
        ObjectMapper om = new ObjectMapper();
        Thread.ofVirtual().start(() -> {
            try {
                for (ChatEvent event : events) {
                    emitter.send(om.writeValueAsString(event) + "\n");
                    Thread.sleep(10);
                }
                emitter.complete();
            } catch (Exception ignored) {}
        });
        return emitter;
    }
}
```

### Frontend helper (msw)

```ts
// src/tests/helpers/ndjson.ts
export function ndjsonStream(events: object[]): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(ctrl) {
      for (const event of events) {
        ctrl.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      }
      ctrl.close();
    },
  });
}

// Usage in tests:
server.use(
  http.post('/api/v1/chat', () =>
    new HttpResponse(
      ndjsonStream([
        { type: 'token', text: 'Hello' },
        { type: 'done' },
      ]),
      { headers: { 'Content-Type': 'application/x-ndjson' } }
    )
  )
);
```

---

## Test Naming Convention

### Backend

```
methodName_stateUnderTest_expectedBehavior()

streamChat_withValidRequest_emitsTokensAndDone()
createSession_always_persistsWithGeneratedUUID()
findTop50_withMoreThan50Sessions_returnsOnlyTop50OrderedByLastMessage()
delete_builtInSkill_throwsUnsupportedOperationException()
```

### Frontend

```
describe('ComponentName', () => {
  test('renders [expected state] when [condition]', ...)
  test('[action] calls [endpoint/handler] with [expected args]', ...)
  test('shows [error/empty/loading] state when [condition]', ...)
})
```

---

## msw Setup

```ts
// src/tests/mocks/server.ts
import { setupServer } from 'msw/node';
export const server = setupServer();

// src/tests/setup.ts (referenced in vitest.config.ts)
import { server } from './mocks/server';
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    globals: true,
  },
});
```

---

## What NOT to Test

- Lombok-generated methods (`@Data`, `@Builder`)
- Spring auto-configuration (that's Spring Boot's job)
- `main()` method in `EnterpriseclawApplication`
- TypeScript types / interfaces (compile-time only)
- Tailwind class names
- shadcn/ui internal behaviour

---

## CI Test Requirements

All tests in all layers must:
- [ ] Pass with `OPENAI_API_KEY=""` (WireMock handles LLM calls)
- [ ] Be hermetic (no shared mutable state between tests)
- [ ] Complete layer 1+2 in < 3 minutes total
- [ ] Not rely on system time (use `Instant.now()` mocking where needed)
- [ ] Not write to disk outside `build/` or temp directories
- [ ] Not open real network connections (msw and WireMock handle all HTTP)

---

## Running Tests

```bash
# Backend — all
./gradlew test

# Backend — unit only (fast)
./gradlew test --tests "*.unit.*"

# Backend — single test class
./gradlew test --tests "com.enterpriseclaw.chat.ChatControllerTest"

# Frontend — all
bun run vitest --run

# Frontend — watch mode (dev)
bun run vitest

# Frontend — specific file
bun run vitest src/domain/chat/useChat.test.ts

# All
task test

# Smoke (requires running app)
task test:smoke
```
