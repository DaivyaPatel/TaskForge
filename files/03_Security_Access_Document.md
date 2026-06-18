# Security and Access Control Document
## TaskForge — Hierarchical Task Management Platform
**Version:** 1.0  
**Author:** Daivya  
**Status:** Planning  
**Last Updated:** June 2026  
**Classification:** Internal Engineering Reference

---

## 1. Threat Model

### 1.1 Assets to Protect

| Asset | Sensitivity |
|---|---|
| User passwords | Critical |
| JWT signing secrets | Critical |
| Refresh tokens | High |
| TOTP secrets | High |
| User task data + attachments | High |
| Email addresses | Medium |
| Session metadata (IP, UA) | Medium |
| Attachment files (CDN) | Medium |

### 1.2 Threat Actors

- **Unauthenticated external attacker** — brute force, credential stuffing, CSRF, injection
- **Authenticated insider threat** — a valid user accessing data outside their workspaces
- **Compromised token** — stolen access token or refresh token being replayed
- **Infrastructure attacker** — database breach, leaked env vars, CDN hijack

### 1.3 STRIDE Analysis (Key Risks)

| Threat | Vector | Mitigation |
|---|---|---|
| Spoofing | Fake JWT, stolen cookie | Short-lived JWTs, httpOnly cookie, token rotation |
| Tampering | Modifying request bodies | Zod validation on all inputs, Prisma parameterized queries |
| Repudiation | Denying actions | Server-side audit log on all destructive actions |
| Info Disclosure | IDOR on task/section IDs | Workspace membership check on every resource access |
| DoS | Spam requests | Rate limiting per IP and per user |
| Elevation of Privilege | Role bypass | Role checked server-side on every write; client role is display only |

---

## 2. Authentication Design

### 2.1 Password Security

- Minimum 8 characters; encourage passphrase (no max under 128)
- Hashed with **bcrypt**, cost factor 12
- No password is ever logged, stored in plaintext, or returned in any API response
- Password strength checked client-side with zxcvbn (informational only, not a gate)
- On password reset, all existing sessions are invalidated

### 2.2 JWT Access Token

```
Header:  { alg: "HS256", typ: "JWT" }
Payload: {
  sub: "<userId>",
  email: "<email>",
  iat: <issued_at>,
  exp: <issued_at + 900>   // 15 minutes
}
```

- Signed with `JWT_SECRET` (≥ 64-byte random string, stored in env only)
- Transmitted in `Authorization: Bearer <token>` header only — never in URL, never in cookie
- Short expiry (15m) limits blast radius of token theft
- Not stored in `localStorage` — held in Zustand in-memory only; lost on page close
- On access token expiry, Axios interceptor transparently calls `/auth/refresh-token`

### 2.3 Refresh Token

- Opaque 256-bit random token generated with `crypto.randomBytes(32)`
- Stored as **bcrypt hash** in `Session` table (never the raw token)
- Transmitted and stored only in an **httpOnly, Secure, SameSite=Strict** cookie
- Expiry: 7 days; extended on use (sliding window)
- **Rotation on every use:** old session deleted, new session created — prevents replay
- **Reuse detection:** if a previously used refresh token is presented, all sessions for that user are immediately revoked (token theft indicator)

### 2.4 Email Verification

- On register: generate `crypto.randomBytes(32)` token, store hash + expiry (24h) in DB
- Email contains: `https://taskforge.app/auth/verify-email/<raw_token>`
- On click: hash the token, find in DB, check expiry, mark `emailVerified: true`, delete token
- Users with `emailVerified: false` can log in but see a persistent banner; destructive actions are gated

### 2.5 Password Reset

- User requests reset: generate token, store hash + 1h expiry, send email
- Token is single-use: deleted immediately on first valid use
- On successful reset: `passwordHash` updated, **all sessions invalidated**
- No username enumeration: response is always "If that email exists, you'll receive a link"

