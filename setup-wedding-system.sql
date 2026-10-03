-- =========================================================================
-- AeggPepp Workspace — Wedding Preparation Hub (Budget Rp 25 Juta)
-- Execute this script in Supabase SQL Editor
-- =========================================================================

-- Enable UUID extension if not already
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. WEDDING BUDGET ITEMS TABLE
-- =====================================================
create table if not exists wedding_budget_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  category text not null check (category in (
    'kua', 'venue', 'catering', 'attire_mua', 'documentation', 
    'ring', 'decor', 'invitation_souvenir', 'other'
  )),
  title text not null,
  estimated_cost decimal(12,2) default 0 not null,
  actual_cost decimal(12,2) default 0 not null,
  paid_amount decimal(12,2) default 0 not null,
  status text default 'planned' check (status in ('planned', 'booked_dp', 'paid_off')),
  due_date date,
  vendor_name text,
  vendor_contact text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table wedding_budget_items enable row level security;

drop policy if exists "Users can view all wedding budget items" on wedding_budget_items;
create policy "Users can view all wedding budget items" 
  on wedding_budget_items for select using ( true );

drop policy if exists "Users can insert wedding budget items" on wedding_budget_items;
create policy "Users can insert wedding budget items" 
  on wedding_budget_items for insert with check ( auth.uid() = user_id );

drop policy if exists "Users can update wedding budget items" on wedding_budget_items;
create policy "Users can update wedding budget items" 
  on wedding_budget_items for update using ( true );

drop policy if exists "Users can delete wedding budget items" on wedding_budget_items;
create policy "Users can delete wedding budget items" 
  on wedding_budget_items for delete using ( true );

-- =====================================================
-- 2. WEDDING GUESTS TABLE (Intimate 50-100 Pax)
-- =====================================================
create table if not exists wedding_guests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  group_type text default 'family_aegg' check (group_type in (
    'family_aegg', 'family_peppaa', 'friends_aegg', 'friends_peppaa', 'vip', 'other'
  )),
  pax integer default 1 not null check (pax > 0),
  rsvp_status text default 'pending' check (rsvp_status in ('pending', 'attending', 'declined')),
  phone text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table wedding_guests enable row level security;

drop policy if exists "Users can view all wedding guests" on wedding_guests;
create policy "Users can view all wedding guests" 
  on wedding_guests for select using ( true );

drop policy if exists "Users can insert wedding guests" on wedding_guests;
create policy "Users can insert wedding guests" 
  on wedding_guests for insert with check ( auth.uid() = user_id );

drop policy if exists "Users can update wedding guests" on wedding_guests;
create policy "Users can update wedding guests" 
  on wedding_guests for update using ( true );

drop policy if exists "Users can delete wedding guests" on wedding_guests;
create policy "Users can delete wedding guests" 
  on wedding_guests for delete using ( true );

-- =====================================================
-- 3. WEDDING RUNDOWN TABLE
-- =====================================================
create table if not exists wedding_rundown (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  time_start text not null,
  time_end text,
  title text not null,
  pic text,
  notes text,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table wedding_rundown enable row level security;

drop policy if exists "Users can view all wedding rundown" on wedding_rundown;
create policy "Users can view all wedding rundown" 
  on wedding_rundown for select using ( true );

drop policy if exists "Users can insert wedding rundown" on wedding_rundown;
create policy "Users can insert wedding rundown" 
  on wedding_rundown for insert with check ( auth.uid() = user_id );

drop policy if exists "Users can update wedding rundown" on wedding_rundown;
create policy "Users can update wedding rundown" 
  on wedding_rundown for update using ( true );

drop policy if exists "Users can delete wedding rundown" on wedding_rundown;
create policy "Users can delete wedding rundown" 
  on wedding_rundown for delete using ( true );

-- =====================================================
-- 4. INDEXES
-- =====================================================
create index if not exists idx_wedding_budget_user on wedding_budget_items(user_id);
create index if not exists idx_wedding_budget_category on wedding_budget_items(category);
create index if not exists idx_wedding_budget_status on wedding_budget_items(status);
create index if not exists idx_wedding_guests_user on wedding_guests(user_id);
create index if not exists idx_wedding_guests_group on wedding_guests(group_type);
create index if not exists idx_wedding_guests_rsvp on wedding_guests(rsvp_status);
create index if not exists idx_wedding_rundown_user on wedding_rundown(user_id);
create index if not exists idx_wedding_rundown_position on wedding_rundown(position);

-- Done!
