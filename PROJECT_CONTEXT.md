# AeggPepp Workspace - Project Context

> **Dokumen ini adalah referensi untuk AI Agent dalam melanjutkan development project ini.**

---

## 📋 Project Overview

| Item | Detail |
|------|--------|
| **Nama Project** | AeggPepp Workspace |
| **Tipe** | Progressive Web App (PWA) |
| **Tujuan** | Personal Couple Productivity Dashboard |
| **Target User** | Aegg (Male, Fullstack Engineer) & Peppaa (Female, PM Game Developer) |
| **Design Inspiration** | Notion-like workspace |
| **Created** | February 2026 |

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components (shadcn/ui style)
- **Animation**: Framer Motion
- **State Management**: Zustand
- **Icons**: Lucide React

### Backend
- **Platform**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (for photos)
- **Real-time**: Supabase Realtime

### Deployment
- **Frontend**: Vercel (Free Tier)
- **Backend**: Supabase Cloud (Free Tier)

---

## 🎨 Design System

### Color Scheme: Notion-style CSS Variables
```css
/* Light Mode */
:root {
  --background: 0 0% 100%;          /* Pure White */
  --foreground: 0 0% 20%;           /* Dark Grey Text */
  --card: 0 0% 100%;                /* White cards */
  --primary: 210 100% 50%;          /* Blue accent */
  --secondary: 0 0% 96%;            /* Light grey hovers */
  --muted-foreground: 0 0% 45%;     /* Muted text */
  --border: 0 0% 90%;               /* Light borders */
  --sidebar: 40 14% 96%;            /* Warm light grey sidebar */
  --sidebar-foreground: 0 0% 40%;   /* Sidebar text */
}

/* Dark Mode */
.dark {
  --background: 0 0% 10%;           /* #191919 */
  --foreground: 0 0% 83%;           /* #D4D4D4 */
  --card: 0 0% 12%;                 /* #1F1F1F */
  --primary: 210 100% 60%;          /* Brighter blue */
  --secondary: 0 0% 16%;            /* #292929 hovers */
  --muted-foreground: 0 0% 60%;     /* Muted text */
  --border: 0 0% 18%;               /* #2F2F2F */
  --sidebar: 0 0% 13%;              /* #202020 sidebar */
  --sidebar-foreground: 0 0% 61%;   /* #9B9B9B */
}
```

**Catatan Penting:**
- Semua styling menggunakan CSS variable via `hsl(var(--nama))` 
- JANGAN pakai hardcoded number-shade (e.g. `secondary-500`, `primary-700`)
- Gunakan semantic tokens: `text-foreground`, `text-muted-foreground`, `bg-secondary`, `bg-card`, dll.
- Sidebar punya variable terpisah: `sidebar`, `sidebar-foreground`, `sidebar-muted`, `sidebar-active`, `sidebar-hover`
- Dark mode otomatis via `next-themes` (class-based, `darkMode: ['class']`)

### Typography
- **Font**: Inter via `next/font/google` (CSS variable `--font-inter`)
- **Weights**: 300, 400, 500, 600, 700

### Design Principles
1. **Clean & Minimalist** - Notion-style whitespace
2. **Smooth Transitions** - 150-200ms animations
3. **Consistent Spacing** - 4px grid system
4. **Subtle Shadows** - Soft box-shadows
5. **Full Dark/Light Mode** - Semua komponen responsif ke theme

---

## 📁 Project Structure

