# Technical Architecture Document
## TaskForge — Hierarchical Task Management Platform
**Version:** 1.0  
**Author:** Daivya  
**Status:** Planning  
**Last Updated:** June 2026

---

## 1. System Overview

TaskForge is a three-tier web application:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                          │
│         React SPA (Vite) + Socket.io-client                 │
│         Deployed on: Vercel / Render (static)               │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS + WSS
┌─────────────────────────▼───────────────────────────────────┐
│                       SERVER TIER                           │
│       Node.js 20 + Express 5 + Socket.io server             │
│       REST API  |  WebSocket server  |  Job queue           │
│       Deployed on: Railway / Render (container)             │
└──────────┬─────────────────────────────┬────────────────────┘
           │                             │
┌──────────▼──────────┐     ┌────────────▼───────────────────┐
│    DATA TIER        │     │         CACHE / PUB-SUB        │
│  PostgreSQL 16      │     │    Redis 7 (Bull queues,       │
│  Primary DB         │     │    sessions, pub/sub for WS)   │
│  (Neon / Railway)   │     │    (Upstash / Railway Redis)   │
└─────────────────────┘     └────────────────────────────────┘
           │
┌──────────▼──────────┐
│   FILE STORAGE      │
│  Cloudinary (media) │
│  or AWS S3          │
└─────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + Vite | Fast HMR, modern React features |
| State management | Zustand | Lightweight, no boilerplate, easy async |
| Server state | TanStack Query v5 | Caching, background sync, optimistic updates |
| Routing | React Router v6 | Nested routes, lazy loading |
| Real-time | Socket.io-client | Matches server, auto-reconnect |
| Rich text | Tiptap (ProseMirror-based) | Extensible, headless, supports custom extensions |
| Drag-and-drop | @dnd-kit | Modern, accessible, composable |
| HTTP client | Axios with interceptors | JWT refresh interceptor |
| Forms | React Hook Form + Zod | Performant, typed validation |
| UI primitives | Radix UI (headless) | Accessible, unstyled — layered with custom CSS |
| Animations | Framer Motion | Controlled, not gratuitous |
| Date handling | date-fns | Tree-shakeable |
| Icons | Lucide React | Consistent, minimal |
| Styling | CSS Modules + CSS custom properties | No Tailwind — intentional, full design control |
| File uploads | react-dropzone | Drag-to-upload with preview |

### 2.2 Directory Structure

```
client/
├── src/
│   ├── assets/                  # Static images, fonts
│   ├── components/
│   │   ├── auth/                # LoginForm, RegisterForm, 2FAPrompt
│   │   ├── workspace/           # WorkspaceCard, WorkspaceSidebar
│   │   ├── section/             # SectionBlock, SectionHeader, CollapseToggle
│   │   ├── task/                # TaskCard, TaskDetail, TaskEditor
│   │   ├── media/               # MediaAttachment, LinkPreview, AudioPlayer
│   │   ├── search/              # SearchModal, FilterBar
│   │   ├── notifications/       # NotificationBell, NotificationList
│   │   ├── shared/              # Button, Modal, Tooltip, Badge, Avatar
│   │   └── layout/              # AppShell, Sidebar, TopBar
│   ├── pages/
│   │   ├── Auth.jsx             # Login / Register / Reset
│   │   ├── Dashboard.jsx        # All workspaces overview
│   │   ├── Workspace.jsx        # Single workspace with nested sections
│   │   ├── TaskDetail.jsx       # Full-page task detail
│   │   ├── Settings.jsx         # Profile, sessions, 2FA
│   │   └── SmartViews.jsx       # Today, Upcoming, Inbox
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useSocket.js
│   │   ├── useTasks.js
│   │   ├── useWorkspace.js
│   │   └── useSearch.js
│   ├── store/
│   │   ├── authStore.js         # Zustand: user, token, 2FA state
│   │   ├── uiStore.js           # Zustand: sidebar open, theme, active section
│   │   └── socketStore.js       # Zustand: socket instance, connection state
│   ├── api/
│   │   ├── client.js            # Axios instance + interceptors
│   │   ├── auth.js
│   │   ├── workspaces.js
│   │   ├── sections.js
│   │   ├── tasks.js
│   │   ├── media.js
│   │   └── search.js
│   ├── utils/
│   │   ├── treeUtils.js         # Flatten/nest hierarchy helpers
│   │   ├── linkResolver.js      # Internal link parsing + navigation
│   │   └── formatters.js
│   ├── styles/
│   │   ├── tokens.css           # Design tokens (colors, spacing, type)
│   │   ├── reset.css
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

### 2.3 Routing Structure

```
/                          → redirect to /dashboard or /auth/login
/auth/login                → LoginPage
/auth/register             → RegisterPage
/auth/verify-email/:token  → EmailVerification
/auth/reset-password       → RequestReset
/auth/reset-password/:token→ ResetPasswordForm
/dashboard                 → WorkspacesOverview
/w/:workspaceId            → WorkspaceRoot
/w/:workspaceId/s/:sectionId          → SectionFocusView
/w/:workspaceId/t/:taskId             → TaskDetailPage
/smart/today               → TodayView
/smart/upcoming            → UpcomingView
/settings                  → UserSettings (profile, 2fa, sessions)
```

### 2.4 Real-time Client Architecture

```
AppShell mounts
  └── useSocket() hook
        ├── Creates socket.io connection with auth token
        ├── Joins workspace room on workspace load
        ├── Listens for events:
        │     task:created   → invalidate TanStack Query cache
        │     task:updated   → optimistic merge into cache
        │     task:deleted   → remove from cache
        │     section:*      → same pattern
        │     presence:join  → add user to active-users list
        │     presence:leave → remove user from active-users list
        └── Emits:
              presence:join  on workspace load
              presence:leave on unmount
