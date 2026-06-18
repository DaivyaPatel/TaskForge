# Frontend Specification Document
## TaskForge — Hierarchical Task Management Platform
**Version:** 1.0  
**Author:** Daivya  
**Status:** Planning  
**Last Updated:** June 2026

---

## 1. Design Philosophy

TaskForge's visual identity is built on one principle: **density without noise**.

Most productivity tools are either sterile (Notion's all-white blankness) or chaotic (ClickUp's feature wall). TaskForge occupies a third position — a workspace that feels like a well-organized physical desk: dark, tactile, structured, with clear hierarchy in every layer.

The design takes its visual language from **technical drafting and terminal UIs** — monospaced accents, ruled separators, numbered depth indicators — but delivers it with modern spacing and motion. It should feel like a tool built by an engineer who also cares about visual craft.

**Signature element:** Section nesting is shown through a **left-rail depth system** — each level of nesting adds a thin colored vertical rail on the left edge of the block, using the workspace accent color with decreasing opacity. This replaces traditional indentation and makes structure visible at a glance without taking horizontal space.

---

## 2. Design Tokens

### 2.1 Color System

```css
:root {
  /* Backgrounds — layered dark surfaces */
  --bg-base:        #0e0f11;   /* App shell background */
  --bg-surface:     #141519;   /* Cards, panels */
  --bg-elevated:    #1c1e24;   /* Modals, dropdowns, task detail */
  --bg-hover:       #22252d;   /* Hover state for rows */
  --bg-selected:    #1f2d40;   /* Selected item */

  /* Borders */
  --border-subtle:  #1f2229;   /* Very quiet dividers */
  --border-default: #2a2d38;   /* Standard borders */
  --border-strong:  #3d4150;   /* Focused, active, emphasis */

  /* Text */
  --text-primary:   #e8eaf0;   /* Main readable text */
  --text-secondary: #8b909e;   /* Labels, timestamps, metadata */
  --text-muted:     #4e5262;   /* Disabled, placeholder */
  --text-inverse:   #0e0f11;   /* Text on accent backgrounds */

  /* Accent — electric blue, distinct from generic teal */
  --accent:         #4a8fff;   /* Primary interactive color */
  --accent-hover:   #6ba3ff;
  --accent-subtle:  rgba(74, 143, 255, 0.12);
  --accent-glow:    rgba(74, 143, 255, 0.25);

  /* Semantic */
  --status-todo:     #4e5262;
  --status-progress: #4a8fff;
  --status-blocked:  #e05c5c;
  --status-done:     #3dba7e;

  --priority-critical: #e05c5c;
  --priority-high:     #e08c3d;
  --priority-medium:   #4a8fff;
  --priority-low:      #4e5262;

  /* Depth rails — workspace accent with stepped opacity */
  --rail-depth-1:  rgba(var(--workspace-accent-rgb), 0.80);
  --rail-depth-2:  rgba(var(--workspace-accent-rgb), 0.55);
  --rail-depth-3:  rgba(var(--workspace-accent-rgb), 0.38);
  --rail-depth-4:  rgba(var(--workspace-accent-rgb), 0.24);
  --rail-depth-5:  rgba(var(--workspace-accent-rgb), 0.15);
  /* depths 6+ use --rail-depth-5 */
}
```

Each workspace has an `accent color` (user-chosen). It is stored as hex, converted to RGB on workspace load, and set as `--workspace-accent-rgb` on the workspace root element. This powers the depth rail system.

### 2.2 Typography

```css
:root {
  /* Display / headings — geometric grotesque with personality */
  --font-display: 'DM Sans', system-ui, sans-serif;
  /* Body — comfortable, slightly condensed at small sizes */
  --font-body:    'Inter', system-ui, sans-serif;
  /* Mono — for code, IDs, metadata, keyboard shortcuts */
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  /* Type scale */
  --text-xs:   11px;   /* timestamps, depth labels */
  --text-sm:   13px;   /* metadata, tags, secondary labels */
  --text-base: 15px;   /* body text, task titles */
  --text-md:   17px;   /* section titles */
  --text-lg:   21px;   /* workspace name in sidebar */
  --text-xl:   27px;   /* page headings */
  --text-2xl:  34px;   /* auth page headings */

  --weight-normal:   400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;

  --leading-tight:   1.2;
  --leading-normal:  1.5;
  --leading-relaxed: 1.7;

  --tracking-tight: -0.02em;  /* display headings */
  --tracking-mono:   0.04em;  /* monospaced labels */
}
```

