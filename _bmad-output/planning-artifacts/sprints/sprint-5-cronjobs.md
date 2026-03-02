# Sprint 5 — CronJobs

> **Epic:** Epic 5 — Scheduler engine, CronJob CRUD, trigger now, execution history  
> **Goal:** Users can create, edit, enable/disable, and manually trigger scheduled AI jobs from the browser. The Spring `TaskScheduler` runs them on their cron schedule and logs execution history.  
> **Prerequisites:** Sprint 3 complete (real ChatClient wired)  
> **Test Gate:** CronJob CRUD tested · Scheduler fires at correct time · Execution history persisted · Manual trigger works · All tests green

---

## Context

CronJobs bring autonomous AI execution to EnterpriseClaw. Users define a prompt and a schedule — the agent runs it automatically. If the prompt needs clarification, `AskUserQuestionTool` redirects the question to the job owner's notification area in the web UI.

---

## Backend Deliverables

### 1. ScheduledJob entity (already created in Sprint 1 — verify fields)

```java
@Entity
@Table(name = "scheduled_jobs")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ScheduledJob {
    @Id private String id;
    private String userId;
    private String name;
    @Column(columnDefinition = "TEXT")
    private String prompt;
    private String cronExpression;
    @Enumerated(EnumType.STRING)
    private JobStatus status;       // ENABLED | DISABLED
    private String model;
    private boolean questionContextEnabled;
    private String sessionTarget;   // "isolated" | "main"
    private Instant lastRunAt;
    private Instant nextRunAt;
    private Instant createdAt;
}
```

### 2. JobExecution entity

```java
@Entity
@Table(name = "job_executions")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class JobExecution {
    @Id private String id;
    private String jobId;
    private Instant startedAt;
    private Instant completedAt;
    @Enumerated(EnumType.STRING)
    private ExecutionStatus status;  // RUNNING | COMPLETED | FAILED
    private int tokensUsed;
    private String skillActivated;
    @Column(columnDefinition = "TEXT")
    private String response;
    private long durationMs;
}
```

### 3. DynamicCronJobRunner

```java
// com/enterpriseclaw/cronjobs/DynamicCronJobRunner.java
@Component
@RequiredArgsConstructor
@Slf4j
public class DynamicCronJobRunner {

    private final TaskScheduler scheduler;
    private final ChatClient chatClient;
    private final ScheduledJobRepository jobRepo;
    private final JobExecutionRepository execRepo;
    private final ObjectMapper objectMapper;

    // Map of jobId → scheduled future (for cancellation)
    private final Map<String, ScheduledFuture<?>> scheduled = new ConcurrentHashMap<>();

    @PostConstruct
    public void loadAll() {
        jobRepo.findByStatus(JobStatus.ENABLED).forEach(this::register);
    }

    public void register(ScheduledJob job) {
        cancel(job.getId()); // cancel existing if re-registering
        ScheduledFuture<?> future = scheduler.schedule(
            () -> runJob(job),
            new CronTrigger(job.getCronExpression())
        );
        scheduled.put(job.getId(), future);
        log.info("Registered cron job '{}' with expression '{}'", job.getName(), job.getCronExpression());
    }

    public void cancel(String jobId) {
        ScheduledFuture<?> f = scheduled.remove(jobId);
        if (f != null) f.cancel(false);
    }

    public void triggerNow(String jobId) {
        jobRepo.findById(jobId).ifPresent(job ->
            Thread.ofVirtual().start(() -> runJob(job))
        );
    }

    private void runJob(ScheduledJob job) {
        log.info("Running cron job: {}", job.getName());
        String execId = UUID.randomUUID().toString();
        Instant start = Instant.now();

        JobExecution exec = JobExecution.builder()
            .id(execId)
            .jobId(job.getId())
            .startedAt(start)
            .status(ExecutionStatus.RUNNING)
            .build();
        execRepo.save(exec);

        try {
            String response = chatClient.prompt()
                .user(job.getPrompt())
                .toolContext(Map.of(
                    "jobId",  job.getId(),
                    "userId", job.getUserId(),
                    "mode",   "scheduled"
                ))
                .call()
                .content();

            execRepo.save(exec.toBuilder()
                .completedAt(Instant.now())
                .status(ExecutionStatus.COMPLETED)
                .response(response)
                .durationMs(Duration.between(start, Instant.now()).toMillis())
                .build());

            jobRepo.save(job.toBuilder()
                .lastRunAt(Instant.now())
                .nextRunAt(calculateNextRun(job.getCronExpression()))
                .build());

        } catch (Exception e) {
            log.error("CronJob '{}' failed", job.getName(), e);
            execRepo.save(exec.toBuilder()
                .completedAt(Instant.now())
                .status(ExecutionStatus.FAILED)
                .response(e.getMessage())
                .durationMs(Duration.between(start, Instant.now()).toMillis())
                .build());
        }
    }

    private Instant calculateNextRun(String cronExpression) {
        CronSequenceGenerator gen = new CronSequenceGenerator(cronExpression);
        return gen.next(new Date()).toInstant();
    }
}
```

