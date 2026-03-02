# Sprint 7 — Team Mode

> **Epic:** Epic 8 — Spring Security, login page, user management, PostgreSQL  
> **Goal:** The application can run in team mode: multiple users log in with form-based authentication, each has isolated sessions and cron jobs, and an admin can manage users.  
> **Prerequisites:** Sprint 6 complete (full solo mode working end-to-end)  
> **Test Gate:** Login/logout flow tested · Role-based access enforced · User management CRUD tested · Postgres profile boots cleanly · All tests green

---

## Context

Team mode is an additive layer on top of solo mode. The same Spring Boot binary runs both via `SPRING_PROFILES_ACTIVE`:
- `solo` (default): no auth, `127.0.0.1`, H2, implicit user
- `team`: form login, `0.0.0.0`, PostgreSQL, role-based access

The `userId` field already exists on all entities from Sprint 1 — team mode simply populates it from the authenticated principal instead of hardcoding `"solo"`.

---

## Backend Deliverables

### 1. AppUser entity + repository

```java
@Entity
@Table(name = "app_users")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AppUser {

    @Id private String id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String displayName;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;           // USER | ADMIN

    private boolean active;

    private Instant lastLoginAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}

public interface AppUserRepository extends JpaRepository<AppUser, String> {
    Optional<AppUser> findByEmail(String email);
    List<AppUser> findAllByOrderByCreatedAtDesc();
}
```

Add Flyway migration `V7__create_app_users.sql`.

### 2. Spring Security configuration (team profile only)

```java
// com/enterpriseclaw/security/SecurityConfig.java
@Configuration
@Profile("team")
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final AppUserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/actuator/health").permitAll()
                .requestMatchers("/api/v1/settings/users/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/**").authenticated()
                .anyRequest().permitAll()          // React SPA routes
            )
            .formLogin(form -> form
                .loginProcessingUrl("/api/v1/auth/login")
                .successHandler(jwtSuccessHandler())
                .failureHandler(jwtFailureHandler())
            )
            .logout(logout -> logout
                .logoutUrl("/api/v1/auth/logout")
                .logoutSuccessHandler((req, resp, auth) -> resp.setStatus(200))
            )
            .csrf(csrf -> csrf.disable())          // SPA — no form CSRF needed; use Bearer token
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### 3. JWT token flow

```java
// com/enterpriseclaw/security/JwtService.java
@Service
public class JwtService {

    @Value("${enterpriseclaw.jwt.secret}")
    private String secret;

    private static final long EXPIRY_MS = 8 * 60 * 60 * 1000L; // 8 hours

    public String generateToken(AppUser user) {
        return Jwts.builder()
            .subject(user.getId())
            .claim("email", user.getEmail())
            .claim("role", user.getRole().name())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + EXPIRY_MS))
            .signWith(secretKey())
            .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser().verifyWith(secretKey()).build().parseSignedClaims(token).getPayload();
    }

    private SecretKey secretKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