```
aeggpepp-workspace/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── icon-192.png           # PWA icons
│   ├── icon-512.png
│   └── apple-touch-icon.png
│
├── src/
│   ├── app/
│   │   ├── globals.css        # ✅ Created - Global styles
│   │   ├── layout.tsx         # ✅ Created - Root layout
│   │   ├── page.tsx           # ⏳ TODO - Landing/redirect
│   │   │
│   │   ├── (auth)/            # Auth routes (no sidebar)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   └── (dashboard)/       # Main app routes (with sidebar)
│   │       ├── layout.tsx     # Dashboard layout with sidebar
│   │       ├── page.tsx       # Dashboard home
│   │       ├── calendar/
│   │       │   └── page.tsx
│   │       ├── goals/
│   │       │   └── page.tsx
│   │       ├── todos/
│   │       │   └── page.tsx   # ⏳ TODO - To be created
│   │       ├── gallery/
│   │       │   └── page.tsx
│   │       ├── portfolio/
│   │       │   └── page.tsx
│   │       ├── wishlist/
│   │       │   └── page.tsx
│   │       ├── finance/
│   │       │   └── page.tsx
│   │       └── settings/
│   │           └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── dropdown.tsx
│   │   │
│   │   ├── layout/            # Layout components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── mobile-nav.tsx
│   │   │
│   │   └── features/          # Feature-specific components
│   │       ├── calendar/
│   │       ├── goals/
│   │       ├── gallery/
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      # Browser client
│   │   │   ├── server.ts      # Server client
│   │   │   ├── index.ts       # Re-exports
│   │   │   └── middleware.ts  # Auth middleware (ENABLED)
│   │   ├── actions/           # Server actions
│   │   │   ├── auth.ts        # ✅ Login/signup/logout/getUser/inviteUser
│   │   │   ├── gallery.ts     # ✅ CRUD + file validation
│   │   │   ├── portfolio.ts   # ✅ CRUD
│   │   │   ├── wishlist.ts    # ✅ CRUD + partner purchase toggle
│   │   │   ├── finance.ts     # ✅ CRUD (dead analytics removed)
│   │   │   ├── calendar.ts    # ✅ CRUD + profiles join
│   │   │   ├── goals.ts       # ✅ CRUD + ownership checks
│   │   │   └── todos.ts       # ✅ CRUD
│   │   ├── holidays.ts       # ✅ Indonesian holidays 2025-2027
│   │   ├── utils.ts           # Utility functions (cn, formatCurrency, etc)
│   │   └── constants.ts       # App constants
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-user.ts
│   │   └── use-media-query.ts
│   │
│   ├── stores/                # Zustand stores
│   │   ├── auth-store.ts
│   │   └── sidebar-store.ts
│   │
│   └── types/                 # TypeScript types
│       ├── database.ts        # Supabase generated types
│       └── index.ts
│
├── package.json               # ✅ Created
├── tsconfig.json              # ✅ Created
├── tailwind.config.ts         # ✅ Created
├── postcss.config.js          # ✅ Created
├── next.config.js             # ✅ Created
├── .eslintrc.json             # ✅ Created
├── .env.local                 # ⏳ TODO - Environment variables
└── PROJECT_CONTEXT.md         # This file
```

---

## 🗄 Database Schema (Supabase)

### Tables

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member', -- 'aegg' | 'peppaa'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events (Calendar)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#0F766E',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals (Kanban Board)
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tag TEXT,
  status TEXT DEFAULT 'backlog', -- 'backlog' | 'in_progress' | 'completed' | 'archived'
  priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  position INTEGER DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Tasks (Subtasks)
CREATE TABLE goal_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0
);

-- Gallery
CREATE TABLE gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  taken_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio Links
CREATE TABLE portfolio_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'project' | 'social' | 'other'
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlist
CREATE TABLE wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price DECIMAL(12,2),
  currency TEXT DEFAULT 'IDR',
  url TEXT,
  image_url TEXT,
  priority TEXT DEFAULT 'medium',
  is_purchased BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance Transactions
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'income' | 'expense'
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance Budgets
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  period TEXT DEFAULT 'monthly', -- 'weekly' | 'monthly' | 'yearly'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Todos
CREATE TABLE todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  category TEXT, -- 'work' | 'personal' | 'shopping' | 'other'
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)
- Semua table harus enable RLS
- Policy: Users can only CRUD their own data
- Shared data (wishlist is_shared=true) visible to both users