### 2.6 Two-Factor Authentication (TOTP)

- TOTP via **RFC 6238** (time-based, 30s window, 6 digits)
- Secret generated with `speakeasy.generateSecret()`, encrypted with AES-256-GCM using `TOTP_ENCRYPT_KEY` before storing in DB
- Setup flow: user scans QR code in authenticator app → enters code to confirm → 10 backup codes generated (bcrypt-hashed, stored)
- Login flow: after password OK, if `totpEnabled`, prompt for 6-digit code before issuing tokens
- Backup codes: one-time use, each deleted after successful use

---

## 3. Authorization and Access Control

### 3.1 Role Model

Every user in a workspace holds one of three roles:

| Role | Permissions |
|---|---|
| `OWNER` | All actions including delete workspace, manage members, change roles |
| `EDITOR` | Create/edit/delete sections and tasks; upload media; invite members (not above their role) |
| `VIEWER` | Read-only: view sections, tasks, attachments; no writes |

### 3.2 Resource Access Rules

Every request to a workspace-scoped resource goes through `workspaceAccess` middleware:

```
1. Extract userId from verified JWT
2. Extract workspaceId from route params or request body
3. Query WorkspaceMember for (userId, workspaceId)
4. If not found → 403 Forbidden
5. If role < required role for action → 403 Forbidden
6. Attach { userId, workspaceId, role } to req.user → pass to controller
```

This check is **never skipped** — role is always sourced from DB, never from the request.

### 3.3 IDOR Prevention

All resource IDs (task, section, attachment) are CUIDs — unguessable. But IDOR is prevented structurally, not by obscurity:

- `GET /tasks/:id` → server fetches task, gets its sectionId → gets section's workspaceId → verifies membership
- Attachment URLs are signed Cloudinary URLs with short expiry (6h), not publicly guessable CDN links

### 3.4 Ownership Rules

| Action | Minimum Role |
|---|---|
| Read any workspace resource | VIEWER |
| Create / edit section | EDITOR |
| Create / edit task | EDITOR |
| Upload attachment | EDITOR |
| Delete task/section | EDITOR (own) or OWNER (any) |
| Invite member | EDITOR (only VIEWER role) or OWNER |
| Remove member | OWNER |
| Delete workspace | OWNER |
| Change member role | OWNER |

---

## 4. Transport Security

- All traffic served over **HTTPS only** in production (HSTS header enforced)
- WebSocket connections use **WSS** only
- No mixed content: all asset URLs (fonts, scripts, CDN) use HTTPS
- TLS 1.2 minimum (Railway/Render enforce this by default)
- CORS policy on Express: `origin` is strictly `CLIENT_ORIGIN` env var; no wildcard in production

```js
// CORS config
app.use(cors({
  origin: process.env.CLIENT_ORIGIN,
  credentials: true,           // allows cookie on cross-origin (for httpOnly refresh token)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 5. Input Validation and Injection Prevention

### 5.1 Request Validation

Every route uses a Zod schema validated by `validate` middleware before reaching the controller. No raw `req.body` access in controllers.

Example:
```js
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  sectionId: z.string().cuid(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional()
});
```

### 5.2 SQL Injection

- All DB queries use **Prisma ORM** which uses parameterized queries exclusively
- No raw SQL strings concatenated with user input
- The one place raw SQL is used (full-text search) uses Prisma's `$queryRaw` with tagged template literals — parameterized by design

### 5.3 XSS

- React escapes all JSX output by default
- Tiptap rich text is rendered using `dangerouslySetInnerHTML` only after **DOMPurify** sanitization with a strict allowlist
- Attachment metadata (link preview title, description) is also DOMPurify-sanitized before render
- Content-Security-Policy header on all responses:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://res.cloudinary.com data:; media-src 'self' https://res.cloudinary.com; frame-src 'none'; connect-src 'self' wss://api.taskforge.app
```

