# Sprint 4 — Skills Management

> **Epic:** Epic 4 — Skills CRUD, SKILL.md editor, built-in skills  
> **Goal:** Users can view, create, edit, and delete skills from the browser. Built-in skills ship in the classpath JAR. The skill registry rescans without a restart.  
> **Prerequisites:** Sprint 3 complete (real AI core working)  
> **Test Gate:** All CRUD endpoints tested · Editor saves valid SKILL.md · Built-in skills listed as read-only · Rescan works · All tests green

---

## Context

Skills are the heart of EnterpriseClaw's agent capabilities. This sprint makes them visible and manageable from the browser — no terminal access needed to add, modify, or test a skill.

Three skill sources:
1. **Built-in** — packaged in the classpath JAR, read-only
2. **Filesystem** — `.claude/skills/` in the project root, editable
3. **User-created** — created through the browser UI, saved to `.claude/skills/`

---

## Backend Deliverables

### 1. SkillMetadata record

```java
// com/enterpriseclaw/skills/dto/SkillMetadata.java
public record SkillMetadata(
    String name,
    String description,
    String allowedTools,
    String model,
    String source,          // "built-in" | "filesystem" | "user"
    Instant lastInvokedAt,
    long invocationCount,
    String content          // full SKILL.md content (null in list response, populated in get-by-name)
) {}
```

### 2. SkillsService interface

```java
public interface SkillsService {
    List<SkillMetadata> listSkills();
    SkillMetadata getSkill(String name);
    SkillMetadata createSkill(String name, String content);
    SkillMetadata updateSkill(String name, String content);
    void deleteSkill(String name);
    int rescan();                           // returns count of registered skills
    List<String> listSkillFiles(String name);
    void uploadSkillFile(String name, String filename, byte[] content);
    void deleteSkillFile(String name, String filename);
}
```

### 3. SkillsController

```java
@RestController
@RequestMapping("/api/v1/skills")
@RequiredArgsConstructor
public class SkillsController {

    private final SkillsService skillsService;

    @GetMapping
    public ResponseEntity<List<SkillMetadata>> list() {
        return ResponseEntity.ok(skillsService.listSkills());
    }

    @GetMapping("/{name}")
    public ResponseEntity<SkillMetadata> get(@PathVariable String name) {
        return ResponseEntity.ok(skillsService.getSkill(name));
    }

    @PostMapping
    public ResponseEntity<SkillMetadata> create(@RequestBody Map<String, String> body) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(skillsService.createSkill(body.get("name"), body.get("content")));
    }

    @PutMapping("/{name}")
    public ResponseEntity<SkillMetadata> update(@PathVariable String name,
                                                  @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(skillsService.updateSkill(name, body.get("content")));
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(@PathVariable String name) {
        skillsService.deleteSkill(name);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/rescan")
    public ResponseEntity<Map<String, Integer>> rescan() {
        int count = skillsService.rescan();
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/{name}/files")
    public ResponseEntity<List<String>> listFiles(@PathVariable String name) {
        return ResponseEntity.ok(skillsService.listSkillFiles(name));
    }

    @PostMapping("/{name}/files")
    public ResponseEntity<Void> uploadFile(@PathVariable String name,
                                            @RequestParam String filename,
                                            @RequestBody byte[] content) {
        skillsService.uploadSkillFile(name, filename, content);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{name}/files/{filename}")
    public ResponseEntity<Void> deleteFile(@PathVariable String name,
                                            @PathVariable String filename) {
        skillsService.deleteSkillFile(name, filename);
        return ResponseEntity.noContent().build();
    }
}
```

### 4. SkillsServiceImpl

Key implementation notes:
- Use `SkillsTool` (already wired in Sprint 3) as the source of truth for skill registry
- File operations go directly to `.claude/skills/{name}/SKILL.md`
- Built-in skills (classpath) are read-only — throw `UnsupportedOperationException` if user tries to edit/delete
- Use `SnakeYAML` to parse SKILL.md frontmatter for `name`, `description`, `allowedTools`, `model`
- Skill invocation count and last-invoked are read from `agent_run_log` table
- `rescan()` calls `skillsTool.reload()`

### 5. SKILL.md frontmatter validation

Validate on create/update:
- `name` field matches URL slug (lowercase, hyphens only, max 64 chars)
- `description` present and ≤ 1024 chars
- YAML parses without error