---

## 🚀 Features Roadmap

### Phase 1: Foundation ✅ COMPLETED
- [x] Project setup (package.json, configs)
- [x] Tailwind config with custom colors
- [x] Global CSS styles
- [x] Root layout
- [x] Utility functions (cn, etc)
- [x] Supabase client setup
- [x] Notion-like sidebar component
- [x] Dashboard layout
- [x] UI components (Button, Input, Card)
- [x] Header component

### Phase 2: Authentication ✅ COMPLETED
- [x] Login page with email/password
- [x] Register page with role selection
- [x] Auth middleware
- [x] Auth server actions
- [x] Auth callback route
- [x] Profile management structure

### Phase 3: Dashboard Home
- [x] Welcome section
- [x] Activity feed (Mock)
- [x] Quick stats (Quick Access Cards)
- [ ] Recent items

### Phase 4: Calendar
- [x] Month/Week/Day views (Month View Done)
- [ ] Event CRUD
- [ ] Drag & drop
- [ ] Color coding

### Phase 5: Goals/Kanban
- [x] Board view with columns
- [ ] Card CRUD
- [ ] Drag & drop between columns
- [ ] Subtasks
- [ ] List view toggle

### Phase 6: Gallery ✅ COMPLETED
- [x] Photo grid/timeline (Grid & Timeline views)
- [x] Upload modal with drag & drop UI
- [x] Lightbox view with navigation
- [x] Date filtering (grouped by month)
- [x] Connect to Supabase Storage
- [x] Server actions for CRUD operations

### Phase 7: Portfolio & Wishlist ✅ COMPLETED
- [x] Link cards with preview (Portfolio)
- [x] Wishlist with prices & priority
- [x] Shared/personal toggle
- [x] Category & user filtering
- [x] Connect to Supabase DB
- [x] Server actions for CRUD operations

### Phase 8: Finance ✅ COMPLETED
- [x] Transaction list with filters
- [x] Category management with icons
- [x] Budget tracking with progress bars
- [x] Charts & analytics (spending breakdown, income vs expense)
- [x] Connect to Supabase DB
- [x] Server actions for CRUD operations

### Phase 9: Todos Feature ✅ COMPLETED
- [x] Database schema for todos
- [x] Sidebar navigation item
- [x] Todo list page with grouping
- [x] Add/Edit/Delete todos
- [x] Mark as complete
- [x] Priority & due date
- [x] Categories/tags

### Phase 10: Settings & Polish ✅ COMPLETED
- [x] Theme toggle (dark/light/system) with next-themes
- [x] Sidebar redesign (Notion-style with Lucide icons)
- [x] CSS variable-based theming (full dark/light support)
- [x] Profile settings (view/edit profile from Supabase)
- [x] Partner info card
- [x] Change password
- [x] Invite user / create partner account
- [x] Logout button
- [ ] PWA optimization
- [ ] Performance tuning

### Phase 11: Security & Auth Hardening ✅ COMPLETED
- [x] Enabled auth middleware (redirect unauthenticated users to /login)
- [x] Added `tag` column to goals table schema
- [x] Added ownership verification to `toggleGoalTask` and `deleteGoalTask` (prevent unauthorized access)

### Phase 12: Data Integrity Fixes ✅ COMPLETED
- [x] Fixed `WishlistItem` type: `user` → `profiles?: ItemOwner` (matches Supabase join)
- [x] Fixed wishlist user badge to use `item.profiles?.role` instead of broken `item.user`
- [x] Fixed `is_shared` checkbox: hidden input pattern for correct boolean form submission
- [x] Fixed finance "This month" totals: now filtered by current month (was all-time)
- [x] Fixed finance NaN on zero income: guarded savings rate calculation
- [x] Fixed budget spending: filtered by current month for monthly budgets
- [x] Fixed dashboard recent items sort: proper `rawDate` comparison (was `return 0` no-op)
- [x] Fixed dashboard event user attribution: uses profiles join instead of hardcoded 'aegg'
- [x] Added `profiles:user_id(display_name, role)` join to `getEvents()` in calendar.ts
- [x] Removed dead code: `getEventsByMonth()` from calendar.ts

