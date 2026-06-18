# Feature Tickets
## TaskForge — Hierarchical Task Management Platform
**Total Tickets:** 70  
**Milestones:** M1–M7  
**Format:** [TF-XXX] Title | Type | Priority | Milestone | Estimate | Dependencies

---

## MILESTONE 1 — Authentication and User Model

---

### TF-001 · Initialize monorepo project structure
**Type:** Setup | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 2h | **Deps:** None

**Description:**  
Create the full project directory structure for both `client/` and `server/` following the architecture document layout. Initialize package.json files, configure ESLint, set up `.gitignore`, create `.env.example` files, and add a root-level `README.md` with setup instructions.

**Acceptance Criteria:**
- `client/` bootstrapped with Vite + React 18, configured with path aliases
- `server/` initialized with Node.js ESM (`"type": "module"`), Express 5 installed
- ESLint + Prettier configured and runnable on both
- `.env.example` covers all required variables from the architecture doc
- `README.md` covers: prerequisites, local setup steps, how to run dev environment

**Notes:**  
Use `pnpm workspaces` for monorepo management. Keep root-level scripts: `dev`, `build`, `lint`, `test`.

---

### TF-002 · Docker Compose local dev environment
**Type:** Infra | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 3h | **Deps:** TF-001

**Description:**  
Set up `docker-compose.yml` for local development with four services: `client`, `server`, `postgres`, `redis`. Services should hot-reload on code change. Postgres should initialize with schema on first run.

**Acceptance Criteria:**
- `docker compose up` brings up all four services
- Server auto-restarts on file change (nodemon or `--watch`)
- Client Vite HMR works from inside the container
- Postgres data persists across restarts via named volume
- Redis available at `redis:6379` from server container
- Health checks defined for postgres and redis

---

### TF-003 · Prisma setup and initial database schema
**Type:** Backend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 3h | **Deps:** TF-002

**Description:**  
Install Prisma, configure `DATABASE_URL`, and write the initial `schema.prisma` covering: `User`, `Session`, `Workspace`, `WorkspaceMember`, `Section`, `Task`, `Attachment`, `TaskLink`, `Notification` models exactly as defined in the architecture document.

**Acceptance Criteria:**
- `npx prisma migrate dev` runs without errors
- `npx prisma studio` opens and shows all tables
- All enums (`Role`, `TaskStatus`, `Priority`, `AttachmentType`, `NotificationType`) present
- Seed script creates one test user and one workspace
- Prisma client exported as a singleton from `config/db.js`

---

### TF-004 · Environment variable validation on server startup
**Type:** Backend | **Priority:** P1 | **Milestone:** M1 | **Estimate:** 1h | **Deps:** TF-001

**Description:**  
Use Zod to validate all required environment variables at server startup. If any required variable is missing, log a clear error message identifying the missing var and exit with code 1.

**Acceptance Criteria:**
- `config/env.js` exports validated env object
- Missing `JWT_SECRET` causes: `[startup] Missing required env: JWT_SECRET — exiting` and process exit
- All downstream code imports from `config/env.js`, never from `process.env` directly
- Test: comment out one env var, confirm startup fails with correct message

---

### TF-005 · User registration endpoint
**Type:** Backend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 3h | **Deps:** TF-003

**Description:**  
Implement `POST /api/v1/auth/register`. Accepts `{ email, password, displayName }`. Validates input, checks for existing email, hashes password, creates User, generates email verification token, enqueues verification email.

**Acceptance Criteria:**
- Zod schema validates: email format, password ≥ 8 chars, displayName 1–100 chars
- Returns `201 { message: "Check your email to verify your account" }` on success
- Returns `409` if email already registered (message does not disclose it is taken — use generic "Registration failed")
- Password hashed with bcrypt at 12 rounds — never stored or returned in plaintext
- Email verification token: `crypto.randomBytes(32).toString('hex')`, stored as SHA-256 hash in DB with 24h expiry
- Email enqueued to BullMQ `emailQueue`, not sent synchronously (registration should not wait on email)

---

### TF-006 · BullMQ email queue and Nodemailer/Resend integration
**Type:** Backend | **Priority:** P1 | **Milestone:** M1 | **Estimate:** 3h | **Deps:** TF-002, TF-005

**Description:**  
Set up BullMQ `emailQueue` backed by Redis. Create a worker that processes email jobs by sending via Resend API (or Nodemailer in dev). Implement job types: `verify-email`, `reset-password`.

**Acceptance Criteria:**
- Worker runs as part of server process, processes jobs with retry (max 3 attempts, exponential backoff)
- `verify-email` job sends HTML email with verification link
- Failed jobs move to dead-letter after 3 failures, logged with Winston
- In development (`NODE_ENV=development`), emails logged to console instead of sent
- BullMQ dashboard (`bull-board`) mounted at `/admin/queues` (auth-protected by basic auth env var)

---

### TF-007 · Email verification endpoint
**Type:** Backend | **Priority:** P1 | **Milestone:** M1 | **Estimate:** 2h | **Deps:** TF-005, TF-006

**Description:**  
Implement `POST /api/v1/auth/verify-email/:token`. Validates the raw token against the stored hash, checks expiry, marks user `emailVerified: true`, deletes the token record.

**Acceptance Criteria:**
- Invalid or expired token → `400 { error: "Invalid or expired verification link" }`
- Valid token → `200 { message: "Email verified" }`, user `emailVerified` set to true
- Token deleted from DB on successful use (single-use)
- Client redirects to login page after successful verification with a success toast

---

### TF-008 · Login endpoint with JWT issuance
**Type:** Backend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 4h | **Deps:** TF-005

**Description:**  
Implement `POST /api/v1/auth/login`. Validates credentials, handles TOTP if enabled, issues access token (JWT, 15m) and refresh token (opaque, 7d). Refresh token stored as bcrypt hash in Session table, set in httpOnly cookie.

**Acceptance Criteria:**
- Wrong email or password → `401 { error: "Invalid credentials" }` (same message for both — no enumeration)
- If `totpEnabled` and no `totpCode` in body → `200 { requiresTOTP: true }` (no tokens yet)
- If `totpEnabled` and wrong code → `401 { error: "Invalid 2FA code" }`
- Access token: HS256 JWT, payload `{ sub, email, iat, exp }`, signed with `JWT_SECRET`
- Refresh token: 32 random bytes, hex-encoded, stored as bcrypt hash in Session with userAgent + IP
- Refresh token set as cookie: `httpOnly: true, secure: true, sameSite: 'strict', path: '/api/v1/auth'`
- Response body: `{ accessToken, user: { id, email, displayName, avatarUrl, totpEnabled } }`

---

### TF-009 · Auth middleware — JWT verification
**Type:** Backend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 2h | **Deps:** TF-008

**Description:**  
Create `middleware/auth.js` with `requireAuth` — extracts and verifies the JWT from `Authorization: Bearer <token>`. Attaches decoded payload to `req.user`. Used on all protected routes.