Return HTTP 400 with descriptive message on validation failure.

### 6. Built-in skills — classpath JAR structure

```
src/main/resources/.claude/skills/
├── code-reviewer/
│   └── SKILL.md
├── web-search/
│   └── SKILL.md
├── doc-generator/
│   └── SKILL.md
├── data-analyst/
│   └── SKILL.md
├── email-drafter/
│   └── SKILL.md
├── cronjob-builder/
│   └── SKILL.md
├── pdf-processor/
│   └── SKILL.md
└── api-integrator/
    └── SKILL.md
```

These 8 skills are always present, always listed as `"source": "built-in"`, never editable.

---

## Frontend Deliverables

### 1. domain/skills/types.ts

```ts
export interface Skill {
  name:            string;
  description:     string;
  allowedTools:    string | null;
  model:           string | null;
  source:          'built-in' | 'filesystem' | 'user';
  lastInvokedAt:   string | null;
  invocationCount: number;
  content?:        string;
}

export interface SkillFrontmatter {
  name:        string;
  description: string;
  allowedTools:string;
  model:       string;
}
```

### 2. SkillsPage (`/skills`)

Card grid layout:
- `GET /api/v1/skills` on mount → render card per skill
- Each card: skill name, description excerpt, source badge (built-in / filesystem / user), invocation count, last used
- Actions per card: **Edit** (→ `/skills/:name`), **Duplicate**, **Delete** (filesystem/user only)
- **+ New Skill** button → `/skills/new`
- Client-side search bar filtering cards by name or description

```tsx
export function SkillsPage() {
  const { data: skills, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => getSkillsService().list(),
  });
  const [search, setSearch] = useState('');
  const filtered = skills?.filter(s =>
    s.name.includes(search) || s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <input placeholder="Search skills..." value={search} onChange={e => setSearch(e.target.value)}
               className="border rounded px-3 py-1.5 w-64" />
        <Button onClick={() => navigate('/skills/new')}>+ New Skill</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered?.map(skill => <SkillCard key={skill.name} skill={skill} />)}
      </div>
    </div>
  );
}
```

### 3. SkillEditorPage (`/skills/:name` and `/skills/new`)

Split panel layout:

```
┌──────────────────┬──────────────────────────────────────┐
│  Frontmatter     │  SKILL.md Instructions               │
│  ─────────────── │  (CodeMirror Markdown editor)        │
│  name:           │                                      │
│  description:    │  # Skill Name                        │
│  allowed-tools:  │                                      │
│  model:          │  ## Instructions                     │
│                  │  ...                                  │
└──────────────────┴──────────────────────────────────────┘
```

- Left panel: form inputs for frontmatter fields
- Right panel: CodeMirror with Markdown syntax highlighting
- **Save** → `PUT /api/v1/skills/:name` or `POST /api/v1/skills`
- **Test** button → opens modal with a chat input; runs a one-shot agent call with this skill active
- **Files** panel below editor: list supporting files, Upload, View (read-only), Delete
- Built-in skills: editor is read-only, Save/Delete buttons hidden

```tsx
// Install: bun add @uiw/react-codemirror @codemirror/lang-markdown
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

export function SkillEditorPage() {
  const { name } = useParams();
  const isNew = name === undefined;

  const { data: skill } = useQuery({
    queryKey: ['skill', name],
    queryFn:  () => name ? getSkillsService().get(name) : Promise.resolve(null),
    enabled:  !isNew,
  });

  const [frontmatter, setFrontmatter] = useState<SkillFrontmatter>({ name: '', description: '', allowedTools: '', model: '' });
  const [content, setContent] = useState('');

  // Build full SKILL.md from frontmatter + content
  const fullContent = buildSkillMd(frontmatter, content);

  const saveMutation = useMutation({
    mutationFn: () => isNew
      ? getSkillsService().create(frontmatter.name, fullContent)
      : getSkillsService().update(name!, fullContent),
    onSuccess: () => showSuccess('Skill saved'),
  });

  return ( /* split panel layout */ );
}
```

### 4. Skill Test Modal