### Phase 13: User Attribution ✅ COMPLETED
- [x] Fixed portfolio: removed hardcoded `user: 'aegg'`, uses `profiles` from DB join
- [x] Uncommented portfolio user badges, wired to `link.profiles?.role`
- [x] Made sidebar user profile dynamic: imports `getUser()`, shows actual user name/initial
- [x] Added mobile auto-close: sidebar closes on nav click when `window.innerWidth < 768`
- [x] Removed non-functional Search and Inbox buttons from sidebar
- [x] Fixed header: dynamic avatar initial via `getUser()`, removed fake notification badge
- [x] Removed non-functional search button from header
- [x] Fixed wishlist partner purchase toggle: allows toggling shared items regardless of owner
- [x] Updated wishlist RLS policy: `using (auth.uid() = user_id or is_shared = true)` for updates

### Phase 14: Feature Completeness ✅ COMPLETED
- [x] Gallery download: fetch + blob + programmatic `<a>` click
- [x] Gallery edit caption: inline editing in lightbox (click to edit, Enter to save, Escape to cancel)
- [x] Gallery file validation (client-side): type check + 10MB size limit
- [x] Gallery file validation (server-side): `file.type.startsWith('image/')` + 10MB check
- [x] Imported `updateGalleryItem` in gallery page (was unused)
- [x] Removed dead code: `getFinanceSummary()`, `getSpendingByCategory()` from finance.ts
- [x] Removed dead code: `getGoalsByStatus()` from goals.ts
- [x] Added Todos to dashboard Quick Access grid (5 items: Calendar, Todos, Goals, Gallery, Finance)

### Phase 15: Calendar Integration ✅ COMPLETED
- [x] Created `src/lib/holidays.ts` with Indonesian national & religious holidays (2025-2027)
- [x] Holidays include: Tahun Baru, Ramadhan, Idul Fitri, Nyepi, Waisak, Kemerdekaan, Natal, Maulid Nabi, etc.
- [x] Special dates: Valentine's Day, Kartini, Sumpah Pemuda, Pahlawan, Malam Tahun Baru
- [x] Holiday labels shown on calendar day cells (🏷️ with red text)
- [x] Holiday indicator dot (red) alongside events/todos/goals dots
- [x] Selected date detail panel shows holiday banners with type-specific styling:
  - 🇮🇩 National holidays → red banner
  - 🕌 Religious holidays → amber banner
  - 🌍 International → pink banner

### Phase 16: Mobile UX & Polish ✅ COMPLETED
- [x] Fixed hover-only action buttons on 7 pages (invisible on mobile touch devices):
  - todos/page.tsx: edit/delete buttons → `md:opacity-0 md:group-hover:opacity-100`
  - portfolio/page.tsx: link action buttons
  - goals/page.tsx: sub-task delete button
  - finance/page.tsx: transaction edit/delete buttons
  - gallery/page.tsx: photo overlay + caption + date (always visible on mobile)
  - calendar/page.tsx: event edit button in schedule items
  - page.tsx (dashboard): activity feed arrow icon
- [x] Font loading: switched from CSS `@import` to `next/font/google` (better performance, no FOUT)
- [x] Tailwind fontFamily uses CSS variable `var(--font-inter)` fallback chain

### Phase 17: Cleanup & Foundation ✅ COMPLETED
- [x] Deleted 7 unused SQL migration files (fix-database.sql, migration*.sql, setup-avatar-storage.sql)
- [x] Deleted auto-generated tsconfig.tsbuildinfo
- [x] Fixed .env.local.example security issue (removed real credentials, replaced with placeholders)
- [x] Created DEVELOPMENT-ROADMAP.md (grand development plan Phases 18-23)
- [x] Updated PROJECT_CONTEXT.md with current status

