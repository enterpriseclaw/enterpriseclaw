# Sprint 6 — Observability & Settings

> **Epic:** Epics 6 & 7 — Dashboard pages, audit log, settings profile + model keys  
> **Goal:** Users can see what the agent has been doing (token usage, skill invocations, cron health), search the audit log, and configure their profile and LLM model keys from the browser.  
> **Prerequisites:** Sprint 3+ complete (audit data being written)  
> **Test Gate:** Dashboard queries correct · Audit log searchable + exportable · Settings save/load · All tests green

---

## Context

This sprint surfaces the data that the `EnterpriseAuditAdvisor` has been writing since Sprint 3. All observability is in-app — no Grafana, Prometheus, or external tools. The Settings page also comes online for profile configuration and model key management (solo mode: read-only keys from `.env`).

---

## Backend Deliverables

### 1. Dashboard aggregation queries

Add custom queries to repositories and a new `DashboardService`:

```java
// com/enterpriseclaw/dashboard/DashboardService.java
public interface DashboardService {
    DashboardSummary getSummary();                           // cards + sparklines
    Page<AgentRunSummary> getAgentRuns(AgentRunFilter filter, Pageable pageable);
    List<SkillUsageStat> getSkillUsage();
    List<DailyTokenStat> getLlmUsage(LocalDate from, LocalDate to);
    List<CronJobHealthStat> getCronJobHealth();
    Page<AuditEventRow> getAuditLog(AuditLogFilter filter, Pageable pageable);
    Resource exportAuditLog(AuditLogFilter filter);         // CSV download
}
```

Key queries to add to `AgentRunLogRepository`:

```java
public interface AgentRunLogRepository extends JpaRepository<AgentRunLog, String> {

    @Query("""
        SELECT COUNT(a) FROM AgentRunLog a
        WHERE a.createdAt >= :since
        """)
    long countSince(@Param("since") Instant since);

    @Query("""
        SELECT SUM(a.promptTokens + a.completionTokens) FROM AgentRunLog a
        WHERE a.createdAt >= :since
        """)
    Long sumTokensSince(@Param("since") Instant since);

    @Query("""
        SELECT a.skillActivated, COUNT(a), AVG(a.durationMs), MIN(a.createdAt), MAX(a.createdAt)
        FROM AgentRunLog a
        WHERE a.skillActivated IS NOT NULL
        GROUP BY a.skillActivated
        ORDER BY COUNT(a) DESC
        """)
    List<Object[]> skillUsageStats();

    @Query("""
        SELECT DATE(a.createdAt), a.skillActivated,
               SUM(a.promptTokens), SUM(a.completionTokens), SUM(a.durationMs)
        FROM AgentRunLog a
        WHERE a.createdAt BETWEEN :from AND :to
        GROUP BY DATE(a.createdAt)
        ORDER BY DATE(a.createdAt)
        """)
    List<Object[]> dailyUsage(@Param("from") Instant from, @Param("to") Instant to);
}
```

### 2. DashboardController

```java
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<DashboardSummary> summary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }

    @GetMapping("/agent-runs")
    public ResponseEntity<Page<AgentRunSummary>> agentRuns(
            @ModelAttribute AgentRunFilter filter, Pageable pageable) {
        return ResponseEntity.ok(dashboardService.getAgentRuns(filter, pageable));
    }

    @GetMapping("/skill-usage")
    public ResponseEntity<List<SkillUsageStat>> skillUsage() {
        return ResponseEntity.ok(dashboardService.getSkillUsage());
    }

    @GetMapping("/llm-usage")
    public ResponseEntity<List<DailyTokenStat>> llmUsage(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(dashboardService.getLlmUsage(from, to));
    }

    @GetMapping("/cronjob-health")
    public ResponseEntity<List<CronJobHealthStat>> cronHealth() {
        return ResponseEntity.ok(dashboardService.getCronJobHealth());
    }
}
```

### 3. AuditLogController

```java
@RestController
@RequestMapping("/api/v1/audit-log")
@RequiredArgsConstructor
public class AuditLogController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<Page<AuditEventRow>> list(
            @ModelAttribute AuditLogFilter filter, Pageable pageable) {
        return ResponseEntity.ok(dashboardService.getAuditLog(filter, pageable));
    }

    @GetMapping("/export")
    public ResponseEntity<Resource> export(@ModelAttribute AuditLogFilter filter) {
        Resource csv = dashboardService.exportAuditLog(filter);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=audit-log.csv")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(csv);
    }
}
```

### 4. SettingsController