### 4. CronJobService interface

```java
public interface CronJobService {
    List<CronJobSummary> listJobs();
    CronJobDetail getJob(String id);
    CronJobDetail createJob(CreateJobRequest request);
    CronJobDetail updateJob(String id, UpdateJobRequest request);
    void deleteJob(String id);
    void enableJob(String id);
    void disableJob(String id);
    void triggerNow(String id);
    Page<JobExecutionSummary> getHistory(String id, Pageable pageable);
    String parseSchedule(String naturalLanguage);  // LLM → cron expression
}
```

### 5. CronJobController

```java
@RestController
@RequestMapping("/api/v1/cronjobs")
@RequiredArgsConstructor
public class CronJobController {

    private final CronJobService cronJobService;

    @GetMapping
    public ResponseEntity<List<CronJobSummary>> list() {
        return ResponseEntity.ok(cronJobService.listJobs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CronJobDetail> get(@PathVariable String id) {
        return ResponseEntity.ok(cronJobService.getJob(id));
    }

    @PostMapping
    public ResponseEntity<CronJobDetail> create(@Valid @RequestBody CreateJobRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cronJobService.createJob(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CronJobDetail> update(@PathVariable String id,
                                                  @Valid @RequestBody UpdateJobRequest request) {
        return ResponseEntity.ok(cronJobService.updateJob(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        cronJobService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/enable")
    public ResponseEntity<Void> enable(@PathVariable String id) {
        cronJobService.enableJob(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<Void> disable(@PathVariable String id) {
        cronJobService.disableJob(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/trigger")
    public ResponseEntity<Void> trigger(@PathVariable String id) {
        cronJobService.triggerNow(id);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<Page<JobExecutionSummary>> history(@PathVariable String id, Pageable pageable) {
        return ResponseEntity.ok(cronJobService.getHistory(id, pageable));
    }

    @PostMapping("/parse-schedule")
    public ResponseEntity<Map<String, String>> parseSchedule(@RequestBody Map<String, String> body) {
        String cronExpr = cronJobService.parseSchedule(body.get("text"));
        return ResponseEntity.ok(Map.of("cronExpression", cronExpr));
    }
}
```

### 6. Parse schedule using LLM

```java
@Override
public String parseSchedule(String naturalLanguage) {
    String response = chatClient.prompt()
        .system("""
            Convert natural language schedule descriptions to Unix cron expressions.
            Reply with ONLY the cron expression (5 fields). Examples:
            "every day at 9am" → "0 9 * * *"
            "every Monday at 8 AM" → "0 8 * * 1"
            "every 30 minutes" → "*/30 * * * *"
            """)
        .user(naturalLanguage)
        .call()
        .content();
    return response.trim();
}
```

---

## Frontend Deliverables

### 1. domain/cronjobs/types.ts