**Acceptance Criteria:**
- Missing header → `401 { error: "Authentication required" }`
- Malformed or expired token → `401 { error: "Invalid or expired token" }`
- Valid token → `req.user = { id, email }`, next() called
- Does not query DB on every request (JWT is self-contained)

---

### TF-010 · Refresh token rotation endpoint
**Type:** Backend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 3h | **Deps:** TF-008

**Description:**  
Implement `POST /api/v1/auth/refresh-token`. Reads refresh token from cookie, validates against Session table, rotates (delete old, create new), issues new access token and refresh token.

**Acceptance Criteria:**
- Missing cookie → `401`
- Token not found in DB → `401` + immediately invalidate all sessions for that user (reuse detection)
- Expired session → `401`
- Valid token → delete old Session, create new Session, return new `accessToken` in body + new cookie
- Axios interceptor on client automatically calls this on 401 responses and retries original request

---

### TF-011 · Logout endpoint
**Type:** Backend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 1h | **Deps:** TF-008

**Description:**  
Implement `POST /api/v1/auth/logout`. Reads refresh token from cookie, deletes the Session record, clears the cookie.

**Acceptance Criteria:**
- Session deleted from DB
- Cookie cleared via `res.clearCookie`
- Returns `200 { message: "Logged out" }` regardless of whether session was found (idempotent)

---

### TF-012 · Password reset flow (request + reset)
**Type:** Backend | **Priority:** P1 | **Milestone:** M1 | **Estimate:** 3h | **Deps:** TF-006

**Description:**  
Implement `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password/:token`. Generate a reset token, enqueue email, validate token on reset, update password, invalidate all sessions.

**Acceptance Criteria:**
- `forgot-password`: always returns `200 { message: "If that email exists, you'll receive a reset link" }` (no enumeration)
- Reset token: 32 random bytes, stored as SHA-256 hash, expires in 1 hour
- `reset-password/:token`: validates hash + expiry, updates `passwordHash`, deletes token, invalidates all Sessions for user
- Password must meet same validation as registration (≥ 8 chars)
- After reset, user must log in fresh

---

### TF-013 · Session listing and revocation endpoints
**Type:** Backend | **Priority:** P1 | **Milestone:** M1 | **Estimate:** 2h | **Deps:** TF-009

**Description:**  
Implement `GET /api/v1/auth/sessions` and `DELETE /api/v1/auth/sessions/:sessionId`.

**Acceptance Criteria:**
- GET returns all active sessions for the authenticated user: `[ { id, userAgent, ipAddress, createdAt, expiresAt, isCurrent } ]`
- `isCurrent: true` for the session corresponding to the current refresh token
- DELETE revokes a specific session (user can only revoke their own sessions)
- Revoking the current session is equivalent to logout
- `DELETE /api/v1/auth/sessions` (no ID) → revoke all sessions (logout all devices)

---

### TF-014 · Rate limiting middleware
**Type:** Backend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 2h | **Deps:** TF-002

**Description:**  
Implement rate limiting per the Security document using `express-rate-limit` with Redis store. Apply different limits to auth routes vs general API.

**Acceptance Criteria:**
- `POST /auth/login`: 10 requests per IP per 15 minutes
- `POST /auth/register`: 5 requests per IP per hour
- `POST /auth/forgot-password`: 3 requests per email per hour
- All other API routes: 200 requests per user per minute
- On limit hit: `429` with `Retry-After` header and `{ error: "Too many requests", retryAfter: N }` body
- Rate limit state stored in Redis (survives server restart)

---

### TF-015 · Global error handler and request validation middleware
**Type:** Backend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 2h | **Deps:** TF-001

**Description:**  
Create `utils/apiError.js` (custom error class with statusCode + message), `utils/asyncHandler.js` (wraps async route handlers to catch unhandled rejections), and `middleware/validate.js` (Zod schema validator middleware).

**Acceptance Criteria:**
- Unhandled async errors → caught by asyncHandler → passed to global error handler
- Global error handler returns `{ error: string, details?: array }` JSON
- Zod validation failure → `400 { error: "Validation failed", details: [{ field, message }] }`
- `500` errors log full stack trace via Winston but return only `{ error: "Internal server error" }` to client
- No stack traces exposed in production responses

---

### TF-016 · Register, Login, and Email Verify pages (frontend)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 6h | **Deps:** TF-008, TF-007

**Description:**  
Build the auth pages following the frontend spec (split layout, depth-rail illustration on left, form on right). Implement React Hook Form + Zod validation for register and login forms.

**Acceptance Criteria:**
- Register form: displayName, email, password (with show/hide toggle), zxcvbn strength indicator
- Login form: email, password, "Remember this device" checkbox (extends cookie life client-side)
- Email verify page: reads token from URL, calls API, shows success or error state
- Left panel: animated nested section preview (CSS animation, no library)
- Form errors shown inline below fields, not as alerts
- Loading state: submit button shows spinner, disabled during request
- On successful login, redirect to `/dashboard`
- Responsive: left panel hidden on mobile

---

### TF-017 · Axios client with JWT interceptor (frontend)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 3h | **Deps:** TF-010

**Description:**  
Set up `api/client.js`: Axios instance pointing at `VITE_API_URL`, with request interceptor to attach `Authorization: Bearer <accessToken>`, and response interceptor to handle 401 by calling `/auth/refresh-token` and retrying the original request.

**Acceptance Criteria:**
- Access token read from Zustand `authStore` on every request
- On 401: refresh token called once; if successful, original request retried with new access token
- If refresh fails (401 itself): `clearAuth()` called, user redirected to `/auth/login`
- Concurrent 401 errors during refresh handled: queue requests, resolve/reject all together after one refresh
- No infinite retry loops

---

### TF-018 · Auth store and protected route guard (frontend)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M1 | **Estimate:** 2h | **Deps:** TF-017

**Description:**  
Implement Zustand `authStore` and a `<ProtectedRoute>` component that redirects unauthenticated users to login.

**Acceptance Criteria:**
- `authStore`: `user`, `accessToken`, `isAuthenticated`, `setAuth()`, `clearAuth()`
- On app load: attempt silent refresh (call `/auth/refresh-token`) to restore session; show loading spinner during this
- `<ProtectedRoute>` wraps all non-auth routes; unauthenticated → redirect to `/auth/login?redirect=<current_path>`
- After login, redirect back to the original intended path
- Password reset page: send token as a forgot password page accessible without authentication

---

## MILESTONE 2 — Workspaces, Sections, and Tasks

---

### TF-019 · Workspace CRUD endpoints
**Type:** Backend | **Priority:** P0 | **Milestone:** M2 | **Estimate:** 3h | **Deps:** TF-009

**Description:**  
Implement workspace CRUD: `GET /workspaces`, `POST /workspaces`, `GET /workspaces/:id`, `PUT /workspaces/:id`, `DELETE /workspaces/:id`. On create, automatically add the creator as `OWNER`.