---

## 📝 Development Notes

### Environment Variables Required
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Current Status
- **Date**: September 13, 2026
- **Phase**: 17 (Cleanup & Foundation) - ✅ COMPLETED
- **Previous Phases**: Phases 1-17 ✅ ALL COMPLETED
- **Next Task**: Phase 18 — Telegram Bot + N8N Setup (see DEVELOPMENT-ROADMAP.md)
- **Dev Server**: Run `npm run dev` → `http://localhost:3000`
- **Roadmap**: See `DEVELOPMENT-ROADMAP.md` for Phases 18-23

**What's Working:**
- ✅ Next.js project fully configured
- ✅ Notion-style sidebar (dynamic user profile, Lucide icons, mobile auto-close)
- ✅ Authentication pages (Login & Register) with Supabase Auth
- ✅ **Auth middleware ENABLED** — unauthenticated users redirect to /login
- ✅ Dashboard Home (Quick Access with 5 features, activity feed with proper sorting)
- ✅ Calendar View (Monthly grid with **Indonesian holidays**, profiles join for user attribution)
- ✅ Goals Board (Kanban UI, subtasks with **ownership verification**)
- ✅ Todos Page (List view, filters, sorting, CRUD, completion toggle)
- ✅ Gallery Page (Grid/Timeline, Lightbox with **download + inline edit**, file validation client+server)
- ✅ Portfolio Page (Link cards, category/user filter, **dynamic user badges**)
- ✅ Wishlist Page (Price tracking, priority, **partner purchase toggle**, shared/private)
- ✅ Finance Page (**Monthly-filtered** totals, NaN-safe savings rate, budget period filtering)
- ✅ Settings Page (Profile edit, change password, partner info, invite user, logout)
- ✅ Theme System (next-themes, CSS variables, full dark/light mode)
- ✅ Font loading via `next/font/google` (no FOUT, better performance)
- ✅ Mobile-friendly: all hover-only actions now visible on touch devices
- ✅ Indonesian holidays 2025-2027 integrated into calendar
- ✅ All user mappings dynamic (no hardcoded 'aegg' strings)
- ✅ Dead code cleaned up (unused server actions removed)

**Security Improvements (Phase 11):**
- ✅ Auth middleware enabled (was fully commented out)
- ✅ Goal task operations verify ownership via parent goal join
- ✅ Wishlist RLS allows shared item updates by both users

**Data Integrity Fixes (Phase 12):**
- ✅ Finance totals filtered by current month (was all-time)
- ✅ Budget spending filtered by budget period
- ✅ Dashboard sort uses proper date comparison (was no-op `return 0`)
- ✅ WishlistItem type matches Supabase join structure

**Cleanup Done:**
- ✅ Removed `@fontsource/vt323` (unused Stardew Valley font)
- ✅ Removed `.font-pixel` CSS class
- ✅ Fixed `theme-provider.tsx` broken import
- ✅ Expanded `lucide-react.d.ts` to 100+ icon declarations
- ✅ Removed duplicate `fontFamily` in tailwind.config.ts
- ✅ Replaced all hardcoded bg-white → bg-card/bg-background
- ✅ Replaced all secondary-100/200/400/500/600/700/800/900 → semantic tokens
- ✅ Replaced all primary-50/100/300/600/700/900 → semantic tokens
- ✅ Removed dead server actions: `getEventsByMonth`, `getGoalsByStatus`, `getFinanceSummary`, `getSpendingByCategory`
- ✅ Removed non-functional UI: search button (header), search/inbox (sidebar), fake notification badge
- ✅ Switched font from `@import` to `next/font/google`

**Supabase Integration Status:**
- ✅ Supabase project & credentials configured
- ✅ Database schema created (all tables)
- ✅ Storage bucket `gallery` created
- ✅ Authentication flow working
- ✅ All pages connected to Supabase (Gallery, Portfolio, Wishlist, Finance, Calendar, Goals)
- ✅ Server Actions implemented for all CRUD operations
- ✅ Removed Database type generic from Supabase clients (fixes TypeScript errors)