```ts
export interface CronJob {
  id:                     string;
  name:                   string;
  prompt:                 string;
  cronExpression:         string;
  status:                 'ENABLED' | 'DISABLED';
  model:                  string | null;
  questionContextEnabled: boolean;
  sessionTarget:          'isolated' | 'main';
  lastRunAt:              string | null;
  nextRunAt:              string | null;
  createdAt:              string;
}

export interface JobExecution {
  id:           string;
  jobId:        string;
  startedAt:    string;
  completedAt:  string | null;
  status:       'RUNNING' | 'COMPLETED' | 'FAILED';
  tokensUsed:   number;
  skillActivated: string | null;
  response:     string | null;
  durationMs:   number;
}
```

### 2. CronJobsPage (`/cronjobs`)

Table with columns: Name, Prompt (first 80 chars), Schedule (human-readable), Status, Last Run, Next Run, Actions.

```tsx
export function CronJobsPage() {
  const { data: jobs } = useQuery({ queryKey: ['cronjobs'], queryFn: () => getCronJobsService().list() });

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">CronJobs</h1>
        <Button onClick={() => navigate('/cronjobs/new')}>+ New Job</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Prompt</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Run</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs?.map(job => <CronJobRow key={job.id} job={job} />)}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 3. CronJobForm (`/cronjobs/new` and `/cronjobs/:id`)

Form fields:
- **Name** — text input
- **Prompt** — textarea
- **Schedule** — visual cron builder with presets (every hour, every day at 9am, every Monday, etc.) + free-text for advanced, plus a "Parse natural language" input that calls `/api/v1/cronjobs/parse-schedule`
- **Model** — dropdown
- **Question context** — toggle
- **Session target** — radio: Isolated / Main

```tsx
function CronExpressionBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [nlInput, setNlInput] = useState('');
  const [parsing, setParsing] = useState(false);

  const parseNL = async () => {
    setParsing(true);
    try {
      const result = await getCronJobsService().parseSchedule(nlInput);
      onChange(result.cronExpression);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={nlInput} onChange={e => setNlInput(e.target.value)}
               placeholder="e.g. every weekday at 9 AM" className="flex-1 border rounded px-3 py-1.5" />
        <Button variant="outline" onClick={parseNL} disabled={parsing}>
          {parsing ? 'Parsing...' : 'Parse'}
        </Button>
      </div>
      <input value={value} onChange={e => onChange(e.target.value)}
             placeholder="0 9 * * 1-5" className="w-full border rounded px-3 py-1.5 font-mono" />
    </div>
  );
}
```

### 4. CronJob detail page — Execution history tab

```tsx
function ExecutionHistoryTab({ jobId }: { jobId: string }) {
  const [page, setPage] = useState(0);
  const { data } = useQuery({
    queryKey: ['cronjob-history', jobId, page],
    queryFn:  () => getCronJobsService().getHistory(jobId, page),
  });

  return (
    <div>
      <Table>
        {/* columns: started, duration, status, skill, tokens */}
      </Table>
      <ExecutionDetailDrawer />  {/* slides in on row click, shows full response */}
    </div>
  );
}
```

---

## Tests

### Backend — Unit: `DynamicCronJobRunner`

```java
class DynamicCronJobRunnerTest {

    TaskScheduler mockScheduler = mock(TaskScheduler.class);
    ChatClient mockClient = mock(ChatClient.class);
    ScheduledJobRepository mockJobRepo = mock(ScheduledJobRepository.class);
    JobExecutionRepository mockExecRepo = mock(JobExecutionRepository.class);

    DynamicCronJobRunner runner = new DynamicCronJobRunner(
        mockScheduler, mockClient, mockJobRepo, mockExecRepo, new ObjectMapper()
    );

    @Test
    void register_schedulesJobWithCorrectExpression() {
        ScheduledJob job = ScheduledJob.builder()
            .id("job-1").name("Test").prompt("do something")
            .cronExpression("0 9 * * *").status(JobStatus.ENABLED)
            .userId("solo").build();

        runner.register(job);

        verify(mockScheduler).schedule(any(Runnable.class), eq(new CronTrigger("0 9 * * *")));
    }

    @Test
    void cancel_stopsScheduledFuture() {
        ScheduledFuture<?> mockFuture = mock(ScheduledFuture.class);
        // register first, then cancel
        given(mockScheduler.schedule(any(), any())).willReturn(mockFuture);
        ScheduledJob job = stubJob("job-1", "0 9 * * *");
        runner.register(job);

        runner.cancel("job-1");

        verify(mockFuture).cancel(false);
    }

