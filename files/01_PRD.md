# Product Requirements Document
## TaskForge — Hierarchical Task Management Platform
**Version:** 1.0  
**Author:** Daivya  
**Status:** Planning  
**Last Updated:** June 2026

---

## 1. Overview

### 1.1 Product Summary

TaskForge is a full-stack, real-time task management web application designed for individuals and small teams who need more than a flat to-do list. It supports deeply nested task hierarchies (tasks inside sections inside sections), rich media attachments (images, audio, video, links, files), strong authentication, and real-time sync across devices.

The product is built to demonstrate full-stack engineering competency — React frontend, Node.js + Express backend, PostgreSQL database, WebSocket-based real-time sync, JWT + session-based auth, and Docker-based deployment.

### 1.2 Problem Statement

Existing to-do apps (Todoist, Notion-lite, TickTick) either lack deep nesting, have poor media support, or are over-engineered for simple use cases. There is a gap for a clean, hierarchical task manager that:
- Supports unlimited nesting of sections and tasks
- Allows any type of content inside a task (not just text)
- Has real-time sync without a refresh
- Has secure, production-grade auth baked in from day one

### 1.3 Target Users

- Students managing complex coursework, project pipelines, or research
- Developers organizing technical work, sprints, and documentation tasks
- Freelancers tracking client deliverables in structured sub-categories
- Internship reviewers evaluating full-stack engineering capability

### 1.4 Success Metrics

| Metric | Target |
|---|---|
| User auth round-trip (register → dashboard) | < 3 seconds |
| Task create/update latency | < 500ms including real-time broadcast |
| Nest depth supported | ≥ 6 levels |
| Media types supported | 6 (text, image, video, audio, link, file) |
| Mobile responsiveness | Fully functional on 375px viewport |
| Time to first meaningful paint | < 1.5 seconds |

---

## 2. Goals and Non-Goals

### 2.1 Goals

- Build a secure, JWT + refresh-token based authentication system with email verification
- Implement infinitely nestable section/task hierarchy
- Support rich media attachments within individual tasks
- Enable real-time sync across open tabs/devices using WebSockets
- Allow hyperlinking between tasks and sections within the same workspace
- Provide priority levels, due dates, tags, and task status management
- Support drag-and-drop reordering of tasks and sections
- Allow collaborative sharing of workspaces (read/write permissions)
- Deliver a production deployment on a cloud provider

### 2.2 Non-Goals (v1.0)

- Mobile native apps (React web is mobile-responsive, but no React Native)
- AI task suggestions or natural language processing
- Calendar integrations (Google Calendar, Outlook)
- Billing or subscription tiers
- Offline-first with full local persistence (basic offline indicator is fine)
- Public task boards visible without login

---

## 3. User Stories

### Authentication
- As a new user, I can register with email + password, and receive an email verification link.
- As a returning user, I can log in and receive a JWT access token + refresh token.
- As a user, I can log out and have my session invalidated server-side.
- As a user, I can reset my password via a one-time email link.
- As a user, I can see all active sessions and revoke specific ones.
- As a user, I can enable two-factor authentication (TOTP-based).

### Workspaces
- As a user, I can create multiple named workspaces (e.g., "College," "Internship," "Personal").
- As a user, I can invite other users to a workspace with view-only or edit access.
- As a user, I can leave or delete a workspace.

### Sections and Tasks
- As a user, I can create a top-level section inside a workspace.
- As a user, I can create a sub-section inside any section, to any depth.
- As a user, I can create tasks inside any section.
- As a user, I can collapse/expand any section.
- As a user, I can drag-and-drop tasks or sections to reorder or re-parent them.
- As a user, I can set a task's status: To Do, In Progress, Blocked, Done.
- As a user, I can set a priority on a task: Critical, High, Medium, Low.
- As a user, I can assign a due date and optional reminder to a task.
- As a user, I can add tags to tasks for cross-workspace filtering.
- As a user, I can mark a task as recurring (daily/weekly/monthly).
- As a user, I can archive completed tasks without deleting them.
- As a user, I can permanently delete any task or section.