### 5.4 CSRF

- Refresh token is in a `SameSite=Strict` cookie → immune to CSRF by browser policy
- Access token is sent in `Authorization` header → not auto-sent by browser in cross-site requests
- No state-changing action relies on cookies alone

---

## 6. Rate Limiting

Implemented with `express-rate-limit` backed by Redis (`rate-limit-redis`):

| Route | Window | Max Requests | Block Duration |
|---|---|---|---|
| `POST /auth/login` | 15 min | 10 per IP | 15 min |
| `POST /auth/register` | 1 hour | 5 per IP | 1 hour |
| `POST /auth/forgot-password` | 1 hour | 3 per email | 1 hour |
| `POST /auth/refresh-token` | 15 min | 20 per user | 15 min |
| `POST /auth/totp/verify` | 5 min | 5 per user | 30 min |
| All other API routes | 1 min | 200 per user | 1 min |
| File upload routes | 1 hour | 50 per user | 1 hour |

On limit breach: `429 Too Many Requests` with `Retry-After` header.

---

## 7. File Upload Security

- **File type validation**: MIME type checked with `file-type` library (magic bytes, not just extension)
- **Allowed types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`, `audio/mpeg`, `audio/wav`, `audio/ogg`, `application/pdf`, generic binary files
- **Size limit**: 50MB per file, enforced by Multer before reaching controller
- **Virus scanning**: ClamAV scan via `clamscan` npm package before Cloudinary upload (async, blocks upload if infected)
- Files uploaded to **Cloudinary with signed upload** (server-side signature, client never sees API key)
- Cloudinary URLs are **signed** with 6-hour expiry via Cloudinary's signed URL API
- Deleted attachments: `cloudinary.uploader.destroy()` called on DB record delete

---

## 8. Session Management

- All active sessions stored in `Session` table with: userId, refresh token hash, user agent, IP, expiry
- Users can view active sessions at `/settings` (shows device info, last seen, IP)
- Users can revoke any individual session
- "Log out all devices" revokes all sessions for the user
- Admin (future) can revoke all sessions for a user

### Session Expiry Events

| Event | Action |
|---|---|
| Password change | All sessions invalidated |
| Email changed | All sessions invalidated |
| Account deletion | All sessions invalidated, all data scheduled for deletion |
| 2FA enabled | All sessions invalidated (re-login required) |
| Refresh token reuse detected | All sessions invalidated immediately |

---

## 9. Secrets Management

- All secrets in `.env`, never committed to Git (`.gitignore` enforced, `.env.example` provided)
- In production: secrets injected via Railway / Render environment variable UI — never in Dockerfile or compose file
- GitHub Actions secrets used for deploy keys — not hardcoded in CI yaml
- Rotating secrets: `JWT_SECRET` rotation requires a coordinated deploy (all active access tokens invalidated); refresh token rotation is rolling

---

## 10. Logging and Audit

- **Structured logs** via Winston: JSON format in production, pretty in dev
- **Audit events** logged for: login, logout, password change, 2FA enable/disable, workspace invite, task delete, attachment delete, session revoke
- Logs include: `timestamp`, `userId`, `action`, `resourceId`, `ip`, `userAgent`
- Logs **never** contain: passwords, raw tokens, TOTP secrets, full request bodies
- Log retention: 30 days (file rotation in production)
- Failed auth attempts logged with IP for rate limit correlation

---

## 11. Dependency Security

- `npm audit` run in CI — build fails on critical vulnerabilities
- `dependabot` configured on GitHub for weekly dependency PRs
- Only well-maintained packages used; `npm install --save-exact` for security-sensitive deps (bcrypt, jsonwebtoken, speakeasy)
- No `eval`, no `Function()`, no `child_process.exec` with user input

---

## 12. Security Headers (Helmet.js)

```js
app.use(helmet({
  contentSecurityPolicy: { directives: { /* as above */ } },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```
