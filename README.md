# AeggPepp Workspace 💕

A **Personal Couple Productivity Dashboard** built with Next.js, TypeScript, Tailwind CSS, and Supabase.

> **For:** Aegg (Fullstack Engineer) & Peppaa (PM Game Developer)

---

## 🚀 Features

- **📅 Calendar**: Shared calendar with event management
- **🎯 Goals Board**: Kanban-style goal tracking with subtasks
- **📸 Gallery Timeline**: Photo memories with date metadata
- **💼 Portfolio Links**: Manage professional & social links
- **🎁 Wishlist**: Shared wishlist with purchase tracking
- **💰 Finance Manager**: Transaction tracking, budgets & analytics
- **⚙️ Settings**: Profile management & app preferences

---

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom (shadcn/ui style)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Real-time)
- **State**: Zustand
- **Animation**: Framer Motion
- **Icons**: Lucide React

---

## 📋 Prerequisites

- Node.js 18.17 or higher
- npm or yarn
- Supabase account ([supabase.com](https://supabase.com))

---

## 🏗 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Supabase

1. **Create a Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard)

2. **Get your credentials**:
   - Go to Project Settings → API
   - Copy `Project URL` and `anon/public key`

3. **Create `.env.local`** file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run the database setup**:
   - Go to SQL Editor in Supabase Dashboard
   - Copy and run the SQL schema from `PROJECT_CONTEXT.md` (Database Schema section)
   - Or create tables manually:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  role text default 'member',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- (Continue with other tables from PROJECT_CONTEXT.md)
```

5. **Setup Storage Buckets** (for Gallery):
   - Go to Storage in Supabase
   - Create a bucket named `gallery`
   - Set it to Public

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
aeggpepp-workspace/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Auth pages (login, register)
│   │   ├── (dashboard)/     # Main app pages
│   │   ├── auth/callback/   # Auth callback route
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── layout/          # Sidebar, Header
│   │   └── ui/              # Reusable UI components
│   ├── lib/
│   │   ├── actions/         # Server actions
│   │   ├── supabase/        # Supabase clients
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # Zustand stores
│   └── types/               # TypeScript types
├── public/                  # Static files
├── PROJECT_CONTEXT.md       # Project documentation for AI
└── README.md                # This file
```

---

## 🎨 Design System

### Colors (Professional/Modern Theme)

- **Primary (Teal)**: `#0F766E`
- **Secondary (Blue-gray)**: `#64748B`
- **Background**: `#FFFFFF`
- **Surface**: `#F8FAFC`
- **Border**: `#E2E8F0`

### Typography

- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

---

## 🔐 Authentication

The app uses Supabase Auth with email/password authentication.

### Default Users

When registering, users select their role:
- **Aegg** (Fullstack Engineer) 👨‍💻
- **Peppaa** (PM Game Developer) 👩‍💼

---

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Supabase Setup

Your Supabase project is already deployed and ready. Just ensure:
- Database tables are created
- RLS policies are enabled
- Storage buckets are configured

---

## 📝 Development Workflow

1. **Check `PROJECT_CONTEXT.md`** for current status
2. **Update TODO list** in code or context file
3. **Follow the roadmap** in PROJECT_CONTEXT.md
4. **Test locally** before deploying

### Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

---

## 🐛 Troubleshooting

### Supabase Connection Issues

- Verify `.env.local` has correct credentials
- Check Supabase project is active
- Ensure RLS policies are set correctly

### Build Errors

- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run build`

---

## 📖 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 💡 Future Enhancements

See `PROJECT_CONTEXT.md` for the complete roadmap.

**Coming Soon:**
- Dark mode theme
- Habit tracker
- Templates system
- PWA offline support
- Real-time collaboration
- Mobile app (React Native)

---

**Made with ❤️ for Aegg & Peppaa**

*Happy Valentine's Day 2026! 💐*
