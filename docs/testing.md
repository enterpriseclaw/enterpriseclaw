# Testing

## Overview

EnterpriseClaw has 155+ tests across backend and frontend. Tests are split into unit/slice tests (fast, no external dependencies) and integration tests (require Docker via Testcontainers).

## Running Tests

### All Tests

```bash
task local:test:all
```

### Backend Only

```bash
task local:test:server
# or
cd apps/server && ./gradlew test
```

### Frontend Only

```bash
task local:test:frontend
# or
cd apps/frontend && bun vitest --run
```

### Single Backend Test

```bash
cd apps/server && ./gradlew test --tests "com.enterpriseclaw.chat.ChatControllerTest"
```

### Integration Tests (Testcontainers)

```bash
cd apps/server && task test:integration
# or
cd apps/server && ./gradlew integrationTest
```

Requires Docker running. Testcontainers starts PostgreSQL and Ollama containers automatically.

## Backend Testing

### Test Structure

Tests are in `apps/server/src/test/java/com/enterpriseclaw/`, mirroring the main source packages:

```
src/test/java/com/enterpriseclaw/
  audit/
  channel/
  chat/
    ApiContractTest.java
    ChatControllerTest.java
    ChatSessionRepositoryTest.java
    ModelRegistryTest.java
    ProviderRoutingTest.java
    SessionHistoryTest.java
    provider/
  config/
  cronjobs/
  gateway/
  settings/
  skills/
  websocket/
```

### Test Patterns

**Controller tests** use `@WebMvcTest` to test HTTP layer in isolation:

```java
@WebMvcTest(ChatController.class)
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ChatService chatService;

    @Test
    void createSession_returns200() throws Exception {
        when(chatService.createSession()).thenReturn(
            new SessionSummary("id", null, Instant.now(), "ACTIVE"));

        mockMvc.perform(post("/api/v1/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").exists());
    }
}
```

**Repository tests** use `@DataJpaTest` with H2:

```java
@DataJpaTest
class ChatSessionRepositoryTest {

    @Autowired
    private ChatSessionRepository repository;

    @Test
    void savesAndFindsById() {
        ChatSession session = ChatSession.builder()
                .id("test-id")
                .status(SessionStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
        repository.save(session);

        assertThat(repository.findById("test-id")).isPresent();
    }
}
```

**API contract tests** (`ApiContractTest.java`) verify HTTP method, path, status, and response-body shape for every implemented endpoint. This is the primary regression safety net for the REST API surface.

**Integration tests** use Testcontainers for real database and LLM connections:

```java
@SpringBootTest
@Tag("integration")
class PostgresGatewayIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg16");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

### Assertions

All backend tests use **AssertJ**:

```java
assertThat(result).isNotNull();
assertThat(result.status()).isEqualTo("ACTIVE");
assertThat(sessions).hasSize(3).extracting("id").contains("abc");
```

### Tags

- Unit and slice tests: no tag, run with `./gradlew test`
- Integration tests: `@Tag("integration")`, excluded from default test run, run with `./gradlew integrationTest`

## Frontend Testing

### Test Structure

Tests are co-located with source code or in dedicated test directories:

```
apps/frontend/src/
  App.test.tsx
  tests/
    api-contracts.test.ts
    mocks/
    setup.ts
  domain/
    chat/
      __tests__/
        useChat.test.ts
```

### Libraries

| Library | Purpose |
|---------|---------|
| Vitest | Test runner and assertion library |
| React Testing Library (RTL) | Component rendering and interaction |
| MSW (Mock Service Worker) | API mocking at the network level |

### Test Patterns

**Component tests** render components and assert on DOM output:

```typescript
import { render, screen } from '@testing-library/react'
import { WelcomeBanner } from './WelcomeBanner'

test('renders welcome message', () => {
  render(<WelcomeBanner />)
  expect(screen.getByText(/welcome/i)).toBeInTheDocument()
})
```

**Hook tests** use Vitest with MSW to mock API responses:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useChat } from '../useChat'

test('sends message and receives response', async () => {
  const { result } = renderHook(() => useChat('session-1'))

  act(() => {
    result.current.sendMessage('Hello')
  })

  await waitFor(() => {
    expect(result.current.messages).toHaveLength(2)
  })
})
```

**API contract tests** (`api-contracts.test.ts`) validate that MSW mock shapes match the contracts consumed by `config.ts` endpoints. This ensures frontend mocks stay in sync with the actual API.

### MSW Setup

MSW handlers live in `apps/frontend/src/tests/mocks/`. The test setup file (`setup.ts`) starts the MSW server before all tests.

Handlers intercept requests to endpoints defined in `config.ts` and return mock data matching the expected API shapes.

### Running Frontend Tests

```bash
# All tests
cd apps/frontend && bun vitest --run

# Watch mode
cd apps/frontend && bun vitest

# Single file
cd apps/frontend && bun vitest src/domain/chat/__tests__/useChat.test.ts
```

## Writing a New Backend Test

1. Create a test class in the matching test package.
2. Choose the right slice annotation:
   - `@WebMvcTest(YourController.class)` for controllers
   - `@DataJpaTest` for repositories
   - `@SpringBootTest` for integration tests
3. Mock dependencies with `@MockBean`.
4. Use AssertJ assertions.
5. Follow existing naming: `MethodName_condition_expectedResult` or descriptive names.

Example:

```java
@WebMvcTest(SkillsController.class)
class SkillsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SkillLoader skillLoader;

    @Test
    void listSkills_returnsLoadedSkills() throws Exception {
        when(skillLoader.getLoadedSkills()).thenReturn(List.of(
            new LoadedSkill("github", "GitHub ops", "", List.of())
        ));

        mockMvc.perform(get("/api/v1/skills"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("github"));
    }
}
```

## Writing a New Frontend Test

1. Create a test file co-located with the component or in `__tests__/`.
2. Add MSW handlers in `src/tests/mocks/` if the component makes API calls.
3. Use RTL for rendering, `screen` for queries, `userEvent` for interactions.
4. Match the mock response shape to the actual API contract.

Example:

```typescript
import { rest } from 'msw'
import { server } from '../../tests/mocks/server'
import { config } from '../../lib/config'

beforeEach(() => {
  server.use(
    rest.get(config.api.endpoints.skills, (req, res, ctx) =>
      res(ctx.json([
        { name: 'github', description: 'GitHub ops', toolCount: 3, provider: 'github' }
      ]))
    )
  )
})
```

## Test Coverage Summary

| Area | Test Types | Key Files |
|------|-----------|-----------|
| Chat controller | WebMvcTest | `ChatControllerTest.java` |
| Session repository | DataJpaTest | `ChatSessionRepositoryTest.java` |
| API contracts | MockMvc | `ApiContractTest.java` |
| Model registry | Unit | `ModelRegistryTest.java` |
| Provider routing | Unit | `ProviderRoutingTest.java` |
| Session history | Unit | `SessionHistoryTest.java` |
| Frontend API contracts | Vitest + MSW | `api-contracts.test.ts` |
| Chat hook | Vitest + MSW | `useChat.test.ts` |
| App render | Vitest + RTL | `App.test.tsx` |
