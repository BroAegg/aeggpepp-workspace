# Goals Notion-like Overhaul — Plan

> **Status**: Planning  
> **Priority**: High  
> **Estimated Phases**: 4  
> **Ref**: User screenshots — Notion "KUMAGEMA HQ" project management (table view, side peek, sub-pages)

--- 

## 📋 Overview

Transform Goals dari Kanban board sederhana menjadi **Notion-like project management system** dengan:

1. **Table View** — Kolom: No, Title, Status, Priority, Tag, Due Date (sortable, clickable)
2. **Side Peek** — Klik row → panel slide-in dari kanan (bukan center modal)
3. **Sub-Pages** — Di dalam setiap Goal, bisa buat sub-pages (mirip page dalam page di Notion)
4. **Rich Text Editor** — Isi sub-page pakai block editor (heading, paragraph, list, checklist, dll)
5. **View Toggle** — Switch antara Table View dan Kanban View

---

## 🔧 Current State

### Database
- `goals` table: id, user_id, title, description, status, priority, position, due_date, tag, created_at
- `goal_tasks` table: id, goal_id, title, completed, position (simple checklist sub-tasks)

### UI
- Kanban board (3 columns: Backlog, In Progress, Completed)
- Center modal for add/edit (title, description, status, priority, tag, due_date, sub-tasks)
- Tags hardcoded: Dev, Design, Finance, Personal
- No drag-and-drop on goals (unlike todos)

### Types
- `Goal`, `GoalTask`, `GoalStatus`, `Priority` in `src/types/index.ts`

---

## 📦 Phase 1: Database & Types Foundation

### 1A. New Table: `goal_pages`
```sql
CREATE TABLE goal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  parent_page_id UUID REFERENCES goal_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  icon TEXT DEFAULT NULL,
  content JSONB DEFAULT '[]',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1B. Add columns to `goals`
```sql
ALTER TABLE goals ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS display_id SERIAL;
```

### 1C. RLS Policies for `goal_pages`
- SELECT: `USING (true)` — shared (same pattern as goals)
- INSERT/UPDATE/DELETE: check ownership via parent goal

### 1D. TypeScript Types
```ts
interface GoalPage {
  id: string
  goal_id: string
  parent_page_id: string | null
  title: string
  icon: string | null
  content: any[] // Block editor JSON
  position: number
  created_at: string
  updated_at: string
}