Font loading strategy: preload `Inter` and `DM Sans` subsets via `<link rel="preload">`. `JetBrains Mono` loaded async.

### 2.3 Spacing Scale

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### 2.4 Radii and Shadows

```css
:root {
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
  --shadow-modal: 0 8px 40px rgba(0,0,0,0.7);
  --shadow-glow: 0 0 0 3px var(--accent-glow);
}
```

---

## 3. Layout Structure

### 3.1 App Shell

```
┌────────────────────────────────────────────────────────────┐
│  TopBar (48px)  [logo] [search trigger] [notif] [avatar]   │
├──────────────┬─────────────────────────────────────────────┤
│              │                                             │
│  Sidebar     │          Main Content Area                  │
│  (240px)     │          (flex, scroll)                     │
│              │                                             │
│  Workspaces  │                                             │
│  Smart views │                                             │
│  ─────────── │                                             │
│  Settings    │                                             │
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

- Sidebar collapses to 56px icon rail on narrow screens
- On mobile (< 768px): sidebar becomes a slide-in drawer from the left; TopBar shows hamburger icon
- Main area has max-width 900px centered on wide screens (keeps reading width comfortable)
- No horizontal scroll on any viewport

### 3.2 Sidebar

```
TaskForge                           [+] New workspace

  ◆ WORKSPACES
    ● College            [unseen dot if unread activity]
    ● Internship
    ● Personal
    [+ New workspace]

  ◆ SMART VIEWS
    ⊡ Today              [3]
    ⊡ Upcoming           [12]
    ⊡ Inbox

  ──────────────────────
  [avatar] Daivya         Settings