```java
@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping
    public ResponseEntity<UserProfile> getProfile() {
        return ResponseEntity.ok(settingsService.getProfile("solo"));
    }

    @PutMapping
    public ResponseEntity<UserProfile> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(settingsService.updateProfile("solo", request));
    }

    @GetMapping("/model-keys")
    public ResponseEntity<List<ModelKeyStatus>> getModelKeys() {
        return ResponseEntity.ok(settingsService.getModelKeyStatuses());
    }

    @GetMapping("/skill-dirs")
    public ResponseEntity<List<SkillDirStatus>> getSkillDirs() {
        return ResponseEntity.ok(settingsService.getSkillDirectories());
    }

    @PostMapping("/skill-dirs/rescan")
    public ResponseEntity<Map<String, Integer>> rescanSkills() {
        // delegate to SkillsService
        return ResponseEntity.ok(Map.of("count", settingsService.rescanSkills()));
    }
}
```

### 5. DTO records

```java
public record DashboardSummary(
    long agentRunsToday,
    long agentRunsThisWeek,
    long tokensUsedThisWeek,
    double estimatedCostUsdThisWeek,
    List<SkillUsageStat> topSkills,
    double cronJobSuccessRateThisWeek,
    long pendingQuestions
) {}

public record SkillUsageStat(
    String skillName,
    long invocations,
    Instant lastUsed,
    double avgDurationMs,
    double errorRate
) {}

public record DailyTokenStat(
    LocalDate date,
    long promptTokens,
    long completionTokens,
    double estimatedCostUsd
) {}

public record CronJobHealthStat(
    String jobId,
    String jobName,
    String cronExpression,
    Instant lastRunAt,
    Instant nextRunAt,
    double successRateLast30,
    int consecutiveFailures,
    int missedRuns
) {}
```

---

## Frontend Deliverables

### 1. Install chart library

```bash
bun add recharts
```

### 2. DashboardPage (`/dashboard`)

Summary cards with sparklines (7-day data):

```tsx
export function DashboardPage() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboardService().getSummary() });

  return (
    <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard title="Agent Runs" value={data?.agentRunsToday} sub="Today"
                  onClick={() => navigate('/dashboard/agent-runs')} />
      <MetricCard title="Tokens Used" value={formatTokens(data?.tokensUsedThisWeek)} sub="This week" />
      <MetricCard title="Est. Cost" value={`$${data?.estimatedCostUsdThisWeek.toFixed(2)}`} sub="This week" />
      <MetricCard title="Top Skills" value={data?.topSkills[0]?.skillName ?? '—'} sub="Most used this week" />
      <MetricCard title="Cron Health" value={`${Math.round((data?.cronJobSuccessRateThisWeek ?? 0) * 100)}%`} sub="Success rate" />
      <MetricCard title="Pending Questions" value={data?.pendingQuestions} sub="Awaiting answer" badge />
    </div>
  );
}
```

### 3. Agent Runs Timeline (`/dashboard/agent-runs`)

```tsx
export function AgentRunsPage() {
  const [filter, setFilter] = useState<AgentRunFilter>({});
  const { data } = useQuery({
    queryKey: ['agent-runs', filter],
    queryFn:  () => getDashboardService().getAgentRuns(filter),
  });

  return (
    <div className="p-6">
      <AgentRunFilters filter={filter} onChange={setFilter} />
      <Table>
        {/* Time | Session | Trigger | Skill | Model | Tokens | Duration | Status */}
        {data?.content.map(run => (
          <TableRow key={run.id} onClick={() => setExpandedRun(run.id)} className="cursor-pointer">
            ...
          </TableRow>
        ))}
      </Table>
      <Pagination page={data?.number} total={data?.totalPages} onChange={setPage} />
    </div>
  );
}
```

### 4. Skill Usage (`/dashboard/skill-usage`)

```tsx
export function SkillUsagePage() {
  const { data } = useQuery({ queryKey: ['skill-usage'], queryFn: () => getDashboardService().getSkillUsage() });

  return (
    <div className="p-6 space-y-6">
      <BarChart width={600} height={300} data={data}>
        <XAxis dataKey="skillName" />
        <YAxis />
        <Bar dataKey="invocations" fill="#6366f1" />
        <Tooltip />
      </BarChart>
      <Table>
        {/* Skill | Invocations | Last Used | Avg Duration | Error Rate | Avg Tokens */}
      </Table>
    </div>
  );
}
```

### 5. LLM Usage (`/dashboard/llm-usage`)

Stacked bar chart (prompt tokens + completion tokens per day) + table with estimated costs.

### 6. CronJob Health (`/dashboard/cronjob-health`)

Table with consecutive failures highlighted red (≥ 3).

