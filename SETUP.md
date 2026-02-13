# 🚀 Quick Setup Checklist

Follow these steps to get AeggPepp Workspace running:

## ✅ Step 1: Verify Installation

- [ ] Node.js v18.17+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Project dependencies installed (`npm install` if not done)

## ✅ Step 2: Setup Supabase

### Create Project
- [✅] Go to [supabase.com](https://supabase.com)
- [✅] Create a new project
- [✅] Wait for project to finish setting up (~2 minutes)

### Get Credentials
- [✅] Go to **Project Settings** → **API**
- [✅] Copy **Project URL**
- [✅] Copy **anon/public key**

### Configure .env.local
- [✅] Create `.env.local` file in project root
- [✅] Add credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Setup Database
- [✅] Go to **SQL Editor** in Supabase Dashboard
- [✅] Click **New query**
- [✅] Copy entire contents of `supabase-schema.sql`
- [✅] Paste and click **Run**
- [✅] Verify no errors (should see "Success. No rows returned")

### Setup Storage
- [✅] Go to **Storage** in Supabase Dashboard
- [✅] Click **New bucket**
- [✅] Name: `gallery`
- [✅] Set to **Public bucket**: ✅
- [✅] Click **Create bucket**

## ✅ Step 3: Run Development Server

```bash
npm run dev
```

- [✅] Server starts successfully
- [✅] Open [http://localhost:3000](http://localhost:3000)
- [✅] Homepage loads without errors

## ✅ Step 4: Test Authentication

### Register Flow
- [ ] Click sidebar should redirect to login (if auth is enabled in middleware)
- [ ] Go to [http://localhost:3000/register](http://localhost:3000/register)
- [ ] Select role (Aegg or Peppaa)
- [ ] Fill in form:
  - Display Name: Your name
  - Email: Valid email
  - Password: Minimum 6 characters
- [ ] Click **Create Account**
- [ ] Should redirect to dashboard

### Login Flow
- [ ] Go to [http://localhost:3000/login](http://localhost:3000/login)
- [ ] Enter credentials
- [ ] Click **Sign In**
- [ ] Should redirect to dashboard

### Logout
- [ ] (Feature coming soon)

## ✅ Step 5: Verify Features

- [ ] **Sidebar**: Shows all navigation items
- [ ] **Dashboard**: Displays welcome message and quick stats
- [ ] **Calendar**: Opens coming soon page
- [ ] **Goals**: Opens coming soon page
- [ ] **Gallery**: Opens coming soon page
- [ ] **Portfolio**: Opens coming soon page
- [ ] **Wishlist**: Opens coming soon page
- [ ] **Finance**: Opens coming soon page
- [ ] **Settings**: Opens coming soon page

## ✅ Step 6: Check for Errors

Open browser DevTools (F12):

- [ ] Console: No red errors
- [ ] Network: Check Supabase requests are successful
- [ ] Check TypeScript compilation in terminal (should have minimal warnings)

## 🐛 Troubleshooting

### "Cannot find module '@radix-ui/react-slot'"
```bash
npm install @radix-ui/react-slot
```

### "Supabase client error"
- Verify `.env.local` file exists
- Check credentials are correct
- Restart dev server

### "Database error when registering"
- Verify `supabase-schema.sql` was run successfully
- Check RLS policies are enabled
- Go to **Table Editor** and verify `profiles` table exists

### Build errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Try again
npm run dev
```

## 🎉 Success!

If all checkboxes are checked, your AeggPepp Workspace is ready!

**Next Steps:**
- Read `PROJECT_CONTEXT.md` for development roadmap
- Start building features (Phase 3+)
- Check `README.md` for detailed documentation

---

**Need help?** Check the troubleshooting section or review the setup files.