**Auth Actions Available:**
- `login()` - Sign in with email/password
- `signup()` - Register new account
- `logout()` - Sign out
- `getUser()` - Get current user profile
- `inviteUser()` - Create partner account
- `updateProfile()` - Update display name & role
- `updatePassword()` - Change password
- `getPartnerProfile()` - Get partner's profile info

**Next Steps (see DEVELOPMENT-ROADMAP.md for full details):**
1. Phase 18: Telegram Bot + N8N Setup (receipt scanner via Telegram)
2. Phase 19: Receipt OCR Scanner (Gemini API + item parsing)
3. Phase 20: Financial Health Engine (spending score, alerts)
4. Phase 21: AI Financial Advisor (Gemini chat, spending insights)
5. Phase 22: Notifications & Alerts (weekly summary, budget warnings)
6. Phase 23: Goals Notion-like Overhaul (see GOALS-OVERHAUL-PLAN.md)
7. Future: PWA optimization, deploy to Vercel, real-time updates

---

## 🔗 Related Files

- **Master Capstone & Task Kiblat**: `CAPSTONE_TASKS.md` - **Kiblat utama pengembangan dari awal sampai akhir**
- **Development Roadmap**: `DEVELOPMENT-ROADMAP.md` - Grand development plan & background research (Phases 18-23)
- **Goals Overhaul Plan**: `GOALS-OVERHAUL-PLAN.md` - Notion-like goals system plan
- **Receipts System Schema**: `setup-receipts-system.sql` - Supabase DB migration for Telegram receipt scanner
- **Old Version (PHP)**: `D:\Peppakuu\Our Project\webb\` - Legacy PHP/MySQL version (reference only)

---

## 💡 AI Agent Instructions

Ketika melanjutkan project ini:

1. **BACA `CAPSTONE_TASKS.md` TERLEBIH DAHULU** sebagai kiblat checklist dan status terkini!
2. **Cek struktur folder** untuk melihat file yang sudah dibuat
3. **Lanjutkan dari fase yang berstatus `[ ]` di `CAPSTONE_TASKS.md`**
4. **Update checklist `[x]` di `CAPSTONE_TASKS.md`** setelah menyelesaikan task
5. **Jalankan `npx tsc --noEmit`** untuk memastikan tidak ada TypeScript error
6. **Lakukan Git Commit & Push** ke remote repo setiap kali ada pembaruan penting!
7. **Gunakan design system** yang sudah ditentukan (colors, typography)

### Code Style
- TypeScript strict mode
- Functional components dengan hooks
- Tailwind untuk styling (hindari inline styles)
- Nama file: kebab-case (contoh: `auth-store.ts`)
- Nama component: PascalCase (contoh: `Sidebar`)
- Nama function: camelCase (contoh: `getUserProfile`)

---

## 🆕 Todos Feature Specification

### UI Design
- **Layout**: Simple list view (not kanban)
- **Grouping**: Group by completion status (Active / Completed)
- **Filters**: Category, Priority, Due Date
- **Actions**: Add, Edit, Delete, Mark Complete/Incomplete

### Data Structure
```typescript
interface Todo {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  category: 'work' | 'personal' | 'shopping' | 'other' | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}
```

### Features
- Add new todo with title (required), description, priority, category, due date
- Click checkbox to mark complete/incomplete
- Edit todo inline or via modal
- Delete with confirmation
- Filter by: All / Active / Completed
- Filter by category
- Filter by priority
- Sort by: Created Date / Due Date / Priority

### Sidebar Icon
- Use `CheckSquare` from Lucide React
- Place in "Productivity" section after Goals

---

*Last Updated: September 13, 2026 (Session: Phase 17 — Cleanup & Foundation, Grand Development Roadmap)*