    @Test
    void runJob_writesCompletedExecution_onSuccess() {
        // stub chatClient to return "done"
        given(mockClient.prompt()).willReturn(/* stub chain returning "done" */);
        ScheduledJob job = stubJob("job-1", "0 9 * * *");

        runner.triggerNow("job-1");
        // wait for virtual thread
        Thread.sleep(200);

        ArgumentCaptor<JobExecution> captor = ArgumentCaptor.forClass(JobExecution.class);
        verify(mockExecRepo, atLeast(2)).save(captor.capture());
        assertThat(captor.getAllValues()).anyMatch(e -> e.getStatus() == ExecutionStatus.COMPLETED);
    }

    @Test
    void runJob_writesFailedExecution_onException() {
        given(mockClient.prompt()).willThrow(new RuntimeException("LLM unavailable"));
        runner.triggerNow("job-1");
        Thread.sleep(200);

        ArgumentCaptor<JobExecution> captor = ArgumentCaptor.forClass(JobExecution.class);
        verify(mockExecRepo, atLeast(2)).save(captor.capture());
        assertThat(captor.getAllValues()).anyMatch(e -> e.getStatus() == ExecutionStatus.FAILED);
    }
}
```

### Backend — `@WebMvcTest CronJobController`

```java
@Test
void post_trigger_returns202() throws Exception {
    mockMvc.perform(post("/api/v1/cronjobs/job-1/trigger"))
        .andExpect(status().isAccepted());
    verify(cronJobService).triggerNow("job-1");
}

@Test
void post_parseSchedule_returnsCronExpression() throws Exception {
    given(cronJobService.parseSchedule("every Monday at 8am")).willReturn("0 8 * * 1");

    mockMvc.perform(post("/api/v1/cronjobs/parse-schedule")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"text":"every Monday at 8am"}"""))
        .andExpect(jsonPath("$.cronExpression").value("0 8 * * 1"));
}
```

### Frontend — `CronJobsPage` tests

```tsx
test('renders job list from API', async () => {
  server.use(http.get('/api/v1/cronjobs', () =>
    HttpResponse.json([{ id: 'j1', name: 'Daily Report', cronExpression: '0 9 * * *', status: 'ENABLED' }])
  ));
  render(<CronJobsPage />);
  await screen.findByText('Daily Report');
});

test('trigger button calls POST trigger endpoint', async () => {
  let triggered = false;
  server.use(http.post('/api/v1/cronjobs/j1/trigger', () => { triggered = true; return new HttpResponse(null, { status: 202 }); }));
  render(<CronJobsPage />);
  await userEvent.click(await screen.findByRole('button', { name: /trigger/i }));
  expect(triggered).toBe(true);
});
```

---

## Acceptance Criteria

- [ ] `POST /api/v1/cronjobs` creates a job and registers it with the scheduler
- [ ] `POST /api/v1/cronjobs/:id/trigger` runs the job immediately (async, returns 202)
- [ ] `POST /api/v1/cronjobs/:id/disable` stops the scheduler from firing the job
- [ ] `GET /api/v1/cronjobs/:id/history` returns paginated execution history
- [ ] Each execution writes a `JobExecution` row with status COMPLETED or FAILED
- [ ] Parse-schedule endpoint converts natural language to cron expression
- [ ] Visual cron builder renders and populates expression field
- [ ] Natural language parse input calls API and fills cron field
- [ ] Execution detail expands in a drawer to show full response
- [ ] On app restart, all ENABLED jobs are re-registered from DB
- [ ] `task test` fully green

---

## Handover Notes

- `CronSequenceGenerator` is deprecated in newer Spring — check if there's a replacement in Spring 6.x.
- The `parseSchedule` LLM call should have a timeout (5s) — don't let slow LLM block form submission.
- The question context flow for cron jobs (pending question notification) is deferred — implement the basic flag and persist it, but the notification UI can come in Sprint 6.
- Test the scheduler restart behaviour manually: create a job, restart the app, verify it fires.
