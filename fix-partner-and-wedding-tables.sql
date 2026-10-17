-- =========================================================================
-- AeggPepp Workspace — Couple Collaboration & Wedding System Setup
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/isgefvbsvzllqfmxelod/sql
-- =========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. WEDDING TABLES (Budget, Guests, Rundown)
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

-- =====================================================
-- 2. STORAGE BUCKET FOR RECEIPTS (Struk Belanja & Nota)
-- =====================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = true;

-- Storage policies for receipts
drop policy if exists "Receipts are publicly accessible" on storage.objects;
create policy "Receipts are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'receipts' );

drop policy if exists "Authenticated users can upload receipts" on storage.objects;
create policy "Authenticated users can upload receipts"
  on storage.objects for insert
  with check ( bucket_id = 'receipts' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can update receipts" on storage.objects;
create policy "Authenticated users can update receipts"
  on storage.objects for update
  using ( bucket_id = 'receipts' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can delete receipts" on storage.objects;
create policy "Authenticated users can delete receipts"
  on storage.objects for delete
  using ( bucket_id = 'receipts' and auth.role() = 'authenticated' );

-- =====================================================
-- 3. COUPLE COLLABORATION RLS POLICIES
-- Both Aegg & Peppaa have full mutual access to workspace data
-- =====================================================

-- Wedding Budget Items
alter table wedding_budget_items enable row level security;
drop policy if exists "Users can view all wedding budget items" on wedding_budget_items;
create policy "Users can view all wedding budget items" on wedding_budget_items for select using (true);
drop policy if exists "Users can insert wedding budget items" on wedding_budget_items;
create policy "Users can insert wedding budget items" on wedding_budget_items for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update wedding budget items" on wedding_budget_items;
create policy "Users can update wedding budget items" on wedding_budget_items for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete wedding budget items" on wedding_budget_items;
create policy "Users can delete wedding budget items" on wedding_budget_items for delete using (auth.role() = 'authenticated');

-- Wedding Guests
alter table wedding_guests enable row level security;
drop policy if exists "Users can view all wedding guests" on wedding_guests;
create policy "Users can view all wedding guests" on wedding_guests for select using (true);
drop policy if exists "Users can insert wedding guests" on wedding_guests;
create policy "Users can insert wedding guests" on wedding_guests for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update wedding guests" on wedding_guests;
create policy "Users can update wedding guests" on wedding_guests for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete wedding guests" on wedding_guests;
create policy "Users can delete wedding guests" on wedding_guests for delete using (auth.role() = 'authenticated');

-- Wedding Rundown
alter table wedding_rundown enable row level security;
drop policy if exists "Users can view all wedding rundown" on wedding_rundown;
create policy "Users can view all wedding rundown" on wedding_rundown for select using (true);
drop policy if exists "Users can insert wedding rundown" on wedding_rundown;
create policy "Users can insert wedding rundown" on wedding_rundown for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update wedding rundown" on wedding_rundown;
create policy "Users can update wedding rundown" on wedding_rundown for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete wedding rundown" on wedding_rundown;
create policy "Users can delete wedding rundown" on wedding_rundown for delete using (auth.role() = 'authenticated');

-- Todos
alter table todos enable row level security;
drop policy if exists "Users can view all todos" on todos;
create policy "Users can view all todos" on todos for select using (true);
drop policy if exists "Users can create their own todos" on todos;
create policy "Users can create their own todos" on todos for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update their own todos" on todos;
drop policy if exists "Partners can update todos" on todos;
create policy "Partners can update todos" on todos for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete their own todos" on todos;
drop policy if exists "Partners can delete todos" on todos;
create policy "Partners can delete todos" on todos for delete using (auth.role() = 'authenticated');

-- Todo Tasks
alter table todo_tasks enable row level security;
drop policy if exists "Users can view todo tasks" on todo_tasks;
create policy "Users can view todo tasks" on todo_tasks for select using (true);
drop policy if exists "Users can create todo tasks" on todo_tasks;
create policy "Users can create todo tasks" on todo_tasks for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update todo tasks" on todo_tasks;
create policy "Users can update todo tasks" on todo_tasks for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete todo tasks" on todo_tasks;
create policy "Users can delete todo tasks" on todo_tasks for delete using (auth.role() = 'authenticated');

-- Goals
alter table goals enable row level security;
drop policy if exists "Users can view all goals" on goals;
create policy "Users can view all goals" on goals for select using (true);
drop policy if exists "Users can create their own goals" on goals;
create policy "Users can create their own goals" on goals for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update their own goals" on goals;
drop policy if exists "Partners can update goals" on goals;
create policy "Partners can update goals" on goals for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete their own goals" on goals;
drop policy if exists "Partners can delete goals" on goals;
create policy "Partners can delete goals" on goals for delete using (auth.role() = 'authenticated');

-- Goal Tasks
alter table goal_tasks enable row level security;
drop policy if exists "Users can view goal tasks" on goal_tasks;
create policy "Users can view goal tasks" on goal_tasks for select using (true);
drop policy if exists "Users can create goal tasks for their goals" on goal_tasks;
drop policy if exists "Partners can create goal tasks" on goal_tasks;
create policy "Partners can create goal tasks" on goal_tasks for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update goal tasks for their goals" on goal_tasks;
drop policy if exists "Partners can update goal tasks" on goal_tasks;
create policy "Partners can update goal tasks" on goal_tasks for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete goal tasks for their goals" on goal_tasks;
drop policy if exists "Partners can delete goal tasks" on goal_tasks;
create policy "Partners can delete goal tasks" on goal_tasks for delete using (auth.role() = 'authenticated');

-- Calendar Events
alter table events enable row level security;
drop policy if exists "Users can view all events" on events;
create policy "Users can view all events" on events for select using (true);
drop policy if exists "Users can create their own events" on events;
create policy "Users can create their own events" on events for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update their own events" on events;
drop policy if exists "Partners can update events" on events;
create policy "Partners can update events" on events for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete their own events" on events;
drop policy if exists "Partners can delete events" on events;
create policy "Partners can delete events" on events for delete using (auth.role() = 'authenticated');

-- Finance Transactions
alter table transactions enable row level security;
drop policy if exists "Users can view all transactions" on transactions;
create policy "Users can view all transactions" on transactions for select using (true);
drop policy if exists "Users can create their own transactions" on transactions;
create policy "Users can create their own transactions" on transactions for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update their own transactions" on transactions;
drop policy if exists "Partners can update transactions" on transactions;
create policy "Partners can update transactions" on transactions for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete their own transactions" on transactions;
drop policy if exists "Partners can delete transactions" on transactions;
create policy "Partners can delete transactions" on transactions for delete using (auth.role() = 'authenticated');

-- Budgets
alter table budgets enable row level security;
drop policy if exists "Users can view all budgets" on budgets;
create policy "Users can view all budgets" on budgets for select using (true);
drop policy if exists "Users can create their own budgets" on budgets;
create policy "Users can create their own budgets" on budgets for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update their own budgets" on budgets;
drop policy if exists "Partners can update budgets" on budgets;
create policy "Partners can update budgets" on budgets for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete their own budgets" on budgets;
drop policy if exists "Partners can delete budgets" on budgets;
create policy "Partners can delete budgets" on budgets for delete using (auth.role() = 'authenticated');

-- Wishlist
alter table wishlist enable row level security;
drop policy if exists "Users can view shared and own wishlist items" on wishlist;
create policy "Users can view shared and own wishlist items" on wishlist for select using (true);
drop policy if exists "Users can create their own wishlist items" on wishlist;
create policy "Users can create their own wishlist items" on wishlist for insert with check (auth.role() = 'authenticated');
drop policy if exists "Users can update their own wishlist items" on wishlist;
drop policy if exists "Partners can update wishlist items" on wishlist;
create policy "Partners can update wishlist items" on wishlist for update using (auth.role() = 'authenticated');
drop policy if exists "Users can delete their own wishlist items" on wishlist;
drop policy if exists "Partners can delete wishlist items" on wishlist;
create policy "Partners can delete wishlist items" on wishlist for delete using (auth.role() = 'authenticated');

-- Ensure index performance
create index if not exists idx_wedding_budget_cat on wedding_budget_items(category);
create index if not exists idx_wedding_guests_rsvp on wedding_guests(rsvp_status);
create index if not exists idx_wedding_rundown_time on wedding_rundown(time_start);