```

---

## 3. Backend Architecture

### 3.1 Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 5 |
| Language | JavaScript (ESM) — TypeScript-ready structure |
| WebSocket | Socket.io 4 |
| ORM | Prisma 5 |
| Auth | jsonwebtoken + bcrypt + speakeasy (TOTP) |
| Email | Nodemailer + Resend |
| File upload | Multer → Cloudinary SDK |
| Job queue | BullMQ (Redis-backed) |
| Validation | Zod |
| Logging | Winston + morgan |
| Rate limiting | express-rate-limit + redis store |

### 3.2 Directory Structure

```
server/
├── src/
│   ├── config/
│   │   ├── db.js              # Prisma client singleton
│   │   ├── redis.js           # Redis client (ioredis)
│   │   ├── socket.js          # Socket.io server setup
│   │   └── env.js             # Validated env vars (Zod)
│   ├── middleware/
│   │   ├── auth.js            # verifyAccessToken, requireAuth
│   │   ├── rateLimiter.js     # Per-route rate limits
│   │   ├── errorHandler.js    # Global error handler
│   │   ├── validate.js        # Zod schema validator
│   │   ├── upload.js          # Multer config + Cloudinary pipe
│   │   └── workspaceAccess.js # Check user membership + role
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── workspace.routes.js
│   │   ├── section.routes.js
│   │   ├── task.routes.js
│   │   ├── media.routes.js
│   │   ├── search.routes.js
│   │   └── notification.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── workspace.controller.js
│   │   ├── section.controller.js
│   │   ├── task.controller.js
│   │   ├── media.controller.js
│   │   ├── search.controller.js
│   │   └── notification.controller.js
│   ├── services/
│   │   ├── auth.service.js    # Token generation, refresh, revoke
│   │   ├── email.service.js   # Send verify/reset emails
│   │   ├── task.service.js    # Business logic: hierarchy, ordering
│   │   ├── media.service.js   # Upload + link preview scraping
│   │   ├── search.service.js  # Full-text search via Postgres
│   │   ├── socket.service.js  # Broadcast helpers
│   │   └── totp.service.js    # 2FA generate/verify
│   ├── jobs/
│   │   ├── emailQueue.js      # BullMQ queue for transactional email
│   │   └── reminderQueue.js   # Due date reminder jobs
│   ├── utils/
│   │   ├── apiError.js        # Custom error class
│   │   ├── asyncHandler.js    # Wrap async route handlers
│   │   └── treeUtils.js       # Server-side hierarchy helpers
│   ├── prisma/
│   │   └── schema.prisma
│   └── index.js               # App entry point
├── .env.example
├── Dockerfile
└── package.json
```

### 3.3 API Design

All endpoints follow REST conventions. Base URL: `/api/v1`

**Auth**
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/verify-email/:token
POST   /auth/forgot-password
POST   /auth/reset-password/:token
POST   /auth/totp/setup
POST   /auth/totp/verify
GET    /auth/sessions
DELETE /auth/sessions/:sessionId
```