```

- Workspace items show the workspace accent color as a 3px left border
- Active item: `--bg-selected` background, full-width
- Unread indicator: 6px dot in accent color, top-right of workspace name

### 3.3 Workspace View — Section Hierarchy

The core visual system. Each section is a block:

```
┌─ [rail] ────────────────────────────────────────────── ─ ─ ┐
│          ▼  Section Title                    [+task] [⋯]   │
│                                                             │
│  ┌─ [rail] ─────────────────────────────────────── ─ ─ ─┐  │
│  │       ▼  Sub-section                    [+task] [⋯]  │  │
│  │                                                       │  │
│  │  [ ] Task title                    [tag] [due] [pri] │  │
│  │  [✓] Completed task (strikethrough, muted)           │  │
│  │  [ ] Another task                                    │  │
│  │  [+ Add task]                                        │  │
│  └───────────────────────────────────────────────────── ┘  │
│                                                             │
│  [ ] Top-level task in parent section                       │
│  [+ Add task]                                               │
└─────────────────────────────────────────────────────────── ┘
```

- Left rail is 2px wide, positioned absolutely on the left edge of the section block
- Rail color: `--rail-depth-N` where N = depth level
- Section header: depth 1 uses `--text-md` semibold; deeper levels use `--text-base` medium
- Collapsed sections show a `▶` caret, expanded show `▼` — animated with 150ms ease

### 3.4 Task Row

```
[checkbox] Task title text                    [tags] [🗓 due] [● priority]
```

- Checkbox: custom-styled circle, filled with `--status-done` green on complete
- Title: `--text-base`, `--text-primary`
- On hover: `--bg-hover` background, reveal `[⋯]` menu on right edge
- Completed: title gets `text-decoration: line-through`, `--text-muted` color
- Click on title → opens Task Detail panel (slide in from right on desktop, full page on mobile)
- Tags: pill badges with `--bg-elevated` background, `--text-secondary` text, `--border-default` border
- Due date: monospaced `--font-mono`, `--text-sm`; turns `--priority-critical` red if overdue

---

## 4. Component Specifications

### 4.1 Task Detail Panel

Opens as a right-side panel (480px wide) on desktop, full-screen on mobile.

```
┌─────────────────────────────────────────────────────────┐
│  [←  Back to Section Name]                    [⋯] [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ☐  Task Title (editable, large)                        │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Status   [▼ In Progress]     Priority  [▼ High]        │
│  Due Date  [🗓 Jun 20, 2026]  Assignee  [avatar]        │
│  Tags      [react] [backend] [+ add tag]                │
│  Section   College › Internship Prep › Tasks            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  DESCRIPTION                                            │
│  [Tiptap rich text editor — full toolbar]               │
│  Bold / Italic / Code / H1 H2 / List / Link             │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ATTACHMENTS                                            │
│  [img preview] [audio player] [link card] [+ Add]       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  LINKED TASKS                                           │
│  → College › Exams › DSA Practice (links to)            │
│  ← Referenced by: Internship › Project Plan             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Section Header

- Rendered as: `[caret] [section title] ─────────────── [add task btn] [section menu]`
- Thin horizontal rule fills the space after the title
- Hover reveals: rename (inline), add sub-section, delete, copy link
- `[+ Add task]` is a ghost button that becomes a task creation row inline

### 4.3 Inline Task Creation

Clicking `[+ Add task]` turns into:

```
[ ] [text input: "Task name..."]               [↵ Enter to save]
```

- Enter → save, create another
- Escape → cancel
- Tab → save, open Task Detail for metadata

### 4.4 Search Modal

Triggered by `⌘K` / `Ctrl+K` or clicking the TopBar search area. Full-screen overlay:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  🔍  [search input — autofocused]              [⎋ Esc]  │
│  ─────────────────────────────────────────────────────── │
│  FILTERS                                                 │
│  [All] [In Progress] [Blocked] [Done]   [🗓 Due Today]   │
│  ─────────────────────────────────────────────────────── │
│  RESULTS                                                 │
│  ● [workspace accent] College                           │
│     DSA Practice Task            [⊡ College › Exams]    │
│     Data Structures Notes        [⊡ College › Notes]    │
│  ● [workspace accent] Internship                        │
│     ELF Binary Analyzer PRD      [⊡ Internship › Docs]  │
│                                                         │
└──────────────────────────────────────────────────────────┘
```

- Results grouped by workspace with accent color indicator
- Arrow keys navigate, Enter opens task, `⌘+Enter` opens in new panel
- Recent searches shown when input is empty

### 4.5 Media Attachments

Each attachment type renders distinctly:

**Image:** Thumbnail grid (3-wide), click to lightbox. On hover: filename overlay.  
**Audio:** Waveform-style player using Web Audio API — custom minimal player, not browser default.  
**Video:** Inline player with custom controls if local file; YouTube embed if URL.  
**Link:** Card preview with favicon, title, description, domain badge. Scraped server-side via Open Graph.  
**File:** Row with file icon, filename, size, download button.

Upload widget: drag-drop zone + click-to-browse. Shows upload progress bar per file.

### 4.6 Internal Link Picker

Triggered in Tiptap by typing `@` or clicking the link toolbar button and choosing "Link to task":

```
┌──────────────────────────────────────────┐
│  🔗 Link to task or section              │
│  [search: "DSA prac..."]                 │
│  ─────────────────────────────────────── │
│  ⊡ DSA Practice          College › Exams│
│  ⊡ DSA Revision          College › Notes│
└──────────────────────────────────────────┘
```

Selecting an item inserts a custom Tiptap node that renders as a styled chip. Clicking navigates to the linked item.

### 4.7 Presence Indicators

When multiple users view the same workspace, their avatars appear in the TopBar:

```
  [D] [A] [+2]   ← stacked avatars, tooltips on hover
```

Within a section, a thin accent-colored line on the right edge of a task shows which task another user has open.

### 4.8 Notification Panel

Triggered by the bell icon in TopBar. Dropdown list (not a full page):

```
┌─────────────────────────────────────────────────┐
│  NOTIFICATIONS                   [Mark all read] │
│  ─────────────────────────────────────────────── │
│  ● Arjun assigned "Review PR" to you   2m ago    │
│  ● Due date: "Submit Report" — today   1h ago    │
│  ○ Dhruv joined Internship workspace   1d ago    │
└─────────────────────────────────────────────────┘
```

Unread shown with filled dot and slightly brighter background.

---

## 5. Motion and Animation

Animations are purposeful, fast, and never loop or distract.

| Interaction | Animation | Duration |
|---|---|---|
| Section expand/collapse | Height + opacity, ease-out | 150ms |
| Task row hover | Background color | 80ms |
| Task detail panel open | Slide in from right (translateX) | 200ms ease-out |
| Search modal open | Fade in + scale from 0.97 | 150ms |
| Drag-and-drop | DnD-kit's built-in smooth snap | — |
| Notification badge appear | Scale from 0, ease-spring | 200ms |
| Depth rail on new nested section | Width from 0 | 120ms |
| Checkbox complete | Circle fill + strikethrough | 250ms |

All animations respect `prefers-reduced-motion: reduce` — when set, all transitions are instant.

---

## 6. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| > 1200px | Sidebar pinned, task detail panel as side panel |
| 768–1200px | Sidebar pinned (narrower, 200px), task detail panel full-width |
| < 768px | Sidebar as drawer, task detail as full page, simplified TopBar |
| < 480px | Single-column everything, tap targets min 44px |

Touch interactions:
- Swipe right on a task row to complete it
- Swipe left to reveal delete/archive options
- Long press to initiate drag-and-drop (mobile)

---

## 7. State Management

### Zustand Stores

**authStore**
```js
{
  user: null | { id, email, displayName, avatarUrl, totpEnabled },
  accessToken: null | string,
  isAuthenticated: boolean,
  setAuth(user, token),
  clearAuth()
}
```

**uiStore**
```js
{
  sidebarOpen: boolean,
  activeSectionId: null | string,
  taskDetailId: null | string,
  searchOpen: boolean,
  collapsedSections: Set<string>,   // persisted to localStorage
  toggleSidebar(),
  openTaskDetail(id),
  closeTaskDetail(),
  toggleSection(id)
}
```

**socketStore**
```js
{
  socket: null | Socket,
  connected: boolean,
  activeUsers: Map<workspaceId, User[]>,
  initSocket(token),
  destroySocket()
}
```

### TanStack Query Keys

```js
['workspaces']
['workspace', workspaceId]
['sections', workspaceId]
['tasks', sectionId]
['task', taskId]
['attachments', taskId]
['notifications']
['search', query, filters]
```

Mutations use `onMutate` for optimistic updates, `onError` to roll back, `onSettled` to refetch.

---

## 8. Accessibility

- All interactive elements have keyboard focus styles (2px `--accent` outline, 2px offset)
- Tiptap editor is keyboard navigable
- Drag-and-drop has a keyboard alternative: up/down arrow keys to reorder within a section when a task is in "keyboard mode" (toggle with `Space`)
- Color is never the sole carrier of information (status has both color + text label)
- ARIA roles on custom components: `role="tree"` on section hierarchy, `role="treeitem"` on each section, `aria-expanded` on collapsible sections
- Screen reader announcements for: task status change, real-time updates, notifications

---

## 9. Auth Pages Design

Auth pages sit outside the AppShell — full-screen split layout:

```
┌────────────────────────┬───────────────────────────────────┐
│                        │                                   │
│  Left panel (40%)      │  Right panel (60%)                │
│  --bg-surface          │  --bg-base                        │
│                        │                                   │
│  TaskForge             │  [form area]                      │
│  ─────────────────     │                                   │
│  "The workspace        │                                   │
│  your tasks            │                                   │
│  deserve."             │                                   │
│                        │                                   │
│  [animated depth       │                                   │
│   rail illustration]   │                                   │
│                        │                                   │
└────────────────────────┴───────────────────────────────────┘
```

The left panel shows an animated preview of the depth-rail system — a few nested sections appearing one by one in a loop, showing the product's key visual. On mobile: left panel hidden, full-screen form.

---

## 10. Error States and Empty States

**Empty workspace (no sections yet):**
```
  ────────────────────────────────────
  No sections yet.
  Create a section to start organizing.
  [+ Create first section]
  ────────────────────────────────────
```

**Empty section (no tasks):**
Small `[+ Add task]` link, no illustration (keeps it quiet).

**Network error / API fail:**
Toast notification bottom-left: `⚠ Couldn't save — retrying...`
On persistent failure: task edit queued locally, retry on reconnect.

**404 (task/section deleted by another user):**
`This item no longer exists.` with a back button.

**Offline indicator:**
Thin banner across top: `● Offline — changes will sync when reconnected` in `--priority-critical` red.

---

## 11. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open search |
| `N` | New task (when section focused) |
| `E` | Edit selected task |
| `⌫` / `Delete` | Delete selected task (with confirm) |
| `Space` | Toggle task completion |
| `Esc` | Close panel / modal |
| `⌘↵` | Save and open task detail |
| `↑ / ↓` | Navigate task list |
| `Tab` | Indent task (nest) |
| `Shift+Tab` | Outdent task |
| `⌘/` | Show keyboard shortcuts |

Shortcuts displayed in a modal triggered by `⌘/`, listing all available shortcuts grouped by context.