**Acceptance Criteria:**
- `GET /workspaces`: returns only workspaces the authenticated user is a member of
- `POST /workspaces`: `{ name, description?, color? }` → creates workspace + WorkspaceMember(OWNER)
- `GET /workspaces/:id`: returns workspace with member list; 403 if not a member
- `PUT /workspaces/:id`: OWNER or EDITOR can update name/description/color
- `DELETE /workspaces/:id`: OWNER only; deletes workspace + cascades (all sections, tasks, attachments, Cloudinary files)
- Workspace deletion: Cloudinary file cleanup runs as a background job, not synchronously

---

### TF-020 · Workspace membership management endpoints
**Type:** Backend | **Priority:** P1 | **Milestone:** M2 | **Estimate:** 3h | **Deps:** TF-019

**Description:**  
Implement `POST /workspaces/:id/members`, `PUT /workspaces/:id/members/:userId` (change role), `DELETE /workspaces/:id/members/:userId` (remove).

**Acceptance Criteria:**
- Invite: `{ email, role }` → find user by email, create WorkspaceMember; if user not found → 404
- EDITOR can only invite with role `VIEWER`
- OWNER can invite with any role
- Role change: OWNER only; cannot demote yourself below OWNER if you are the last OWNER
- Remove: OWNER can remove anyone; EDITOR can only remove themselves (leave workspace)
- Removed user's real-time socket connection gets a `workspace:kicked` event → client redirects to dashboard

---

### TF-021 · Workspace access middleware
**Type:** Backend | **Priority:** P0 | **Milestone:** M2 | **Estimate:** 2h | **Deps:** TF-009, TF-019

**Description:**  
Create `middleware/workspaceAccess.js`. Given a `workspaceId` (from params, query, or body), verifies the authenticated user is a member and attaches their role to `req.workspace`. Separate role-check middleware: `requireRole('EDITOR')`, `requireRole('OWNER')`.

**Acceptance Criteria:**
- Not a member → `403 { error: "Access denied" }`
- `req.workspace = { workspaceId, role }` on success
- `requireRole('EDITOR')` blocks VIEWERs with `403`
- `requireRole('OWNER')` blocks EDITORs with `403`
- Used on all section, task, attachment routes

---

### TF-022 · Section CRUD endpoints
**Type:** Backend | **Priority:** P0 | **Milestone:** M2 | **Estimate:** 4h | **Deps:** TF-021

**Description:**  
Implement section endpoints: `GET /workspaces/:wId/sections`, `POST /workspaces/:wId/sections`, `PUT /workspaces/:wId/sections/:sId`, `DELETE /workspaces/:wId/sections/:sId`.

**Acceptance Criteria:**
- GET returns flat array of all sections for the workspace, including `parentId`, `order`, `depth`, `collapsed`
- POST: `{ title, parentId?, color? }` → creates section with `order` using fractional indexing (placed at end of siblings)
- Parent must belong to same workspace; max depth 10 enforced server-side
- PUT: update title, color, collapsed state
- DELETE: deletes section + all descendant sections + all their tasks (cascade); broadcasts socket event
- All writes broadcast appropriate Socket.io event to `workspace:{wId}` room

---

### TF-023 · Task CRUD endpoints
**Type:** Backend | **Priority:** P0 | **Milestone:** M2 | **Estimate:** 4h | **Deps:** TF-022

**Description:**  
Implement task endpoints: `GET /sections/:sId/tasks`, `POST /sections/:sId/tasks`, `GET /tasks/:id`, `PUT /tasks/:id`, `DELETE /tasks/:id`.

**Acceptance Criteria:**
- GET /sections/:sId/tasks: returns all non-archived tasks in section, sorted by `order`
- POST: `{ title, priority?, dueDate?, tags?, assigneeId? }` → creates task at end of section
- GET /tasks/:id: returns full task including body JSON, attachments, linked tasks
- PUT /tasks/:id: partial update (PATCH semantics) — only provided fields updated
- DELETE /tasks/:id: soft-delete via `isArchived: true`; hard delete only via explicit `?permanent=true` by OWNER
- Zod validation on all inputs
- Socket.io broadcast on all mutations

---

### TF-024 · Fractional indexing for section and task ordering
**Type:** Backend | **Priority:** P1 | **Milestone:** M2 | **Estimate:** 3h | **Deps:** TF-022, TF-023

**Description:**  
Implement `POST /workspaces/:wId/sections/:sId/reorder` and `POST /tasks/:id/reorder`. Use fractional indexing to set the new `order` value without updating siblings.

**Acceptance Criteria:**
- Reorder request: `{ beforeId?: string, afterId?: string }` — item placed between the two
- If only `beforeId`: placed just after beforeId
- If only `afterId`: placed just before afterId
- If neither: placed at end
- Fractional index collision (precision limit): background job rebalances that sibling group to integer spacing
- Verified: 100 sequential inserts between two items work without collision

---

### TF-025 · Tree building utility (client-side)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M2 | **Estimate:** 2h | **Deps:** None

**Description:**  
Implement `utils/treeUtils.js` on the client. `buildTree(sections)` takes a flat array and returns a nested tree structure. `flattenTree(tree)` goes back to flat. Used to render the section hierarchy.

**Acceptance Criteria:**
- `buildTree` handles any depth correctly
- Handles orphaned sections gracefully (parentId points to deleted section → placed at root)
- `flattenTree` preserves DFS order (correct for rendering)
- `getAncestors(sections, sectionId)` returns the chain of parents (for breadcrumb)
- Unit tests with Jest: covers 0 items, 1 item, 2 levels deep, 5 levels deep, orphan case

---

### TF-026 · Workspace page and section hierarchy renderer (frontend)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M2 | **Estimate:** 8h | **Deps:** TF-019, TF-022, TF-025

**Description:**  
Build the main `Workspace.jsx` page. Render the nested section hierarchy using the depth-rail visual system. Each section is collapsible. Tasks render as rows inside their section.

**Acceptance Criteria:**
- Sections rendered recursively, each level showing the depth rail with correct opacity
- Collapse/expand toggle with 150ms animation
- Collapsed sections remember state via `uiStore.collapsedSections` (persisted to localStorage)
- Task rows show: checkbox, title, tags, due date, priority indicator
- Clicking task opens Task Detail panel
- `[+ Add task]` inline creation row appears at bottom of each section
- `[+ Add sub-section]` in section menu creates a child section
- Workspace accent color applied as CSS custom property on workspace root

---

### TF-027 · Inline task creation (frontend)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M2 | **Estimate:** 3h | **Deps:** TF-026, TF-023

**Description:**  
Implement inline task creation row. Clicking `[+ Add task]` renders an input row at the bottom of the section. Enter saves, Escape cancels, Tab saves and opens task detail.

**Acceptance Criteria:**
- Input autofocuses on appearance
- Optimistic add: task appears in list immediately, confirmed after API response
- On API error: task removed from list, error toast shown
- After saving, a new empty row opens for continuous entry (until Escape)
- Only one creation row open at a time across the workspace

---