**Workspaces**
```
GET    /workspaces
POST   /workspaces
GET    /workspaces/:id
PUT    /workspaces/:id
DELETE /workspaces/:id
POST   /workspaces/:id/members
PUT    /workspaces/:id/members/:userId
DELETE /workspaces/:id/members/:userId
```

**Sections**
```
GET    /workspaces/:wId/sections
POST   /workspaces/:wId/sections
PUT    /workspaces/:wId/sections/:sId
DELETE /workspaces/:wId/sections/:sId
POST   /workspaces/:wId/sections/:sId/reorder
```

**Tasks**
```
GET    /sections/:sId/tasks
POST   /sections/:sId/tasks
GET    /tasks/:id
PUT    /tasks/:id
DELETE /tasks/:id
POST   /tasks/:id/reorder
POST   /tasks/:id/attachments
DELETE /tasks/:id/attachments/:aId
GET    /tasks/:id/references         (internal back-links)
```

**Search**
```
GET    /search?q=&workspaceId=&tags=&status=&priority=&dueBefore=&dueAfter=
```

**Notifications**
```
GET    /notifications
PUT    /notifications/:id/read
PUT    /notifications/read-all
```

### 3.4 WebSocket Event Protocol

Rooms: `workspace:{workspaceId}`  
All events carry a `workspaceId` and the emitting `userId`.

| Event (server → client) | Payload |
|---|---|
| `task:created` | `{ task, sectionId }` |
| `task:updated` | `{ taskId, changes }` |
| `task:deleted` | `{ taskId, sectionId }` |
| `section:created` | `{ section }` |
| `section:updated` | `{ sectionId, changes }` |
| `section:deleted` | `{ sectionId }` |
| `section:reordered` | `{ sectionId, newOrder }` |
| `presence:join` | `{ userId, displayName, avatar }` |
| `presence:leave` | `{ userId }` |
| `notification:new` | `{ notification }` |

| Event (client → server) | Trigger |
|---|---|
| `workspace:join` | On workspace page mount |
| `workspace:leave` | On unmount |

---

## 4. Database Schema (Prisma)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  displayName   String
  avatarUrl     String?
  emailVerified Boolean  @default(false)
  totpSecret    String?
  totpEnabled   Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  workspaceMembers WorkspaceMember[]
  tasks            Task[]           @relation("AssignedTo")
  sessions         Session[]
  notifications    Notification[]
  createdTasks     Task[]           @relation("CreatedBy")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique        // refresh token hash
  userAgent String?
  ipAddress String?
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Workspace {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String?  // hex accent color per workspace
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members  WorkspaceMember[]
  sections Section[]
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  workspaceId String
  userId      String
  role        Role      @default(MEMBER)   // OWNER | EDITOR | VIEWER
  joinedAt    DateTime  @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
}

enum Role {
  OWNER
  EDITOR
  VIEWER
}

model Section {
  id          String   @id @default(cuid())
  workspaceId String
  parentId    String?  // null = top-level
  title       String
  color       String?
  collapsed   Boolean  @default(false)
  order       Float    // fractional indexing for reorder without full rewrite
  depth       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  parent    Section?  @relation("SectionChildren", fields: [parentId], references: [id])
  children  Section[] @relation("SectionChildren")
  tasks     Task[]
}

model Task {
  id          String     @id @default(cuid())
  sectionId   String
  title       String
  body        Json?      // Tiptap JSON document
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  reminderAt  DateTime?
  tags        String[]   // postgres text array
  order       Float      // fractional indexing
  isArchived  Boolean    @default(false)
  isRecurring Boolean    @default(false)
  recurRule   String?    // iCal RRULE string
  assigneeId  String?
  createdById String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  section     Section     @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  assignee    User?       @relation("AssignedTo", fields: [assigneeId], references: [id])
  createdBy   User        @relation("CreatedBy", fields: [createdById], references: [id])
  attachments Attachment[]
  linksTo     TaskLink[]  @relation("SourceTask")
  linkedFrom  TaskLink[]  @relation("TargetTask")
  notifications Notification[]
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  BLOCKED
  DONE
}

