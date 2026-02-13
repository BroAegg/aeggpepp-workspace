-- AeggPepp Workspace Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- PROFILES TABLE (extends auth.users)
-- =====================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  role text default 'member' check (role in ('aegg', 'peppaa', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Anyone can insert profile during signup"
  on profiles for insert
  with check ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- =====================================================
-- EVENTS TABLE (Calendar)
-- =====================================================
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone,
  all_day boolean default false,
  color text default '#0F766E',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table events enable row level security;

-- Policies for events
create policy "Users can view all events"
  on events for select
  using ( true );

create policy "Users can create their own events"
  on events for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own events"
  on events for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own events"
  on events for delete
  using ( auth.uid() = user_id );

-- =====================================================
-- GOALS TABLE (Kanban Board)
-- =====================================================
create table if not exists goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'backlog' check (status in ('backlog', 'in_progress', 'completed', 'archived')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  position integer default 0,
  due_date date,
  tag text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table goals enable row level security;

-- Policies for goals
create policy "Users can view all goals"
  on goals for select
  using ( true );

create policy "Users can create their own goals"
  on goals for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own goals"
  on goals for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own goals"
  on goals for delete
  using ( auth.uid() = user_id );

-- =====================================================
-- GOAL_TASKS TABLE (Subtasks)
-- =====================================================
create table if not exists goal_tasks (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade not null,
  title text not null,
  completed boolean default false,
  position integer default 0
);

-- Enable RLS
alter table goal_tasks enable row level security;

-- Policies for goal_tasks (inherit from parent goal)
create policy "Users can view goal tasks"
  on goal_tasks for select
  using ( 
    exists (
      select 1 from goals 
      where goals.id = goal_tasks.goal_id
    )
  );

create policy "Users can create goal tasks for their goals"
  on goal_tasks for insert
  with check (
    exists (
      select 1 from goals 
      where goals.id = goal_tasks.goal_id 
      and goals.user_id = auth.uid()
    )
  );

create policy "Users can update goal tasks for their goals"
  on goal_tasks for update
  using (
    exists (
      select 1 from goals 
      where goals.id = goal_tasks.goal_id 
      and goals.user_id = auth.uid()
    )
  );

create policy "Users can delete goal tasks for their goals"
  on goal_tasks for delete
  using (
    exists (
      select 1 from goals 
      where goals.id = goal_tasks.goal_id 
      and goals.user_id = auth.uid()
    )
  );

-- =====================================================
-- GALLERY TABLE
-- =====================================================
create table if not exists gallery (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  image_url text not null,
  caption text,
  taken_at date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table gallery enable row level security;

-- Policies for gallery
create policy "Users can view all gallery items"
  on gallery for select
  using ( true );

create policy "Users can upload their own photos"
  on gallery for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own photos"
  on gallery for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own photos"
  on gallery for delete
  using ( auth.uid() = user_id );

-- =====================================================
-- PORTFOLIO_LINKS TABLE
-- =====================================================
create table if not exists portfolio_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  url text not null,
  description text,
  category text check (category in ('project', 'social', 'other')),
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table portfolio_links enable row level security;

-- Policies for portfolio_links
create policy "Users can view all portfolio links"
  on portfolio_links for select
  using ( true );

create policy "Users can create their own links"
  on portfolio_links for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own links"
  on portfolio_links for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own links"
  on portfolio_links for delete
  using ( auth.uid() = user_id );

-- =====================================================
-- WISHLIST TABLE
-- =====================================================
create table if not exists wishlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  price decimal(12,2),
  currency text default 'IDR',
  url text,
  image_url text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  is_purchased boolean default false,
  is_shared boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table wishlist enable row level security;

-- Policies for wishlist (can view shared items + own items)
create policy "Users can view shared and own wishlist items"
  on wishlist for select
  using ( is_shared = true or auth.uid() = user_id );

create policy "Users can create their own wishlist items"
  on wishlist for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own wishlist items"
  on wishlist for update
  using ( auth.uid() = user_id or is_shared = true );

create policy "Users can delete their own wishlist items"
  on wishlist for delete
  using ( auth.uid() = user_id );

-- =====================================================
-- TRANSACTIONS TABLE (Finance)
-- =====================================================
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount decimal(12,2) not null,
  description text,
  date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table transactions enable row level security;

-- Policies for transactions
create policy "Users can view all transactions"
  on transactions for select
  using ( true );

create policy "Users can create their own transactions"
  on transactions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own transactions"
  on transactions for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own transactions"
  on transactions for delete
  using ( auth.uid() = user_id );

-- =====================================================
-- BUDGETS TABLE
-- =====================================================
create table if not exists budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  category text not null,
  amount decimal(12,2) not null,
  period text default 'monthly' check (period in ('weekly', 'monthly', 'yearly')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table budgets enable row level security;

-- Policies for budgets
create policy "Users can view all budgets"
  on budgets for select
  using ( true );

create policy "Users can create their own budgets"
  on budgets for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own budgets"
  on budgets for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own budgets"
  on budgets for delete
  using ( auth.uid() = user_id );

-- =====================================================
-- TODOS TABLE
-- =====================================================
create table if not exists todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  completed boolean default false,
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  category text check (category in ('work', 'personal', 'shopping', 'other')),
  due_date date,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table todos enable row level security;

-- Policies for todos
create policy "Users can view all todos"
  on todos for select
  using ( true );

create policy "Users can create their own todos"
  on todos for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own todos"
  on todos for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own todos"
  on todos for delete
  using ( auth.uid() = user_id );

-- =====================================================
-- INDEXES for better performance
-- =====================================================
create index if not exists idx_events_user_id on events(user_id);
create index if not exists idx_events_start_date on events(start_date);
create index if not exists idx_goals_user_id on goals(user_id);
create index if not exists idx_goals_status on goals(status);
create index if not exists idx_gallery_user_id on gallery(user_id);
create index if not exists idx_gallery_created_at on gallery(created_at desc);
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_date on transactions(date desc);
create index if not exists idx_todos_user_id on todos(user_id);
create index if not exists idx_todos_completed on todos(completed);
create index if not exists idx_todos_due_date on todos(due_date);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for profiles updated_at
create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at_column();

-- Trigger for todos updated_at
create trigger update_todos_updated_at
  before update on todos
  for each row
  execute function update_updated_at_column();

-- =====================================================
-- DONE!
-- =====================================================
-- All tables, policies, and indexes created successfully!
-- Now create a Storage bucket named 'gallery' for photo uploads.