### TF-028 · Task Detail panel (frontend)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M2 | **Estimate:** 8h | **Deps:** TF-023, TF-026

**Description:**  
Build the Task Detail panel per the frontend spec. Shows all task metadata and allows editing. Opens as a side panel on desktop, full page on mobile.

**Acceptance Criteria:**
- Panel opens with `translateX` slide animation (200ms ease-out)
- All fields editable inline (click to edit): title, status, priority, due date, assignee, tags
- Status and priority shown as styled dropdowns using Radix UI Select
- Due date: date picker (custom-styled, not browser default)
- Tags: type to add (comma or Enter to confirm), click existing tag to remove
- Section breadcrumb at top: `College › Internship Prep › Tasks` — each part clickable to navigate
- Changes auto-save on field blur (debounced 500ms); explicit save not required
- Dirty state indicator: subtle `●` in panel header if unsaved changes exist

---

### TF-029 · App shell and sidebar (frontend)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M2 | **Estimate:** 5h | **Deps:** TF-018, TF-019

**Description:**  
Build the app shell: TopBar + Sidebar + main content area. Sidebar shows workspaces and smart view links. Responsive per the frontend spec.

**Acceptance Criteria:**
- Sidebar shows all user workspaces with accent color indicator
- Active workspace highlighted with `--bg-selected`
- Workspace unread activity shown as dot indicator
- `[+ New workspace]` opens a modal (name, color picker, optional description)
- Smart views (Today, Upcoming, Inbox) in sidebar below workspaces
- TopBar: TaskForge logo, search trigger, notification bell, user avatar (click → dropdown with Settings, Logout)
- Sidebar collapses to 56px icon rail via toggle button
- Mobile: sidebar as slide-in drawer, hamburger in TopBar

---

### TF-030 · Dashboard page (frontend)
**Type:** Frontend | **Priority:** P1 | **Milestone:** M2 | **Estimate:** 3h | **Deps:** TF-029

**Description:**  
Build `/dashboard` — the landing page after login. Shows all workspaces as cards with recent activity.

**Acceptance Criteria:**
- Workspace cards show: name, accent color, member count, task counts (total, done, overdue)
- Most recently active workspace shown first
- Empty state: `No workspaces yet. Create your first one.` with create button
- Clicking a card navigates to `/w/:workspaceId`
- `[+ New Workspace]` opens creation modal

---

## MILESTONE 3 — Real-time Sync, Drag-and-Drop, Tags, Filters

---

### TF-031 · Socket.io server setup
**Type:** Backend | **Priority:** P0 | **Milestone:** M3 | **Estimate:** 3h | **Deps:** TF-008

**Description:**  
Set up Socket.io server attached to the Express HTTP server. Implement JWT authentication for socket connections. Use Redis adapter for multi-instance pub/sub scalability.

**Acceptance Criteria:**
- Socket.io server initialized with `cors` matching `CLIENT_ORIGIN`
- Auth middleware: client passes `{ auth: { token: accessToken } }` on connect; invalid token disconnects socket
- Redis adapter (`@socket.io/redis-adapter`) configured
- `workspace:join` event: socket joins room `workspace:{workspaceId}` after membership verified
- `workspace:leave` event: socket leaves room
- Disconnect: socket automatically leaves all rooms, presence:leave broadcast

---

### TF-032 · Real-time broadcast on task and section mutations
**Type:** Backend | **Priority:** P0 | **Milestone:** M3 | **Estimate:** 3h | **Deps:** TF-031, TF-022, TF-023

**Description:**  
After every successful task or section mutation (create/update/delete), broadcast the corresponding Socket.io event to the workspace room, excluding the originating socket.

**Acceptance Criteria:**
- `task:created`, `task:updated`, `task:deleted` emitted with correct payloads
- `section:created`, `section:updated`, `section:deleted` emitted
- Originating client excluded from broadcast (uses socket.to(room) not io.to(room))
- Events tested manually: two browser tabs open same workspace, mutation in tab 1 reflected in tab 2 within 1s

---

### TF-033 · Real-time socket client integration (frontend)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M3 | **Estimate:** 4h | **Deps:** TF-031

**Description:**  
Build `useSocket.js` hook and `socketStore`. Connect to Socket.io server with access token on app mount. Handle workspace room join/leave. Update TanStack Query cache on incoming events.

**Acceptance Criteria:**
- Socket connects on app load (after auth), disconnects on logout
- `workspace:join` sent on workspace page mount, `workspace:leave` on unmount
- `task:created` → `queryClient.setQueryData(['tasks', sectionId], ...)` — task added to correct list
- `task:updated` → merge update into cached task
- `task:deleted` → remove from cached list
- Section events handled similarly
- Offline: socket shows reconnect spinner, queues no mutations (page reload on reconnect for consistency)
- Connection status shown: thin border color on TopBar (green = connected, red = disconnected)

---

### TF-034 · Presence indicator system
**Type:** Backend + Frontend | **Priority:** P2 | **Milestone:** M3 | **Estimate:** 4h | **Deps:** TF-031, TF-033

**Description:**  
Show which users are currently viewing the same workspace. Broadcast `presence:join` and `presence:leave` on room join/leave. Display avatars in TopBar.

**Acceptance Criteria:**
- `presence:join` payload: `{ userId, displayName, avatarUrl }`
- `presence:leave` payload: `{ userId }`
- TopBar shows stacked avatars of active users (max 3 shown, `+N` for overflow)
- Tooltip on avatar shows displayName + "viewing now"
- Presence state stored in `socketStore.activeUsers`
- Self is never shown in presence list

---

### TF-035 · Drag-and-drop for tasks within and across sections
**Type:** Frontend | **Priority:** P1 | **Milestone:** M3 | **Estimate:** 6h | **Deps:** TF-024, TF-026

**Description:**  
Implement drag-and-drop task reordering using `@dnd-kit`. Tasks can be dragged within a section (reorder) or across sections (move + reorder). On drop, call the reorder API and broadcast via socket.

**Acceptance Criteria:**
- Dragging a task shows a semi-transparent drag overlay of the task card
- Drop target shows an insertion indicator (blue line) between tasks
- Cross-section drag: task moves to new section and is placed at drop position
- Optimistic reorder: task moves immediately in UI; API call in background
- On API error: task snaps back to original position, error toast shown
- Touch devices: long press (500ms) initiates drag

---

### TF-036 · Drag-and-drop for sections
**Type:** Frontend | **Priority:** P2 | **Milestone:** M3 | **Estimate:** 4h | **Deps:** TF-035

**Description:**  
Allow sections to be dragged to reorder within their parent (siblings only — re-parenting via drag is not supported; use "Move to" menu instead).

**Acceptance Criteria:**
- Section header has a drag handle (6-dot grip icon) that appears on hover
- Dragging a section reorders it among its siblings
- Collapsed sections can be dragged (drag the header)
- Children move with the parent — entire section block moves
- Reorder API called on drop; socket event broadcast

---

