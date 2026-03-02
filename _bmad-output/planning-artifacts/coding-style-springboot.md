# EnterpriseClaw — Spring Boot Coding Style & Conventions

> Authoritative reference for all backend developers on EnterpriseClaw.  
> Stack: Spring Boot 4.0 · Java 21 · Spring AI 2.0 · Gradle (Groovy DSL) · Flyway · Lombok

---

## Table of Contents

- [General Philosophy](#general-philosophy)
- [Project Structure](#project-structure)
- [Naming Conventions](#naming-conventions)
- [Domain Package Layout](#domain-package-layout)
- [Controller Layer](#controller-layer)
- [Service Layer](#service-layer)
- [Repository Layer](#repository-layer)
- [JPA Entities](#jpa-entities)
- [NDJSON Streaming](#ndjson-streaming)
- [Spring AI Patterns](#spring-ai-patterns)
- [Configuration](#configuration)
- [Testing](#testing)
- [Gradle Build](#gradle-build)
- [Taskfile Commands](#taskfile-commands)

---

## General Philosophy

- **Convention over configuration** — rely on Spring Boot auto-configuration; only override when necessary.
- **Domain-driven packages** — group by feature domain, not technical layer.
- **Thin controllers, rich services** — controllers validate input and delegate; services own business logic.
- **Testability first** — every service has an interface; use constructor injection; avoid field injection (`@Autowired`).
- **Java 21 features** — use records, sealed classes, text blocks, pattern matching, and virtual threads freely.
- **Lombok for boilerplate** — use `@Data`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j` consistently.
- **No checked exceptions in service layer** — wrap in `RuntimeException` subclasses.

---

## Project Structure

```
src/main/java/com/enterpriseclaw/
├── agent/              ← Spring AI wiring (ChatClient, advisors, tool beans)
├── chat/               ← ChatController, ChatService, ChatSession, ChatMessage
├── skills/             ← SkillsController, SkillsService, SkillMetadata
├── cronjobs/           ← CronJobController, CronJobService, DynamicCronJobRunner, ScheduledJob
├── dashboard/          ← DashboardController, DashboardService, metrics DTOs
├── audit/              ← AuditEvent, AuditLogRepository, EnterpriseAuditAdvisor
├── settings/           ← SettingsController, SettingsService, UserProfile
├── common/             ← shared exceptions, response wrappers, utilities
└── EnterpriseclawApplication.java

src/main/resources/
├── application.yml
├── application-team.yml    ← team mode overrides (Postgres, Spring Security)
├── application-solo.yml    ← solo mode overrides (H2, no auth) [default]
└── db/migration/           ← Flyway SQL files (V1__, V2__, ...)

src/test/java/com/enterpriseclaw/
├── agent/              ← unit tests for AI config
├── chat/               ← ChatControllerTest (@WebMvcTest), ChatServiceTest (unit)
├── skills/             ← SkillsControllerTest, SkillsServiceTest
├── cronjobs/           ← DynamicCronJobRunnerTest (unit), CronJobControllerTest
├── dashboard/          ← DashboardRepositoryTest (@DataJpaTest)
├── audit/              ← EnterpriseAuditAdvisorTest (unit)
└── integration/        ← Full-stack tests with WireMock
```

---

## Naming Conventions

| What | Convention | Example |
|---|---|---|
| Packages | lowercase, dots | `com.enterpriseclaw.chat` |
| Classes | PascalCase | `ChatService`, `SkillsTool` |
| Interfaces | PascalCase (no `I` prefix) | `ChatService` (not `IChatService`) |
| Implementations | `Impl` suffix only when needed | `ChatServiceImpl` |
| Methods | camelCase, verb-first | `sendMessage()`, `findBySessionId()` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_STREAM_TIMEOUT_MS` |
| REST controllers | `{Domain}Controller` | `ChatController` |
| Services | `{Domain}Service` | `ChatService` |
| Repositories | `{Entity}Repository` | `ChatSessionRepository` |
| DTOs/Records | PascalCase + context | `ChatRequest`, `ChatEvent`, `SessionSummary` |
| Flyway migrations | `V{n}__{description}.sql` | `V1__create_chat_session.sql` |
| Test classes | `{Subject}Test` | `ChatControllerTest` |

---

## Domain Package Layout

Each domain package follows the same internal structure:

```
com/enterpriseclaw/chat/
├── ChatController.java         ← @RestController, thin delegation
├── ChatService.java            ← interface
├── ChatServiceImpl.java        ← @Service implementation
├── ChatSession.java            ← @Entity
├── ChatMessage.java            ← @Entity
├── ChatSessionRepository.java  ← JpaRepository
├── ChatMessageRepository.java  ← JpaRepository
├── dto/
│   ├── ChatRequest.java        ← record, inbound
│   ├── ChatEvent.java          ← record, outbound NDJSON event
│   └── SessionSummary.java     ← record, outbound
└── ChatControllerTest.java     ← or in src/test mirroring same path
```

---

## Controller Layer

```java
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;

    @PostMapping(value = "", produces = "application/x-ndjson")
    public ResponseBodyEmitter chat(@Valid @RequestBody ChatRequest request) {
        log.debug("Chat request: sessionId={}, model={}", request.sessionId(), request.model());
        return chatService.streamChat(request);
    }

    @PostMapping("/answer")
    public ResponseEntity<Void> submitAnswer(@Valid @RequestBody AnswerRequest request) {
        chatService.submitAnswer(request);
        return ResponseEntity.ok().build();
    }
}
```

**Rules:**
- `@RequestMapping` at class level with `/api/v1/{domain}` prefix.
- Use `@Valid` on every request body.
- Return `ResponseEntity<T>` for non-streaming endpoints.
- Return `ResponseBodyEmitter` for NDJSON streaming endpoints.
- No business logic in controllers — delegate to service immediately.
- Log at `debug` level on entry, `warn`/`error` on failures.

---

## Service Layer

```java
public interface ChatService {
    ResponseBodyEmitter streamChat(ChatRequest request);
    void submitAnswer(AnswerRequest request);
    SessionSummary createSession();
    void deleteSession(String sessionId);
}

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    private final ChatClient chatClient;
    private final ChatSessionRepository sessionRepository;
    private final ObjectMapper objectMapper;

    @Override
    public ResponseBodyEmitter streamChat(ChatRequest request) {
        ResponseBodyEmitter emitter = new ResponseBodyEmitter(60_000L);

        // Run on virtual thread to avoid blocking servlet thread
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
                        chunk  -> emit(emitter, ChatEvent.token(chunk.getResult().getOutput().getText())),
                        error  -> emit(emitter, ChatEvent.error(error.getMessage())),
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

    private void emit(ResponseBodyEmitter emitter, ChatEvent event) {
        try {
            emitter.send(objectMapper.writeValueAsString(event) + "\n");
        } catch (Exception e) {
            log.warn("Failed to emit event: {}", event, e);
        }
    }
}
```

**Rules:**
- Services always have an interface.
- Constructor injection only (via `@RequiredArgsConstructor`).
- Virtual threads (`Thread.ofVirtual()`) for blocking I/O and streaming.
- Catch and log exceptions at service boundaries; never swallow silently.
- Return domain objects or records — never JPA entities directly to controllers.

---

## Repository Layer

```java
public interface ChatSessionRepository extends JpaRepository<ChatSession, String> {

    List<ChatSession> findTop50ByUserIdOrderByLastMessageAtDesc(String userId);

    @Query("SELECT s FROM ChatSession s WHERE s.userId = :userId AND s.createdAt >= :since")
    List<ChatSession> findRecentSessions(@Param("userId") String userId,
                                         @Param("since") Instant since);
}
```

**Rules:**
- Extend `JpaRepository<Entity, ID>`.
- Use Spring Data derived query methods for simple queries.
- Use `@Query` JPQL for complex queries — not native SQL unless unavoidable.
- Never put business logic in repositories.

---

## JPA Entities

```java
@Entity
@Table(name = "chat_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatSession {

    @Id
    private String id;              // UUID, assigned by service layer

    @Column(nullable = false)
    private String userId;

    @Column(length = 60)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant lastMessageAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (lastMessageAt == null) lastMessageAt = Instant.now();
    }
}
```

**Rules:**
- `@Entity` + `@Table(name = "snake_case_plural")`.
- IDs are `String` UUIDs assigned in the service layer (not `@GeneratedValue`).
- Always `@Column(nullable = false)` on required fields.
- Use `Instant` for all timestamps (not `LocalDateTime`).
- Use `@Enumerated(EnumType.STRING)` — never ordinal.
- `@PrePersist` for default timestamps — never rely on DB defaults alone.
- Use Lombok `@Data` + `@Builder` + `@NoArgsConstructor` + `@AllArgsConstructor`.

---

## NDJSON Streaming

All AI chat responses stream as `application/x-ndjson`. Each line is a JSON-serialised `ChatEvent` record.

### ChatEvent record

```java
public record ChatEvent(String type, String text, String tool, String questionId, String message) {

    public static ChatEvent token(String text) {
        return new ChatEvent("token", text, null, null, null);
    }
    public static ChatEvent toolCall(String tool) {
        return new ChatEvent("tool_call", null, tool, null, null);
    }
    public static ChatEvent toolDone(String tool) {
        return new ChatEvent("tool_done", null, tool, null, null);
    }
    public static ChatEvent question(String questionId, String text) {
        return new ChatEvent("question", text, null, questionId, null);
    }
    public static ChatEvent done() {
        return new ChatEvent("done", null, null, null, null);
    }
    public static ChatEvent error(String message) {
        return new ChatEvent("error", null, null, null, message);
    }
}
```

### Event types

| Type | When emitted | Key fields |
|---|---|---|
| `token` | Each LLM output chunk | `text` |
| `tool_call` | Skill/tool invocation starts | `tool` |
| `tool_done` | Skill/tool invocation ends | `tool` |
| `question` | `AskUserQuestionTool` fires | `questionId`, `text` |
| `done` | Stream complete | — |
| `error` | Any error | `message` |

### Controller produces declaration

```java
@PostMapping(value = "/chat", produces = "application/x-ndjson")
public ResponseBodyEmitter chat(@RequestBody ChatRequest req) { ... }
```

---

## Spring AI Patterns

### AgentConfig bean

```java
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
            .defaultAdvisors(new MessageChatMemoryAdvisor(chatMemory), auditAdvisor)
            .build();
    }
}
```

### SkillsTool bean

```java
@Bean
public SkillsTool skillsTool(ResourceLoader resourceLoader) {
    return SkillsTool.builder()
        .addSkillsDirectory(".claude/skills")
        .addSkillsResource(resourceLoader.getResource("classpath:.claude/skills"))
        .build();
}
```

### ToolContext injection

Always inject these keys into every `ChatClient` call:

```java
chatClient.prompt()
    .user(message)
    .toolContext(Map.of(
        "sessionId", sessionId,
        "userId",    userId,
        "mode",      appMode   // "solo" or "team"
    ))
    .stream()
    .chatResponse()
    .subscribe(...);
```

### EnterpriseAuditAdvisor

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class EnterpriseAuditAdvisor implements CallAroundAdvisor {

    private final AuditLogRepository auditLog;

    @Override
    public AdvisedResponse aroundCall(AdvisedRequest req, CallAroundAdvisorChain chain) {
        Instant start = Instant.now();
        AdvisedResponse resp = chain.nextAroundCall(req);
        try {
            auditLog.save(AgentRunLog.builder()
                .id(UUID.randomUUID().toString())
                .userId(req.toolContext().getOrDefault("userId", "solo").toString())
                .sessionId(req.toolContext().getOrDefault("sessionId", "").toString())
                .promptTokens(resp.response().getMetadata().getUsage().getPromptTokens())
                .completionTokens(resp.response().getMetadata().getUsage().getGenerationTokens())
                .durationMs(Duration.between(start, Instant.now()).toMillis())
                .createdAt(start)
                .build());
        } catch (Exception e) {
            log.warn("Failed to write audit log entry", e);
        }
        return resp;
    }

    @Override
    public int getOrder() { return Ordered.LOWEST_PRECEDENCE; }
}
```

---

## Configuration

### application.yml (solo default)

```yaml
spring:
  profiles:
    active: solo
  datasource:
    url: jdbc:h2:file:./data/enterpriseclaw
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: validate           # Flyway owns the schema
    show-sql: false
  flyway:
    enabled: true
  ai:
    openai:
      api-key: ${OPENAI_API_KEY:}
    anthropic:
      api-key: ${ANTHROPIC_API_KEY:}

management:
  endpoints:
    web:
      exposure:
        include: health, info

server:
  address: 127.0.0.1              # solo — localhost only
  port: 8080
```

### application-team.yml

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
    driver-class-name: org.postgresql.Driver

server:
  address: 0.0.0.0               # team — accessible on network
```

---

## Testing

### Layer 1 — Unit tests (no Spring context)

```java
class ChatServiceImplTest {

    private ChatClient mockChatClient;
    private ChatServiceImpl service;

    @BeforeEach
    void setUp() {
        mockChatClient = mock(ChatClient.class);
        service = new ChatServiceImpl(mockChatClient, mock(ChatSessionRepository.class), new ObjectMapper());
    }

    @Test
    void streamChat_emitsTokensAndDone() {
        // given: stub ChatClient returns two tokens
        // when: streamChat called
        // then: emitter received "token","token","done" events
    }
}
```

### Layer 2 — Slice tests

```java
@WebMvcTest(ChatController.class)
class ChatControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean  ChatService chatService;

    @Test
    void post_chat_returnsNdjsonStream() throws Exception {
        given(chatService.streamChat(any())).willReturn(stubEmitter());

        MvcResult result = mockMvc.perform(post("/api/v1/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"sessionId":"s1","message":"hello","model":"gpt-4o"}"""))
            .andExpect(request().asyncStarted())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        List<String> types = Arrays.stream(body.split("\n"))
            .map(line -> JsonPath.read(line, "$.type"))
            .toList();

        assertThat(types).containsSubsequence("token", "done");
    }
}
```

```java
@DataJpaTest
class ChatSessionRepositoryTest {

    @Autowired ChatSessionRepository repo;

    @Test
    void findTop50_orderedByLastMessageAtDesc() {
        // seed data, assert ordering
    }
}
```

### Layer 3 — Integration tests (WireMock)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@WireMockTest
class ChatIntegrationTest {

    @Autowired TestRestTemplate rest;

    @Test
    void fullChatRoundTrip_writesAuditLog() {
        // stub WireMock for OpenAI
        stubFor(post(urlEqualTo("/v1/chat/completions"))
            .willReturn(okJson(FAKE_STREAM_RESPONSE)));

        // call /api/v1/chat
        // assert NDJSON events received
        // assert AgentRunLog row written to DB
    }
}
```

### Test naming

```
methodName_stateUnderTest_expectedBehavior()
streamChat_withValidRequest_emitsTokenEvents()
findTop50_withMoreThan50Sessions_returnsOnlyTop50()
```

---

## Gradle Build

```groovy
// build.gradle
plugins {
    id 'org.springframework.boot' version '4.0.0'
    id 'io.spring.dependency-management' version '1.1.7'
    id 'java'
}

group = 'com.enterpriseclaw'
sourceCompatibility = '21'

dependencies {
    implementation platform('org.springframework.ai:spring-ai-bom:2.0.0-M2')

    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.flywaydb:flyway-core'

    implementation 'org.springframework.ai:spring-ai-starter-model-openai'
    implementation 'org.springframework.ai:spring-ai-starter-model-anthropic'
    implementation 'org.springframework.ai:spring-ai-starter-vector-store-simple'
    implementation 'org.springaicommunity:spring-ai-agent-utils:0.4.2'

    implementation 'com.h2database:h2'
    runtimeOnly    'org.postgresql:postgresql'

    compileOnly    'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.wiremock:wiremock-standalone:3.5.2'
    testImplementation 'com.jayway.jsonpath:json-path:2.9.0'
}
```

### gradle.properties (performance)

```properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configuration-cache=true
org.gradle.vfs.watch=true
org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m
```

---

## Taskfile Commands

| Command | What it does |
|---|---|
| `task dev:backend` | `./gradlew bootRun` with hot-reload |
| `task test:backend` | `./gradlew test` |
| `task build:backend` | `./gradlew build` |
| `task lint:backend` | `./gradlew check -x test` |
| `task clean` | Wipe all build artefacts |

All tasks load `.env` automatically via `dotenv: ['.env']` in `Taskfile.yml`.