### Rich Content
- As a user, I can add rich text (bold, italic, code, headings, lists) to any task body.
- As a user, I can attach images to a task (upload or paste from clipboard).
- As a user, I can attach audio recordings or audio files to a task.
- As a user, I can embed video links (YouTube, local file) in a task.
- As a user, I can attach arbitrary files (PDF, ZIP, etc.) with size limits enforced.
- As a user, I can add URL links with automatic preview metadata (title, favicon, description).

### Hyperlinking
- As a user, I can create an internal link from one task/section to another within any workspace I have access to.
- As a user, clicking an internal link navigates the app to the linked item and expands the path to it.
- As a user, I can see a "referenced by" list on any task that shows what links to it.

### Real-time
- As a user, if another user in the same workspace makes a change, I see it reflected in my view within 1 second, without refreshing.
- As a user, I see a live indicator of who else is currently viewing the same section.

### Search and Filter
- As a user, I can search tasks globally across all workspaces by keyword.
- As a user, I can filter by tag, status, priority, due date range, or assignee.
- As a user, I can view a "Today" smart view showing all tasks due today across workspaces.
- As a user, I can view an "Upcoming" view showing tasks due in the next 7 days.

### Notifications
- As a user, I receive in-app notifications for: task assigned to me, comment added, due date reminder.
- As a user, I can toggle notification preferences per workspace.

---

## 4. Feature Priority

| Feature | Priority | Milestone |
|---|---|---|
| Auth (register, login, logout, JWT) | P0 | M1 |
| Workspace CRUD | P0 | M1 |
| Section and Task hierarchy | P0 | M2 |
| Real-time sync (WebSockets) | P0 | M3 |
| Rich text task body | P0 | M2 |
| Media attachments | P1 | M4 |
| Internal hyperlinking | P1 | M4 |
| Drag-and-drop reorder | P1 | M3 |
| Tags and filtering | P1 | M3 |
| Search | P1 | M5 |
| Password reset + email verify | P1 | M1 |
| 2FA (TOTP) | P1 | M5 |
| Collaborative sharing | P1 | M5 |
| Smart views (Today, Upcoming) | P2 | M5 |
| Recurring tasks | P2 | M6 |
| Session management UI | P2 | M5 |
| In-app notifications | P2 | M6 |
| Archive | P2 | M6 |
| Deployment (Docker + cloud) | P0 | M7 |

---

## 5. Constraints

- **Tech stack (fixed):** React (frontend), Node.js + Express (backend), PostgreSQL (primary DB), Redis (sessions + pub/sub), Socket.io (real-time)
- **Auth standard:** JWT (access + refresh token pattern), bcrypt password hashing, HTTPS-only cookies for refresh token
- **File storage:** Cloudinary or AWS S3 (environment-configurable)
- **Deployment:** Docker Compose for local, Railway or Render for production
- **Browser support:** Latest Chrome, Firefox, Safari, Edge
- **Max file size per attachment:** 50MB
- **Max nesting depth:** Enforced at 10 levels in UI, unlimited in DB schema

---

## 6. Milestones

| Milestone | Scope | Est. Duration |
|---|---|---|
| M1 | Auth, user model, JWT, email verify, password reset | 1 week |
| M2 | Workspace, Section, Task CRUD + hierarchy | 1 week |
| M3 | Real-time sync, drag-and-drop, tags + filters | 1 week |
| M4 | Rich text, media attachments, internal linking | 1 week |
| M5 | Search, 2FA, session management, sharing, smart views | 1 week |
| M6 | Notifications, recurring tasks, archive | 1 week |
| M7 | Docker, CI, deployment, final polish | 1 week |

---

## 7. Out of Scope References

The following are noted here for completeness but will not be built in v1.0:
- Gantt chart or timeline views
- Markdown export of workspaces
- GitHub/Jira integrations
- Public embeddable task widgets