### TF-037 · Tags system — backend and frontend
**Type:** Backend + Frontend | **Priority:** P1 | **Milestone:** M3 | **Estimate:** 4h | **Deps:** TF-023, TF-028

**Description:**  
Tags are stored as `String[]` on tasks (PostgreSQL text array). Implement tag autocomplete from existing tags in the workspace. Tags are created on-the-fly.

**Acceptance Criteria:**
- `GET /workspaces/:id/tags` → aggregates all unique tags used across tasks in workspace
- Task detail panel: tag input shows autocomplete dropdown populated from workspace tags
- New tag created by pressing Enter or comma
- Tags rendered as pill badges in task rows and detail panel
- Tag click in task row opens search/filter pre-filtered to that tag

---

### TF-038 · Filter bar (frontend)
**Type:** Frontend | **Priority:** P1 | **Milestone:** M3 | **Estimate:** 4h | **Deps:** TF-037

**Description:**  
Filter bar appears at the top of the workspace view. Allows filtering visible tasks by status, priority, due date range, tags, and assignee. Filters are applied client-side (no new API call for each filter change).

**Acceptance Criteria:**
- Filter bar is hidden by default; revealed by a `[Filter]` button in TopBar
- Each filter type is a multi-select (e.g., status: [In Progress, Blocked])
- Active filter count shown on `[Filter]` button badge
- Filtered tasks hidden in their sections; empty sections show `(filtered)` badge
- `[Clear all]` resets all filters
- Filter state in URL query params (shareable filtered views)

---

### TF-039 · Smart views — Today and Upcoming (backend + frontend)
**Type:** Backend + Frontend | **Priority:** P2 | **Milestone:** M3 | **Estimate:** 4h | **Deps:** TF-023

**Description:**  
Implement Today and Upcoming smart views that aggregate tasks across all the user's workspaces.

**Acceptance Criteria:**
- `GET /tasks/smart/today` → tasks due on current date across all user's workspaces
- `GET /tasks/smart/upcoming` → tasks due in next 7 days, sorted by due date
- Both endpoints require auth; return workspace name + section breadcrumb with each task
- Frontend renders as flat lists grouped by workspace, each item showing section breadcrumb
- Tasks in smart views can be completed or edited inline (full detail panel opens)

---

## MILESTONE 4 — Rich Content, Media, and Internal Linking

---

### TF-040 · Tiptap rich text editor integration (frontend)
**Type:** Frontend | **Priority:** P0 | **Milestone:** M4 | **Estimate:** 5h | **Deps:** TF-028

**Description:**  
Integrate Tiptap as the task body editor. Support: bold, italic, inline code, code block, headings (H1-H3), unordered list, ordered list, task list (checkboxes), blockquote, horizontal rule, and links.

