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

-- Ensure Telegram integration columns exist
alter table profiles add column if not exists telegram_chat_id text;
alter table profiles add column if not exists telegram_username text;

-- Policies for profiles
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

drop policy if exists "Anyone can insert profile during signup" on profiles;
create policy "Anyone can insert profile during signup"
  on profiles for insert
  with check ( true );

drop policy if exists "Users can update own profile" on profiles;
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
drop policy if exists "Users can view all events" on events;
create policy "Users can view all events"
  on events for select
  using ( true );

drop policy if exists "Users can create their own events" on events;
create policy "Users can create their own events"
  on events for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own events" on events;
create policy "Users can update their own events"
  on events for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own events" on events;
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
drop policy if exists "Users can view all goals" on goals;
create policy "Users can view all goals"
  on goals for select
  using ( true );

drop policy if exists "Users can create their own goals" on goals;
create policy "Users can create their own goals"
  on goals for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own goals" on goals;
create policy "Users can update their own goals"
  on goals for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own goals" on goals;
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
drop policy if exists "Users can view goal tasks" on goal_tasks;
create policy "Users can view goal tasks"
  on goal_tasks for select
  using ( 
    exists (
      select 1 from goals 
      where goals.id = goal_tasks.goal_id
    )
  );

drop policy if exists "Users can create goal tasks for their goals" on goal_tasks;
create policy "Users can create goal tasks for their goals"
  on goal_tasks for insert
  with check (
    exists (
      select 1 from goals 
      where goals.id = goal_tasks.goal_id 
      and goals.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update goal tasks for their goals" on goal_tasks;
create policy "Users can update goal tasks for their goals"
  on goal_tasks for update
  using (
    exists (
      select 1 from goals 
      where goals.id = goal_tasks.goal_id 
      and goals.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete goal tasks for their goals" on goal_tasks;
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
drop policy if exists "Users can view all gallery items" on gallery;
create policy "Users can view all gallery items"
  on gallery for select
  using ( true );

drop policy if exists "Users can upload their own photos" on gallery;
create policy "Users can upload their own photos"
  on gallery for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own photos" on gallery;
create policy "Users can update their own photos"
  on gallery for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own photos" on gallery;
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
drop policy if exists "Users can view all portfolio links" on portfolio_links;
create policy "Users can view all portfolio links"
  on portfolio_links for select
  using ( true );

drop policy if exists "Users can create their own links" on portfolio_links;
create policy "Users can create their own links"
  on portfolio_links for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own links" on portfolio_links;
create policy "Users can update their own links"
  on portfolio_links for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own links" on portfolio_links;
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

-- Ensure columns exist
alter table wishlist add column if not exists is_shared boolean default true;
alter table wishlist add column if not exists is_purchased boolean default false;

-- Enable RLS
alter table wishlist enable row level security;

-- Policies for wishlist (can view shared items + own items)
drop policy if exists "Users can view shared and own wishlist items" on wishlist;
create policy "Users can view shared and own wishlist items"
  on wishlist for select
  using ( is_shared = true or auth.uid() = user_id );

drop policy if exists "Users can create their own wishlist items" on wishlist;
create policy "Users can create their own wishlist items"
  on wishlist for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own wishlist items" on wishlist;
create policy "Users can update their own wishlist items"
  on wishlist for update
  using ( auth.uid() = user_id or is_shared = true );

drop policy if exists "Users can delete their own wishlist items" on wishlist;
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

-- Ensure all transaction columns exist if table was previously created
alter table transactions add column if not exists sub_title text;
alter table transactions add column if not exists is_split boolean default false;
alter table transactions add column if not exists split_with text;
alter table transactions add column if not exists paid_by uuid references profiles(id);
alter table transactions add column if not exists is_settled boolean default false;
alter table transactions add column if not exists receipt_url text;
alter table transactions add column if not exists receipt_metadata jsonb;
alter table transactions add column if not exists payment_method text default 'cash';
alter table transactions add column if not exists is_shared boolean default false;

-- Enable RLS
alter table transactions enable row level security;

-- Policies for transactions
drop policy if exists "Users can view all transactions" on transactions;
create policy "Users can view all transactions"
  on transactions for select
  using ( true );

drop policy if exists "Users can create their own transactions" on transactions;
create policy "Users can create their own transactions"
  on transactions for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own transactions" on transactions;
create policy "Users can update their own transactions"
  on transactions for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own transactions" on transactions;
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
drop policy if exists "Users can view all budgets" on budgets;
create policy "Users can view all budgets"
  on budgets for select
  using ( true );

drop policy if exists "Users can create their own budgets" on budgets;
create policy "Users can create their own budgets"
  on budgets for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own budgets" on budgets;
create policy "Users can update their own budgets"
  on budgets for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own budgets" on budgets;
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
drop policy if exists "Users can view all todos" on todos;
create policy "Users can view all todos"
  on todos for select
  using ( true );

drop policy if exists "Users can create their own todos" on todos;
create policy "Users can create their own todos"
  on todos for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own todos" on todos;
create policy "Users can update their own todos"
  on todos for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own todos" on todos;
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
-- SAVINGS ACCOUNTS TABLE (Wedding Fund, Emergency, etc.)
-- =====================================================
create table if not exists savings_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  type text default 'cash',
  bank_code text,
  balance decimal(14,2) default 0,
  target_amount decimal(14,2) default 0,
  color text default '#10B981',
  icon text default 'PiggyBank',
  is_shared boolean default false,
  target_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure all columns exist if table was previously created
alter table savings_accounts add column if not exists type text default 'cash';
alter table savings_accounts add column if not exists bank_code text;
alter table savings_accounts add column if not exists balance decimal(14,2) default 0;
alter table savings_accounts add column if not exists target_amount decimal(14,2) default 0;
alter table savings_accounts add column if not exists color text default '#10B981';
alter table savings_accounts add column if not exists icon text default 'PiggyBank';
alter table savings_accounts add column if not exists is_shared boolean default false;
alter table savings_accounts add column if not exists target_date date;

alter table savings_accounts enable row level security;
drop policy if exists "Users can view all savings accounts" on savings_accounts;
create policy "Users can view all savings accounts" on savings_accounts for select using ( true );

drop policy if exists "Users can create savings accounts" on savings_accounts;
create policy "Users can create savings accounts" on savings_accounts for insert with check ( auth.uid() = user_id );

drop policy if exists "Users can update savings accounts" on savings_accounts;
create policy "Users can update savings accounts" on savings_accounts for update using ( auth.uid() = user_id or is_shared = true );

drop policy if exists "Users can delete own savings accounts" on savings_accounts;
create policy "Users can delete own savings accounts" on savings_accounts for delete using ( auth.uid() = user_id );

-- =====================================================
-- GOAL PAGES (Notion-style rich content per goal)
-- =====================================================
create table if not exists goal_pages (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade not null unique,
  content jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table goal_pages enable row level security;
drop policy if exists "Users can view all goal pages" on goal_pages;
create policy "Users can view all goal pages" on goal_pages for select using ( true );
drop policy if exists "Users can insert goal pages" on goal_pages;
create policy "Users can insert goal pages" on goal_pages for insert with check ( true );
drop policy if exists "Users can update goal pages" on goal_pages;
create policy "Users can update goal pages" on goal_pages for update using ( true );
drop policy if exists "Users can delete goal pages" on goal_pages;
create policy "Users can delete goal pages" on goal_pages for delete using ( true );

-- =====================================================
-- TODO CATEGORIES TABLE
-- =====================================================
create table if not exists todo_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  color text default '#3B82F6',
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table todo_categories enable row level security;
drop policy if exists "Users can view all todo categories" on todo_categories;
create policy "Users can view all todo categories" on todo_categories for select using ( true );
drop policy if exists "Users can create todo categories" on todo_categories;
create policy "Users can create todo categories" on todo_categories for insert with check ( auth.uid() = user_id );
drop policy if exists "Users can update own todo categories" on todo_categories;
create policy "Users can update own todo categories" on todo_categories for update using ( auth.uid() = user_id );
drop policy if exists "Users can delete own todo categories" on todo_categories;
create policy "Users can delete own todo categories" on todo_categories for delete using ( auth.uid() = user_id );

-- =====================================================
-- ACTIVITY LOGS TABLE
-- =====================================================
create table if not exists activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table activity_logs enable row level security;
drop policy if exists "Users can view all activity logs" on activity_logs;
create policy "Users can view all activity logs" on activity_logs for select using ( true );
drop policy if exists "Users can create activity logs" on activity_logs;
create policy "Users can create activity logs" on activity_logs for insert with check ( auth.uid() = user_id );

-- Extend transactions table with receipts and metadata
alter table transactions add column if not exists receipt_url text;
alter table transactions add column if not exists receipt_metadata jsonb;
alter table transactions add column if not exists payment_method text default 'cash';
alter table transactions add column if not exists is_shared boolean default false;

-- =====================================================
-- DONE!
-- =====================================================