enum Priority {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

model Attachment {
  id         String         @id @default(cuid())
  taskId     String
  type       AttachmentType
  url        String         // CDN URL or external URL
  filename   String?
  mimeType   String?
  sizeBytes  Int?
  metadata   Json?          // link preview: title, favicon, description, thumbnail
  order      Int            @default(0)
  createdAt  DateTime       @default(now())
  task       Task           @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

enum AttachmentType {
  IMAGE
  VIDEO
  AUDIO
  FILE
  LINK
  EMBED
}

model TaskLink {
  id       String @id @default(cuid())
  sourceId String // task that contains the link
  targetId String // task being linked to
  source   Task   @relation("SourceTask", fields: [sourceId], references: [id], onDelete: Cascade)
  target   Task   @relation("TargetTask", fields: [targetId], references: [id], onDelete: Cascade)

  @@unique([sourceId, targetId])
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  taskId    String?
  type      NotificationType
  message   String
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  task      Task?            @relation(fields: [taskId], references: [id], onDelete: SetNull)
}

enum NotificationType {
  TASK_ASSIGNED
  COMMENT_ADDED
  DUE_DATE_REMINDER
  WORKSPACE_INVITE
}
```

---

## 5. Authentication Flow

```
REGISTRATION:
  Client → POST /auth/register { email, password, displayName }
  Server:
    1. Validate + hash password (bcrypt, 12 rounds)
    2. Create User (emailVerified: false)
    3. Generate email verify token → enqueue email job
    4. Return 201 { message: "Check your email" }

LOGIN:
  Client → POST /auth/login { email, password, totpCode? }
  Server:
    1. Find user, verify password
    2. If totpEnabled, verify TOTP code
    3. Generate accessToken (JWT, 15m expiry, HS256)
    4. Generate refreshToken (opaque, 7d expiry) → store hash in Session table
    5. Set refreshToken in httpOnly, SameSite=Strict cookie
    6. Return 200 { accessToken, user }

REFRESH:
  Client (Axios interceptor on 401) → POST /auth/refresh-token
  Server:
    1. Read refreshToken from cookie
    2. Find session by hash, check expiry
    3. Rotate: delete old session, create new session + new tokens
    4. Return 200 { accessToken }

LOGOUT:
  Client → POST /auth/logout
  Server:
    1. Delete Session record
    2. Clear cookie
    3. Return 200
```

---

## 6. Hierarchy Data Strategy

Sections and tasks use **fractional indexing** for ordering:
- Each item has a float `order` field
- Inserting between items A (order=1.0) and B (order=2.0): new item gets order=1.5
- Collision after repeated inserts: rebalance only affected range (rare, async job)
- This avoids updating all sibling orders on every reorder

Nesting is stored as adjacency list (parentId on Section). On fetch, server returns flat array and client `treeUtils.buildTree()` reconstructs the hierarchy. For deep trees (>100 nodes), server sends cursor-paginated subtrees.

---

## 7. Search Architecture

PostgreSQL full-text search via `tsvector`:
- `tasks` table has a generated column `search_vector tsvector` combining `title` and plain body text extracted from Tiptap JSON
- A GIN index on `search_vector`
- Tags are queried with `= ANY(tags)` with a GIN index on the array column
- Filtering by status, priority, dueDate uses B-tree indexes

No Elasticsearch in v1.0 — Postgres FTS covers the use case well at this scale.

---

## 8. Deployment Architecture

```
docker-compose.yml (local dev):
  services:
    - client (Vite dev server, port 5173)
    - server (Node.js, port 4000, nodemon)
    - postgres (port 5432, volume)
    - redis (port 6379)

Production (Railway or Render):
  - server: Dockerfile → Railway service, env vars injected
  - client: Vite build → Vercel or Render static
  - postgres: Railway managed Postgres or Neon
  - redis: Upstash Redis (serverless, free tier)
  - files: Cloudinary (free tier, 25GB)

CI/CD:
  - GitHub Actions: on push to main →
      1. Run lint + tests
      2. Build Docker image
      3. Deploy to Railway via Railway CLI
      4. Deploy client to Vercel via Vercel CLI
```

---

## 9. Environment Variables

```bash
# server/.env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEND_API_KEY=...
CLIENT_ORIGIN=https://taskforge.app
TOTP_ISSUER=TaskForge

# client/.env
VITE_API_URL=https://api.taskforge.app/api/v1
VITE_SOCKET_URL=https://api.taskforge.app
```