```tsx
export function SkillTestModal({ skillName, onClose }: { skillName: string; onClose: () => void }) {
  const [prompt, setPrompt] = useState(`Test the ${skillName} skill`);
  const [result, setResult] = useState('');
  const [running, setRunning] = useState(false);

  const runTest = async () => {
    setRunning(true);
    setResult('');
    const session = await getChatService().createSession();
    for await (const event of apiLongRequest<ChatEvent>(
      config.api.endpoints.chat,
      { sessionId: session.sessionId, message: prompt, model: 'gpt-4o' }
    )) {
      if (event.type === 'token') setResult(r => r + event.text);
      if (event.type === 'done' || event.type === 'error') setRunning(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Test: {skillName}</DialogTitle></DialogHeader>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full border rounded p-2 h-20" />
        <Button onClick={runTest} disabled={running}>{running ? 'Running...' : 'Run Test'}</Button>
        {result && <pre className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">{result}</pre>}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Tests

### Backend — `@WebMvcTest SkillsController`

```java
@WebMvcTest(SkillsController.class)
class SkillsControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean  SkillsService skillsService;

    @Test
    void get_skills_returnsSkillList() throws Exception {
        given(skillsService.listSkills()).willReturn(List.of(
            new SkillMetadata("code-reviewer", "Reviews code", "Read,Grep", "gpt-4o", "built-in", null, 5L, null)
        ));

        mockMvc.perform(get("/api/v1/skills"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("code-reviewer"))
            .andExpect(jsonPath("$[0].source").value("built-in"));
    }

    @Test
    void delete_builtIn_returns403() throws Exception {
        doThrow(new UnsupportedOperationException("Cannot delete built-in skill"))
            .when(skillsService).deleteSkill("code-reviewer");

        mockMvc.perform(delete("/api/v1/skills/code-reviewer"))
            .andExpect(status().isForbidden());
    }

    @Test
    void put_skill_withInvalidFrontmatter_returns400() throws Exception {
        doThrow(new IllegalArgumentException("Invalid SKILL.md frontmatter"))
            .when(skillsService).updateSkill(eq("my-skill"), any());

        mockMvc.perform(put("/api/v1/skills/my-skill")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"content":"invalid yaml..."}"""))
            .andExpect(status().isBadRequest());
    }
}
```

### Frontend — `SkillsPage` test

```tsx
test('renders skill cards from API', async () => {
  server.use(http.get('/api/v1/skills', () =>
    HttpResponse.json([
      { name: 'code-reviewer', description: 'Reviews code', source: 'built-in', invocationCount: 5 }
    ])
  ));
  render(<SkillsPage />);
  await screen.findByText('code-reviewer');
  expect(screen.getByText('built-in')).toBeInTheDocument();
});

test('filters cards by search term', async () => {
  // render with 2 skills, type in search, assert only matching card shown
});
```

### Frontend — `SkillEditorPage` save test

```tsx
test('save button calls PUT with full SKILL.md content', async () => {
  let savedContent = '';
  server.use(http.put('/api/v1/skills/code-reviewer', async ({ request }) => {
    const body = await request.json() as any;
    savedContent = body.content;
    return HttpResponse.json({ name: 'code-reviewer' });
  }));

  render(<SkillEditorPage />, { wrapper: routerWrapper('/skills/code-reviewer') });
  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(savedContent).toContain('name: code-reviewer');
});
```

---

## Acceptance Criteria

- [ ] `GET /api/v1/skills` returns all 8 built-in skills + filesystem skills
- [ ] Built-in skills display as read-only in the editor (Save/Delete hidden)
- [ ] Creating a new skill writes `SKILL.md` to `.claude/skills/{name}/`
- [ ] `POST /api/v1/skills/rescan` reloads the registry without restart
- [ ] Skill Test modal runs a real agent call and streams the result
- [ ] Invalid SKILL.md frontmatter returns HTTP 400 with a descriptive message
- [ ] Invocation count and last-invoked populated from `agent_run_log`
- [ ] Supporting file upload/view/delete works
- [ ] `task test` fully green

---

## Handover Notes

- `SkillsTool.reload()` method — check `spring-ai-agent-utils` 0.4.2 docs for the exact API.
- The CodeMirror editor is the only external UI library not in the base setup — add `@uiw/react-codemirror`.
- Do NOT implement the ClawHub skills marketplace — that is explicitly a future feature.
- The **Duplicate** skill action: copy the SKILL.md content, append `-copy` to the name, and open the editor with pre-filled content.
