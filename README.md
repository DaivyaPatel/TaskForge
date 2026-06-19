# TaskForge

TaskForge is a high-performance, real-time project and task management system. Built for speed and reliability, it features optimistic UI updates, persistent WebSocket connections for live collaboration, and a robust offline-first caching layer.

![TaskForge Dashboard](./docs/screenshot-dashboard.png) *(Placeholder: Add your screenshot here)*

## Core Features
* **Real-time Synchronization:** Socket.io driven state updates across all connected clients.
* **Optimistic Mutations:** Zero-latency UI updates using TanStack Query.
* **Offline Resilience:** Auto-pausing of mutations and visual network indicators when connection drops.
* **Smart Views:** Dynamic filtering for 'Today' and 'Upcoming' tasks.
* **Enterprise-grade Security:** Helmet.js hardened API, strict CORS, HTTP-only JWTs, and component-level React error boundaries.

## Tech Stack & Rationale

**Frontend:**
* **React 18 + Vite:** Fast HMR and optimized build outputs.
* **Zustand:** Unopinionated, boilerplate-free global state management for auth and sockets.
* **TanStack Query (React Query):** Handles data fetching, caching, synchronization, and optimistic updates.
* **Tailwind CSS:** Utility-first styling for rapid, consistent UI development without context switching.
* **React Hook Form + Zod:** Performant, uncontrolled form validation.

**Backend:**
* **Node.js + Express:** Lightweight, unopinionated server architecture.
* **Socket.io:** Reliable bi-directional communication with automatic fallback and reconnection logic.
* **Helmet.js:** Automated security headers (CSP, HSTS, noSniff).

## System Architecture

```text
CLIENT (Vite/React)                          SERVER (Node/Express)
+-----------------------+                    +-------------------------+
|                       |    HTTP REST       |                         |
|  +-----------------+  |  (JWT Auth)      |  +-------------------+  |
|  | TanStack Query  |<---------------------->| Express Router      |  |
|  | (Cache/Mutate)  |  |                    |  | (Controllers)     |  |
|  +-----------------+  |                    |  +-------------------+  |
|          ^            |                    |            |            |
|          |            |                    |            v            |
|  +-----------------+  |   WebSocket        |  +-------------------+  |
|  | Socket Listener |<======================>| Socket.io Server    |  |
|  | (Invalidations) |  |  (Live Updates)    |  | (Broadcasts)      |  |
|  +-----------------+  |                    |  +-------------------+  |
|                       |                    |                         |
+-----------------------+                    +-------------------------+