### 7. Audit Log Page (`/audit-log`)

```tsx
export function AuditLogPage() {
  const [filter, setFilter] = useState<AuditLogFilter>({});

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <AuditLogFilters filter={filter} onChange={setFilter} />
        <Button variant="outline" onClick={() => downloadCsv(filter)}>Download CSV</Button>
      </div>
      <Table>
        {/* Time | Event Type | Details | Session */}
        {/* Clicking row opens side panel with full JSON payload */}
      </Table>
    </div>
  );
}
```

Event type badges: `chat_message`, `skill_invoked`, `question_asked`, `question_answered`, `cron_triggered`, `skill_created`, `settings_changed`.

### 8. Settings Page (`/settings`)

```tsx
export function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl space-y-8">
      <ProfileSection />
      <ModelKeysSection />
      <SkillDirectoriesSection />
    </div>
  );
}

function ProfileSection() {
  // Display Name, Timezone, Default Model, System Prompt (SOUL.md equivalent)
}

function ModelKeysSection() {
  // List providers: OpenAI, Anthropic, Azure, Google
  // Solo mode: read-only view with "configured via .env" banner
}

function SkillDirectoriesSection() {
  // Read-only list of skill scan paths + Rescan button
}
```

---

## Tests

### Backend — `@DataJpaTest` for dashboard queries

```java
@DataJpaTest
class AgentRunLogRepositoryTest {

    @Autowired AgentRunLogRepository repo;

    @Test
    void countSince_countsOnlyRecordsAfterThreshold() {
        Instant yesterday = Instant.now().minus(1, ChronoUnit.DAYS);
        repo.save(runLog(Instant.now()));          // today
        repo.save(runLog(Instant.now().minus(2, ChronoUnit.DAYS)));  // 2 days ago

        long count = repo.countSince(yesterday);
        assertThat(count).isEqualTo(1);
    }

    @Test
    void skillUsageStats_groupsBySkillName() {
        repo.save(runLog("code-reviewer"));
        repo.save(runLog("code-reviewer"));
        repo.save(runLog("web-search"));

        List<Object[]> stats = repo.skillUsageStats();
        assertThat(stats.get(0)[0]).isEqualTo("code-reviewer");
        assertThat(stats.get(0)[1]).isEqualTo(2L);
    }
}
```

### Backend — `@WebMvcTest DashboardController`

```java
@Test
void get_dashboard_returnsSummary() throws Exception {
    given(dashboardService.getSummary()).willReturn(
        new DashboardSummary(5L, 42L, 100_000L, 2.50, List.of(), 0.95, 0L)
    );

    mockMvc.perform(get("/api/v1/dashboard"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.agentRunsToday").value(5))
        .andExpect(jsonPath("$.estimatedCostUsdThisWeek").value(2.50));
}
```

### Frontend — Dashboard summary cards

```tsx
test('renders metric cards with data from API', async () => {
  server.use(http.get('/api/v1/dashboard', () =>
    HttpResponse.json({ agentRunsToday: 5, tokensUsedThisWeek: 50000, estimatedCostUsdThisWeek: 1.25 })
  ));
  render(<DashboardPage />);
  await screen.findByText('5');          // agent runs
  await screen.findByText('$1.25');      // cost
});
```

### Frontend — Audit log filter

```tsx
test('filters audit log by event type', async () => {
  // render with mock data, select "skill_invoked" filter, assert table updates
});
```

---

## Acceptance Criteria

- [ ] `GET /api/v1/dashboard` returns summary with 7-day data
- [ ] Agent runs timeline shows all interactions with filters
- [ ] Skill usage page shows invocation count bar chart + table
- [ ] LLM usage page shows daily stacked bar chart + estimated cost
- [ ] CronJob health highlights jobs with ≥ 3 consecutive failures in red
- [ ] Audit log is searchable by event type, date range, and free text
- [ ] Audit log CSV export downloads correct data
- [ ] Settings profile save/load works
- [ ] Settings model keys show configured providers (read-only in solo mode)
- [ ] Settings skill directories panel shows scan paths + Rescan button
- [ ] `task test` fully green

---

## Handover Notes

- Token cost estimates use hardcoded pricing from settings (configurable per-model in DB). Start with `gpt-4o: $0.005/1K prompt, $0.015/1K completion` as defaults.
- The audit log `details` column is unstructured JSON — store as `TEXT` in DB, render formatted in the side panel.
- `missedRuns` in cron health: define as executions that should have fired (based on cron expression) but have no corresponding `JobExecution` row within ±30s of scheduled time.
- Solo mode Settings: show a banner "Model keys are configured via your `.env` file" — do not allow editing.