```

### 4. Auth endpoints

```java
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestHeader("Authorization") String bearerToken) {
        return ResponseEntity.ok(authService.refresh(bearerToken.replace("Bearer ", "")));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfile> me(Authentication auth) {
        return ResponseEntity.ok(authService.getCurrentUser(auth.getName()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.ok().build();  // JWT is stateless; client drops the token
    }
}
```

### 5. First-run setup endpoint (team mode)

```java
@PostMapping("/api/v1/setup")
@ConditionalOnExpression("'${spring.profiles.active}'.contains('team')")
public ResponseEntity<AuthResponse> setup(@Valid @RequestBody SetupRequest request) {
    if (userRepository.count() > 0) {
        return ResponseEntity.status(HttpStatus.CONFLICT).build();
    }
    return ResponseEntity.ok(authService.createAdmin(request));
}
```

### 6. User management endpoints (admin only)

```java
@RestController
@RequestMapping("/api/v1/settings/users")
@RequiredArgsConstructor
public class UserManagementController {

    private final UserManagementService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserSummary>> list() {
        return ResponseEntity.ok(userService.listUsers());
    }

    @PostMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> changeRole(@PathVariable String id,
                                            @RequestBody Map<String, String> body) {
        userService.changeRole(id, UserRole.valueOf(body.get("role")));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable String id) {
        userService.deactivate(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
```

### 7. Replace hardcoded "solo" userId everywhere

Every service that currently passes `"solo"` as `userId` must now read from the authenticated principal:

```java
// Utility method in a shared SecurityUtils class
public static String currentUserId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
        return "solo";  // solo mode fallback
    }
    return auth.getName(); // returns userId from JWT subject
}
```

### 8. application-team.yml

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect

server:
  address: 0.0.0.0

enterpriseclaw:
  jwt:
    secret: ${JWT_SECRET}
```

---

## Frontend Deliverables

### 1. Login page (`/login` — team mode only)

```tsx
export function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const { login } = useAuthSession();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/chat');
    } catch {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Sign in to EnterpriseClaw</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                   placeholder="Email" className="w-full border rounded px-3 py-2" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                   placeholder="Password" className="w-full border rounded px-3 py-2" required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. `useAuthSession` hook

```ts
// hooks/useAuthSession.ts
export function useAuthSession() {
  const [token, setToken] = useSessionStorage<string | null>(config.session.tokenKey, null);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<AuthResponse>(config.api.endpoints.authLogin, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(response.token);
  }, [setToken]);

  const logout = useCallback(async () => {
    await apiRequest(config.api.endpoints.authLogout, { method: 'POST' });
    setToken(null);
  }, [setToken]);

  const isAuthenticated = token !== null;

  return { token, isAuthenticated, login, logout };
}
```

### 3. `RequireAuth` guard (team mode)

```tsx
// app/routing/RequireAuth.tsx
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthSession();
  const appMode = config.app.mode; // 'solo' | 'team' from env

  if (appMode === 'team' && !isAuthenticated) {
    return <Navigate to={config.routes.login} replace />;
  }
  return <>{children}</>;
}
```

### 4. First-run Setup Wizard (`/setup`)

Three-step wizard (renders only in team mode when no users exist):
1. Create admin user (name, email, password)
2. Select LLM provider and enter API key
3. Review → Launch

### 5. User Management page (`/settings/users` — admin only)

```tsx
export function UserManagementPage() {
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => getUserService().list() });

  return (
    <div className="space-y-4">
      <Table>
        {/* Name | Email | Role | Last Login | Actions */}
        {users?.map(user => (
          <TableRow key={user.id}>
            <TableCell>{user.displayName}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Select value={user.role} onValueChange={role => changeRole(user.id, role)}>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </Select>
            </TableCell>
            <TableCell>{formatRelative(user.lastLoginAt)}</TableCell>
            <TableCell>
              <Button variant="ghost" onClick={() => deactivate(user.id)}>Deactivate</Button>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
```

### 6. Mode badge in Sidebar

```tsx
// app/shell/Sidebar.tsx — footer area
<div className="text-xs text-muted-foreground px-3 py-2">
  <Badge variant="outline">{config.app.mode}</Badge>
</div>
```

Add `VITE_APP_MODE=solo` (or `team`) to `.env` and reference via `config.app.mode`.

---

## Tests

### Backend — Security tests with `@SpringBootTest`

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@ActiveProfiles("team")
class SecurityIntegrationTest {

    @Autowired TestRestTemplate rest;
    @Autowired AppUserRepository userRepo;
    @Autowired PasswordEncoder encoder;

    @BeforeEach
    void createUser() {
        userRepo.save(AppUser.builder()
            .id(UUID.randomUUID().toString())
            .email("test@example.com")
            .passwordHash(encoder.encode("password123"))
            .displayName("Test User")
            .role(UserRole.USER)
            .active(true)
            .createdAt(Instant.now())
            .build());
    }

    @Test
    void unauthenticated_request_returns401() {
        ResponseEntity<String> resp = rest.getForEntity("/api/v1/sessions", String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_returnsJwtToken() {
        ResponseEntity<AuthResponse> resp = rest.postForEntity(
            "/api/v1/auth/login",
            new LoginRequest("test@example.com", "password123"),
            AuthResponse.class
        );
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody().token()).isNotBlank();
    }

    @Test
    void authenticated_request_succeeds() {
        // login, extract token, call /api/v1/sessions with Bearer token
        String token = login("test@example.com", "password123");
        ResponseEntity<String> resp = rest.exchange(
            RequestEntity.get("/api/v1/sessions")
                .header("Authorization", "Bearer " + token).build(),
            String.class
        );
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void nonAdmin_cannot_access_user_management() {
        String token = login("test@example.com", "password123");
        ResponseEntity<String> resp = rest.exchange(
            RequestEntity.get("/api/v1/settings/users")
                .header("Authorization", "Bearer " + token).build(),
            String.class
        );
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
```

### Backend — `JwtService` unit test

```java
class JwtServiceTest {

    JwtService jwtService = new JwtService();

    @BeforeEach
    void setUp() { ReflectionTestUtils.setField(jwtService, "secret", "test-secret-32-characters-long!!"); }

    @Test
    void generateToken_andParseToken_roundTrip() {
        AppUser user = AppUser.builder().id("u1").email("a@b.com").role(UserRole.USER).build();
        String token = jwtService.generateToken(user);
        Claims claims = jwtService.parseToken(token);
        assertThat(claims.getSubject()).isEqualTo("u1");
        assertThat(claims.get("email")).isEqualTo("a@b.com");
    }
}
```

### Frontend — Login page test

```tsx
test('submits credentials and redirects to /chat on success', async () => {
  server.use(http.post('/api/v1/auth/login', () =>
    HttpResponse.json({ token: 'fake-jwt-token' })
  ));

  render(<LoginPage />, { wrapper: MemoryRouterWrapper });
  await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.com');
  await userEvent.type(screen.getByPlaceholderText('Password'), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => expect(sessionStorage.getItem('ec_auth_token')).toBe('fake-jwt-token'));
});

test('shows error on invalid credentials', async () => {
  server.use(http.post('/api/v1/auth/login', () => new HttpResponse(null, { status: 401 })));

  render(<LoginPage />, { wrapper: MemoryRouterWrapper });
  await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.com');
  await userEvent.type(screen.getByPlaceholderText('Password'), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await screen.findByText('Invalid email or password');
});
```

---

## Acceptance Criteria

- [ ] `SPRING_PROFILES_ACTIVE=team` starts app with form login, Postgres, `0.0.0.0`
- [ ] `POST /api/v1/auth/login` returns JWT; subsequent requests use it as Bearer
- [ ] Unauthenticated requests to `/api/v1/**` return 401
- [ ] Non-admin requests to `/api/v1/settings/users` return 403
- [ ] First-run setup wizard creates admin user if no users exist
- [ ] Each user's sessions and cron jobs are isolated
- [ ] Admin can change role, deactivate, and delete users
- [ ] Mode badge shows "solo" or "team" in sidebar footer
- [ ] All existing solo mode tests still pass
- [ ] `task test` fully green

---

## Handover Notes

- `JWT_SECRET` must be at least 32 characters — document in `.env.example`.
- Do NOT store JWT in `localStorage` — `sessionStorage` only (per Muthu's CODING_STYLE).
- Token auto-refresh: implement before expiry using `useEffect` + `setTimeout` in `useAuthSession`.
- PostgreSQL Docker Compose: `docker-compose.yml` should define a `db` service with `pgvector` image so team mode works locally with `docker compose up`.
- The solo mode `@SpringBootTest` tests should use `@ActiveProfiles("solo")` to avoid loading security config.