// Update Goal interface:
interface Goal {
  // ...existing fields
  icon: string | null      // NEW
  display_id: number        // NEW
  goal_pages?: GoalPage[]   // NEW
}
```

### Files to modify:
- [ ] `migration-goals-v2.sql` (create)
- [ ] `src/types/index.ts` (update Goal, add GoalPage)

---

## 📦 Phase 2: Server Actions & Rich Text Editor Setup

### 2A. Goal Pages Server Actions
New file: `src/lib/actions/goal-pages.ts`
- `getGoalPages(goalId)` — list sub-pages for a goal
- `getGoalPage(pageId)` — get single page with content
- `createGoalPage(goalId, title, icon?, parentPageId?)` — create page
- `updateGoalPage(pageId, { title?, icon?, content? })` — save
- `deleteGoalPage(pageId)` — delete

### 2B. Install Rich Text Editor
Using **Novel** (Notion-style editor by Steven Tey) or **@blocknote/react**:
- Novel: lightweight, Notion-like out of the box, built on Tiptap
- BlockNote: more features, heavier bundle
- **Decision**: Start with **Novel** for simplicity → `npm install novel`
- If Novel doesn't work, fallback to Tiptap core

### 2C. Update Goals Server Actions
- Update `getGoals()` to include goal_pages count
- Add `getGoalWithPages(goalId)` for side peek data

### Files to create/modify:
- [ ] `src/lib/actions/goal-pages.ts` (create)
- [ ] `src/lib/actions/goals.ts` (update getGoals to include page count)
- [ ] Install `novel` package

---

## 📦 Phase 3: UI Components

### 3A. View Toggle Component
- Kanban View (existing) vs Table View (new)
- Save preference in localStorage
- Toggle button in toolbar

### 3B. Table View Component
Reference dari Notion screenshot:
```
| No | 🎮 Title              | Status         | Priority | Tag  | Due Date    |
|----|------------------------|----------------|----------|------|-------------|
| 1  | 🃏 Joker's Rebellion   | ✅ Production    | Medium   | Dev  | Dec 1, 2024 |
| 2  | 🎮 AutoFarm            | 🟡 Pre-Prod    | High     | Dev  | Jul 1, 2025 |
```
- Sortable column headers (click to sort)
- Row click → open side peek
- Status badges with colors
- Hover effects on rows

### 3C. Side Peek Panel
- Slide-in from right (like Notion's side peek)
- Width: ~50% desktop, full on mobile
- Shows: goal title, icon, properties (status, priority, tag, due_date)
- Sub-tasks section (existing goal_tasks)
- Sub-pages list (new goal_pages with icons)
- Click sub-page → navigate into sub-page view

### 3D. Sub-Page View
- Full-page editor view when opening a sub-page
- Breadcrumb: Goals → Goal Title → Sub-page Title
- Rich text editor (Novel) for content
- Auto-save on content change (debounced)

### 3E. Rich Text Editor Component
- Wrapper around Novel editor
- Saves to `goal_pages.content` as JSON
- Supports: headings, paragraphs, lists, checklists, bold, italic, code
- Notion-like slash command menu (/)

### Files to create:
- [ ] `src/components/goals/table-view.tsx`
- [ ] `src/components/goals/side-peek.tsx`
- [ ] `src/components/goals/sub-page-editor.tsx`
- [ ] `src/components/goals/block-editor.tsx`

### Files to modify:
- [ ] `src/app/(dashboard)/goals/page.tsx` (major rewrite)
- [ ] `src/types/lucide-react.d.ts` (add icons: Table2, PanelRightOpen, Maximize2, etc.)

---

## 📦 Phase 4: Polish & Integration

### 4A. Kanban View Update
- Keep existing kanban but add goal icon display
- Show sub-pages count badge on cards
- Optional: Add drag-and-drop to goals kanban

### 4B. Tag System Enhancement
- Tags yang sekarang hardcoded (Dev, Design, Finance, Personal) → bisa tetap, atau kita buat dynamic seperti categories
- **Decision**: Tetap hardcoded untuk sekarang, nanti bisa di-upgrade

### 4C. Activity Logging
- Add `logActivity` calls for new actions:
  - `create_goal_page` — when creating a sub-page
  - `update_goal_page` — when saving a sub-page
  - `delete_goal_page` — when deleting a sub-page
- Update `src/lib/actions/activity.ts` ActivityAction type
- Update `src/lib/activity-helpers.ts` labels & icons

### 4D. Mobile Responsiveness
- Table view scrolls horizontally on mobile
- Side peek becomes full-screen modal on mobile
- Block editor touch-friendly

### Files to modify:
- [ ] `src/app/(dashboard)/goals/page.tsx` (finalize)
- [ ] `src/lib/actions/activity.ts` (add new action types)
- [ ] `src/lib/activity-helpers.ts` (add labels/icons)

---

## 🗂 Complete File Inventory

### New Files
| File | Purpose |
|------|---------|
| `migration-goals-v2.sql` | DB migration for goal_pages + goals columns |
| `src/lib/actions/goal-pages.ts` | Server actions for sub-pages CRUD |
| `src/components/goals/table-view.tsx` | Notion-like table view |
| `src/components/goals/side-peek.tsx` | Side panel for goal detail |
| `src/components/goals/sub-page-editor.tsx` | Sub-page editing view |
| `src/components/goals/block-editor.tsx` | Rich text editor wrapper |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/index.ts` | Add GoalPage, update Goal interface |
| `src/types/lucide-react.d.ts` | Add new icon declarations |
| `src/app/(dashboard)/goals/page.tsx` | Major rewrite: view toggle + table + side peek |
| `src/lib/actions/goals.ts` | Update queries for page counts |
| `src/lib/constants.ts` | Add goal status config if needed |
| `src/lib/actions/activity.ts` | Add new activity action types |
| `src/lib/activity-helpers.ts` | Add labels/icons for goal page actions |
| `package.json` | Add novel (or tiptap) dependency |

---

## ⚠️ Risks & Decisions

| Topic | Decision |
|-------|----------|
| **Rich text editor** | Novel first, Tiptap fallback |
| **Content storage** | JSONB in `goal_pages.content` |
| **Auto-save** | Debounced 1.5s after typing stops |
| **Tags** | Keep hardcoded for now |
| **Nested sub-pages** | Support 1 level deep initially (page → child page) |
| **Bundle size** | Dynamic import for editor to reduce initial load |
| **Kanban** | Keep existing, just add toggle |
| **Mobile side peek** | Full-screen sheet on mobile |

---

## 🚀 Implementation Order

```
Phase 1 → Phase 2 → Phase 3A+3B → Phase 3C → Phase 3D+3E → Phase 4
  DB        Actions    Table+Toggle  Side Peek   Editor       Polish
```

Each phase will be committed & pushed individually for incremental Vercel deploys.