**Acceptance Criteria:**
- Editor renders inside Task Detail panel
- Toolbar shown above editor with all supported formatting buttons
- Keyboard shortcuts work: `⌘B` bold, `⌘I` italic, `` ⌘` `` code
- Content saved as Tiptap JSON to `task.body`
- DOMPurify sanitization applied when rendering (read-only view) — not in edit mode
- Placeholder text: `Add a description...`
- Empty body does not save a JSON wrapper (saved as null)

---

### TF-041 · File upload endpoint and Cloudinary integration (backend)
**Type:** Backend | **Priority:** P1 | **Milestone:** M4 | **Estimate:** 4h | **Deps:** TF-023

**Description:**  
Implement `POST /tasks/:id/attachments`. Uses Multer to accept file upload, validates MIME type + size, uploads to Cloudinary with server-side signature, creates Attachment record.

**Acceptance Criteria:**
- Accepts: image (jpeg, png, gif, webp), video (mp4, webm), audio (mpeg, wav, ogg), file (pdf + any)
- Max 50MB per file; Multer rejects oversized files before reaching controller
- MIME type validated via `file-type` magic bytes check
- Upload to Cloudinary: server generates signed upload params, uploads via Cloudinary SDK
- Cloudinary `public_id`: `taskforge/{taskId}/{uuid}`
- Attachment record created with: `type`, `url` (CDN), `filename`, `mimeType`, `sizeBytes`
- Response: `{ attachment: { id, type, url, filename, mimeType, sizeBytes } }`
- Delete endpoint: `DELETE /tasks/:id/attachments/:aId` → `cloudinary.uploader.destroy()` + DB delete

---

### TF-042 · Link preview scraping (backend)
**Type:** Backend | **Priority:** P1 | **Milestone:** M4 | **Estimate:** 3h | **Deps:** TF-041

**Description:**  
When an attachment of type `LINK` is added, scrape Open Graph metadata from the URL server-side. Store as JSON in `attachment.metadata`.

**Acceptance Criteria:**
- `POST /tasks/:id/attachments/link`: `{ url }` → scrape OG metadata
- Scrape: title, description, image URL, favicon, domain
- Use `cheerio` + `node-fetch` for scraping; timeout 5s
- On scrape failure (unreachable URL, no OG tags): store `{ url }` with no metadata gracefully
- Metadata sanitized with DOMPurify equivalent (server-side: `sanitize-html`) before storing
- Scraping runs in-request (fast URLs) or as a background job if needed

---

### TF-043 · Media attachment UI (frontend)
**Type:** Frontend | **Priority:** P1 | **Milestone:** M4 | **Estimate:** 6h | **Deps:** TF-041, TF-042, TF-028

**Description:**  
Build the attachments section in Task Detail panel. Support upload via drag-drop or click-to-browse. Render each type with its appropriate component.

**Acceptance Criteria:**
- Drop zone: full-width dashed border area below description
- Upload progress: per-file progress bar (using XMLHttpRequest for progress events)
- **Image**: thumbnail grid (3-column), click → lightbox with arrow navigation
- **Audio**: custom waveform player (static waveform using Web Audio API sample, not real waveform — visualized as bars), play/pause, seek, time display
- **Video (local)**: `<video>` with custom-styled controls
- **Video (YouTube URL)**: auto-detected, rendered as embed iframe
- **Link**: card showing favicon + title + description + domain + "Open" button
- **File**: icon by MIME type + filename + size + download button
- Delete button (✕) on hover of each attachment (EDITOR+ only)

---

### TF-044 · Clipboard paste image upload (frontend)
**Type:** Frontend | **Priority:** P2 | **Milestone:** M4 | **Estimate:** 2h | **Deps:** TF-043

**Description:**  
When the user pastes an image (Ctrl+V / Cmd+V) while the Task Detail panel is focused, automatically upload it as an attachment.

**Acceptance Criteria:**
- `paste` event listener on Task Detail panel
- If `clipboardData.files` contains an image → upload it via the attachment API
- Shows upload progress bar
- Pasting text still works normally in Tiptap editor (only intercept image pastes)
- Success: attachment appears in the attachments list

---

### TF-045 · Internal task/section hyperlink — Tiptap extension (frontend)
**Type:** Frontend | **Priority:** P1 | **Milestone:** M4 | **Estimate:** 6h | **Deps:** TF-040, TF-023

**Description:**  
Create a custom Tiptap extension for internal links. Triggered by typing `[[` or using the toolbar link button → "Link to task/section". Renders as a chip node; clicking navigates to the linked item.

**Acceptance Criteria:**
- Typing `[[` opens an autocomplete dropdown (task/section search, keyboard navigable)
- Selecting an item inserts a `<task-link>` node chip: `⊡ Task Title`
- Chip styled as `--bg-elevated` pill with `--accent` border
- Clicking a chip navigates to the linked task/section (`react-router` navigate)
- If the linked item is in a different workspace the user has access to, it still navigates correctly
- If the linked item is deleted, chip shows `[deleted]` in muted style

---

### TF-046 · TaskLink backend — record and resolve internal links
**Type:** Backend | **Priority:** P1 | **Milestone:** M4 | **Estimate:** 3h | **Deps:** TF-023

**Description:**  
When a task body is saved, extract all internal link node IDs from the Tiptap JSON, diff against existing `TaskLink` records, insert new ones, delete removed ones.

**Acceptance Criteria:**
- `syncTaskLinks(taskId, tiptapJSON)` utility function: extracts all `task-link` node IDs from JSON
- Runs after every task body save
- New links inserted as `TaskLink { sourceId: taskId, targetId: linkedId }`
- Removed links deleted
- `GET /tasks/:id/references` returns all tasks that link TO this task (back-references)
- Task Detail panel shows: `Linked to: [list]` and `Referenced by: [list]`

---

### TF-047 · Internal link navigation (frontend)
**Type:** Frontend | **Priority:** P1 | **Milestone:** M4 | **Estimate:** 3h | **Deps:** TF-045, TF-046

**Description:**  
Implement `linkResolver.js`: given a taskId or sectionId, navigate the app to that item and expand the section path to it.

**Acceptance Criteria:**
- `resolveLink(type, id)` navigates to `/w/:workspaceId/t/:taskId` or `/w/:workspaceId/s/:sectionId`
- If the item is in a collapsed parent section, the path is expanded before opening
- If target is in a different workspace, navigate to that workspace first
- If target is deleted or inaccessible → toast: `This item no longer exists`
- "Referenced by" list items in Task Detail panel use this resolver

---

## MILESTONE 5 — Search, 2FA, Sharing, Session UI

---

### TF-048 · Full-text search endpoint (backend)
**Type:** Backend | **Priority:** P1 | **Milestone:** M5 | **Estimate:** 4h | **Deps:** TF-023

**Description:**  
Implement `GET /search?q=&workspaceId=&tags=&status=&priority=&dueBefore=&dueAfter=`. Use PostgreSQL `tsvector` full-text search on task title + plain-text extract of body.

**Acceptance Criteria:**
- `search_vector` generated column on `tasks` table: `to_tsvector('english', title || ' ' || coalesce(body_text, ''))`
- `body_text` is a computed column extracting plain text from Tiptap JSON (Postgres function)
- GIN index on `search_vector`
- Query: `WHERE search_vector @@ plainto_tsquery('english', $1)`
- Results filtered by workspaceId (if provided), otherwise searches all user's workspaces
- Filters: tags (`= ANY(tags)`), status, priority, due date range
- Results sorted by rank (`ts_rank`) descending
- Max 50 results; supports pagination via `offset`
- Results include: `{ taskId, title, sectionId, sectionTitle, workspaceId, workspaceName }`

---

### TF-049 · Search modal (frontend)
**Type:** Frontend | **Priority:** P1 | **Milestone:** M5 | **Estimate:** 4h | **Deps:** TF-048

**Description:**  
Build the command-palette style search modal. Triggered by `⌘K`. Debounced search as user types. Results grouped by workspace.

**Acceptance Criteria:**
- Opens with fade + scale animation (150ms)
- Input autofocused on open
- Search debounced 300ms after last keystroke
- Results grouped by workspace with accent color indicator
- Keyboard navigation: arrow keys move between results, Enter opens task
- Filter toggles at top: status, workspace scope (all / current workspace)
- Recent searches stored in localStorage (max 10), shown when input is empty
- Closes on Escape or click outside

---

### TF-050 · TOTP 2FA setup and verify (backend)
**Type:** Backend | **Priority:** P1 | **Milestone:** M5 | **Estimate:** 4h | **Deps:** TF-008

**Description:**  
Implement TOTP setup (`POST /auth/totp/setup`) and verification (`POST /auth/totp/verify`). Integrate into login flow.

**Acceptance Criteria:**
- Setup: generate secret with `speakeasy.generateSecret()`, encrypt with AES-256-GCM before storing, return QR code URL (`otpauth://` URI for `qrcode` library)
- Client renders QR code, user scans with authenticator app
- Confirm setup: `POST /auth/totp/verify` with 6-digit code → enables 2FA if code correct
- On enable: generate 10 backup codes (`crypto.randomBytes(5).toString('hex')`), return once only, store bcrypt hashes
- Login integration: if `totpEnabled`, login returns `{ requiresTOTP: true, tempToken }` after password OK; second call `POST /auth/totp/confirm { tempToken, code }` issues full tokens
- Disable 2FA: `DELETE /auth/totp` requires current TOTP code or backup code, invalidates all sessions

---

### TF-051 · 2FA UI — setup and login prompt (frontend)
**Type:** Frontend | **Priority:** P1 | **Milestone:** M5 | **Estimate:** 4h | **Deps:** TF-050

**Description:**  
Build 2FA setup wizard in Settings and the TOTP prompt in the login flow.

**Acceptance Criteria:**
- Settings > Security: toggle "Enable Two-Factor Authentication"
- Setup wizard: Step 1 — QR code + manual secret; Step 2 — enter 6-digit code to confirm; Step 3 — show backup codes (copy + download)
- Backup codes displayed once with `[Copy all]` and `[Download .txt]` buttons and `⚠ Store these safely` warning
- Login flow: after password accepted, if 2FA required, screen transitions to 6-digit code input
- Code input: 6 individual boxes (OTP-style), auto-advance on each digit, auto-submit on 6th digit
- "Use a backup code" link switches input to text field

---

### TF-052 · Session management UI (frontend)
**Type:** Frontend | **Priority:** P1 | **Milestone:** M5 | **Estimate:** 3h | **Deps:** TF-013

**Description:**  
Build the session list in Settings. Shows all active sessions with device info and revoke controls.

**Acceptance Criteria:**
- Lists all sessions: device icon (inferred from user agent), browser, OS, IP address, "Last seen" timestamp
- Current session marked with `(This device)` badge
- `[Revoke]` button on each session (confirmation required)
- `[Log out all other devices]` button at top
- Optimistic revoke: session removed from list immediately

---

### TF-053 · User profile settings page (frontend)
**Type:** Frontend | **Priority:** P2 | **Milestone:** M5 | **Estimate:** 3h | **Deps:** TF-018

**Description:**  
Build Settings page: profile info, avatar, password change, 2FA, sessions, notification preferences.

**Acceptance Criteria:**
- Profile tab: edit displayName, avatar upload (crop to square, upload to Cloudinary)
- Security tab: change password form (current password + new password + confirm), 2FA section, session list
- Notifications tab: per-workspace toggles for notification types
- All changes saved via API; success toast on save

---

### TF-054 · Workspace sharing UI (frontend)
**Type:** Frontend | **Priority:** P1 | **Milestone:** M5 | **Estimate:** 4h | **Deps:** TF-020

**Description:**  
Build the workspace member management UI in workspace settings (accessible from workspace `⋯` menu).

**Acceptance Criteria:**
- Shows member list: avatar, displayName, email, role badge, join date
- OWNER sees: role change dropdown, remove button for all members
- EDITOR sees: remove button for themselves only (leave workspace)
- Invite member: input for email + role selector → `POST /workspaces/:id/members`
- Invalid email or user-not-found shows inline error
- Role change is optimistic; reverted on error

---

## MILESTONE 6 — Notifications, Recurring Tasks, Archive

---

### TF-055 · Notification system (backend)
**Type:** Backend | **Priority:** P2 | **Milestone:** M6 | **Estimate:** 4h | **Deps:** TF-023, TF-031

**Description:**  
Create notification service. Generate notifications on: task assigned, due date approaching (reminder), workspace invite.

**Acceptance Criteria:**
- `createNotification(userId, type, message, taskId?)` helper in `notification.service.js`
- Task assigned: notification created for assignee when `assigneeId` set or changed
- Due date reminder: BullMQ job scheduled at `task.reminderAt`; creates notification at that time
- Notification delivered via Socket.io `notification:new` event to the target user's personal room (`user:{userId}`)
- `GET /notifications`: returns paginated list of notifications for authenticated user, newest first
- `PUT /notifications/:id/read` and `PUT /notifications/read-all`

---

### TF-056 · Notification UI (frontend)
**Type:** Frontend | **Priority:** P2 | **Milestone:** M6 | **Estimate:** 3h | **Deps:** TF-055

**Description:**  
Build the notification bell and dropdown panel in the TopBar.

**Acceptance Criteria:**
- Bell icon shows unread count badge (red, max 99)
- Clicking opens dropdown notification list
- Incoming `notification:new` socket event: count increments, new notification prepended to list
- Each notification: icon by type, message text, relative time, linked task title
- Clicking a notification → marks as read + navigates to linked task
- `[Mark all read]` button
- Count cleared when dropdown opened (marks all visible as read)

---

### TF-057 · Due date reminder scheduling (backend)
**Type:** Backend | **Priority:** P2 | **Milestone:** M6 | **Estimate:** 3h | **Deps:** TF-055

**Description:**  
When a task's `reminderAt` is set or updated, schedule a BullMQ job to fire at that time and deliver the notification.

**Acceptance Criteria:**
- On task create/update with `reminderAt`: schedule BullMQ job with `delay` = `reminderAt - now`
- On task update changing `reminderAt`: cancel old job (store BullMQ job ID on task), schedule new one
- On task delete or `reminderAt` cleared: cancel the job
- Job fires: creates Notification + emits socket event to assignee (or creator if no assignee)
- Edge case: if `reminderAt` is in the past when task is created, fire notification immediately

---

### TF-058 · Recurring tasks (backend)
**Type:** Backend | **Priority:** P2 | **Milestone:** M6 | **Estimate:** 4h | **Deps:** TF-023

**Description:**  
Support recurring tasks via iCal RRULE strings. On task completion, auto-create the next occurrence.

**Acceptance Criteria:**
- `isRecurring: true`, `recurRule: "FREQ=WEEKLY;BYDAY=MO"` stored on task
- On `PUT /tasks/:id` with `status: DONE` and `isRecurring: true`: create next occurrence using `rrule` library to compute next date
- Next occurrence created in same section with same title, body, tags, priority, `dueDate` set to next occurrence date, `status: TODO`
- Current task archived (not deleted)
- Supported rules: daily, weekly (with day-of-week), monthly (nth day of month)
- Recurring indicator shown on task row (↻ icon)

---

### TF-059 · Archive and restore (backend + frontend)
**Type:** Backend + Frontend | **Priority:** P2 | **Milestone:** M6 | **Estimate:** 3h | **Deps:** TF-023

**Description:**  
Tasks can be archived (soft delete). Archived tasks are hidden from the main view but accessible via an "Archived" section. Restore is possible.

**Acceptance Criteria:**
- `PUT /tasks/:id` with `{ isArchived: true }` archives; `{ isArchived: false }` restores
- `GET /sections/:sId/tasks?archived=true` returns only archived tasks (for archive view)
- Workspace has `[View archive]` link in workspace `⋯` menu → opens Archive panel
- Archive panel: lists all archived tasks in workspace, grouped by section, with `[Restore]` and `[Delete permanently]` buttons
- Permanent delete: OWNER only; `DELETE /tasks/:id?permanent=true`

---

## MILESTONE 7 — Deployment, CI/CD, Final Polish

---

### TF-060 · Dockerfile for server
**Type:** Infra | **Priority:** P0 | **Milestone:** M7 | **Estimate:** 2h | **Deps:** All backend

**Description:**  
Create a production-ready multi-stage Dockerfile for the server.

**Acceptance Criteria:**
- Multi-stage: `builder` stage installs deps + runs build; `runner` stage is minimal Node image
- Uses `node:20-slim` as base
- Non-root user in production stage
- `EXPOSE 4000`
- `CMD ["node", "src/index.js"]`
- `HEALTHCHECK` hitting `/health` endpoint
- Image size < 300MB
- Prisma client generated in build stage (`prisma generate`)

---

### TF-061 · Health check endpoint
**Type:** Backend | **Priority:** P0 | **Milestone:** M7 | **Estimate:** 1h | **Deps:** TF-003

**Description:**  
Add `GET /health` endpoint that checks DB and Redis connectivity.

**Acceptance Criteria:**
- No auth required
- Checks: Prisma `$queryRaw SELECT 1`, Redis `PING`
- Returns `200 { status: "ok", db: "ok", redis: "ok", uptime: N }` if all healthy
- Returns `503 { status: "degraded", db: "error", redis: "ok" }` if any check fails
- Used by Docker and Railway for health monitoring

---

### TF-062 · GitHub Actions CI pipeline
**Type:** Infra | **Priority:** P0 | **Milestone:** M7 | **Estimate:** 3h | **Deps:** TF-060

**Description:**  
Create GitHub Actions workflow that runs on push to `main` and on pull requests.

**Acceptance Criteria:**
- Jobs: `lint` (ESLint both client + server), `test` (Jest unit tests), `build` (Vite client build + Docker server build)
- On push to `main`: after all jobs pass, deploy server to Railway via Railway CLI
- On push to `main`: deploy client to Vercel via `vercel --prod`
- Secrets: `RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` stored as GitHub Actions secrets
- PR checks: lint + test only (no deploy)
- Workflow runs in ~5 minutes for a clean build

---

### TF-063 · Production deployment — Railway (server) + Vercel (client)
**Type:** Infra | **Priority:** P0 | **Milestone:** M7 | **Estimate:** 4h | **Deps:** TF-062

**Description:**  
Deploy the full application. Server on Railway (from Dockerfile), client on Vercel (static Vite build), Postgres and Redis on Railway managed services, files on Cloudinary.

**Acceptance Criteria:**
- Server accessible at `https://api.taskforge-app.up.railway.app` (or custom domain)
- Client accessible at `https://taskforge.vercel.app` (or custom domain)
- All env vars set in Railway and Vercel dashboards (not in any committed file)
- `npx prisma migrate deploy` runs on server startup in production
- SSL: Railway and Vercel both provide HTTPS automatically
- WebSocket (WSS) works through Railway's proxy
- End-to-end test: register → verify email → login → create workspace → create task → verify real-time sync in two tabs

---

### TF-064 · Keyboard shortcut system (frontend)
**Type:** Frontend | **Priority:** P2 | **Milestone:** M7 | **Estimate:** 3h | **Deps:** TF-029

**Description:**  
Implement global keyboard shortcut handling and the shortcuts reference modal.

**Acceptance Criteria:**
- All shortcuts from the frontend spec implemented
- `useKeyboard.js` hook registers global `keydown` listener, maps shortcuts to actions
- Shortcuts disabled when user is typing in an input or editor
- `⌘/` opens a modal listing all shortcuts, grouped by context (Navigation, Tasks, Editor, Global)
- Shortcut hints shown in tooltips on relevant buttons (e.g., `[+ Add task]` tooltip: `N`)

---

### TF-065 · Offline indicator and reconnect handling (frontend)
**Type:** Frontend | **Priority:** P2 | **Milestone:** M7 | **Estimate:** 2h | **Deps:** TF-033

**Description:**  
Detect network offline state and Socket.io disconnect. Show appropriate UI. Prompt refresh on reconnect.

**Acceptance Criteria:**
- `navigator.onLine` + `online/offline` events monitored
- Offline: banner `● Offline — changes will sync when reconnected` across top (red)
- Socket disconnect (not offline): `● Disconnected — reconnecting...` with spinner
- On reconnect: banner disappears; TanStack Query caches refreshed (invalidate all)
- Mutations attempted while offline: blocked with toast `You're offline — try again when connected`

---

### TF-066 · Loading states and skeleton screens (frontend)
**Type:** Frontend | **Priority:** P2 | **Milestone:** M7 | **Estimate:** 3h | **Deps:** TF-026, TF-028

**Description:**  
Replace spinner-only loading with skeleton screens for workspace, section list, and task detail.

**Acceptance Criteria:**
- Workspace page: sections skeleton (3 section blocks, each with 3 task rows) while loading
- Task detail: field skeletons for status, priority, due date, description while loading
- Sidebar: workspace list skeletons while loading workspaces
- Skeletons use CSS animation (`@keyframes shimmer`) — `--bg-elevated` with moving `--bg-hover` highlight
- No layout shift when real content replaces skeletons

---

### TF-067 · Error boundary and global error handling (frontend)
**Type:** Frontend | **Priority:** P2 | **Milestone:** M7 | **Estimate:** 2h | **Deps:** All frontend

**Description:**  
Add React error boundaries around major sections. Implement a global toast notification system for API errors.

**Acceptance Criteria:**
- Error boundary wraps: workspace view, task detail, sidebar
- Caught render error: shows `Something went wrong. [Try again]` within the bounded area, not a full crash
- Global toast system: renders in a fixed overlay, max 3 toasts visible, auto-dismisses in 4s
- Toast types: success (green), error (red), info (blue), warning (yellow)
- API errors from Axios interceptor trigger error toasts automatically
- Toast accessible (role="alert", aria-live="polite")

---

### TF-068 · Security headers and final security audit
**Type:** Backend | **Priority:** P0 | **Milestone:** M7 | **Estimate:** 2h | **Deps:** All backend

**Description:**  
Install and configure `helmet.js`. Run `npm audit`. Review all API routes for missing auth/role checks. Final pass on input validation coverage.

**Acceptance Criteria:**
- All Helmet headers configured per security document (CSP, HSTS, frameguard, noSniff, XSS filter, referrer policy)
- `npm audit` returns 0 critical, 0 high vulnerabilities
- Every non-public route has `requireAuth` applied
- Every workspace-scoped route has `workspaceAccess` applied
- CORS allows only `CLIENT_ORIGIN`
- Verified: unauthenticated request to `/workspaces` → 401; valid auth but non-member → 403

---

### TF-069 · Final UI polish and responsive QA
**Type:** Frontend | **Priority:** P1 | **Milestone:** M7 | **Estimate:** 4h | **Deps:** All frontend

**Description:**  
Full pass on responsive behavior, spacing consistency, focus styles, animation smoothness, and visual QA across breakpoints.

**Acceptance Criteria:**
- Tested at: 375px (iPhone SE), 768px (iPad), 1280px (laptop), 1920px (desktop)
- No horizontal scroll at any breakpoint
- All interactive elements have visible keyboard focus (2px `--accent` outline)
- `prefers-reduced-motion: reduce` tested — all transitions instant
- Dark mode is the only mode (no light mode in v1.0, consistent at all times)
- Font loading verified: no FOUT (fonts preloaded correctly)
- Lighthouse score: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 95

---

### TF-070 · README and documentation finalization
**Type:** Docs | **Priority:** P1 | **Milestone:** M7 | **Estimate:** 2h | **Deps:** All

**Description:**  
Write comprehensive README for the project repository, suitable for internship application presentation.

**Acceptance Criteria:**
- README covers: project overview, feature list, tech stack (with rationale), architecture diagram (ASCII), setup instructions (Docker + manual), environment variables table, API reference (brief), deployment guide, screenshots
- `CONTRIBUTING.md` with branching strategy and PR guidelines
- `API.md` with full endpoint reference (auto-generated from comments or manually written)
- Screenshots of: auth page, dashboard, workspace with nested sections, task detail with attachments, search modal
- No AI-generated filler text; written in an engineer's voice

---

## Ticket Summary

| Milestone | Tickets | Focus |
|---|---|---|
| M1 | TF-001 to TF-018 | Auth, user model, JWT, email, rate limiting |
| M2 | TF-019 to TF-030 | Workspaces, sections, tasks, app shell |
| M3 | TF-031 to TF-039 | Real-time, drag-drop, tags, filters, smart views |
| M4 | TF-040 to TF-047 | Rich text, media, internal linking |
| M5 | TF-048 to TF-054 | Search, 2FA, sharing, session UI |
| M6 | TF-055 to TF-059 | Notifications, recurring tasks, archive |
| M7 | TF-060 to TF-070 | Deployment, CI/CD, polish, security audit |
| **Total** | **70 tickets** | |
