-- =====================================================
-- MIGRATION V2: Todos Kanban + Finance Overhaul
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD STATUS COLUMN TO TODOS
-- =====================================================
alter table todos add column if not exists status text default 'todo' check (status in ('todo', 'in_progress', 'completed'));

-- Update existing data: completed todos get 'completed' status
update todos set status = 'completed' where completed = true and status = 'todo';

-- =====================================================
-- 2. TODO_TASKS TABLE (Sub-tasks for Todos)
-- =====================================================
create table if not exists todo_tasks (
  id uuid default gen_random_uuid() primary key,
  todo_id uuid references todos(id) on delete cascade not null,
  title text not null,
  completed boolean default false,
  position integer default 0
);

-- Enable RLS
alter table todo_tasks enable row level security;

-- Policies for todo_tasks (inherit from parent todo)
create policy "Users can view todo tasks"
  on todo_tasks for select
  using (
    exists (
      select 1 from todos
      where todos.id = todo_tasks.todo_id
    )
  );

create policy "Users can create todo tasks for their todos"
  on todo_tasks for insert
  with check (
    exists (
      select 1 from todos
      where todos.id = todo_tasks.todo_id
      and todos.user_id = auth.uid()
    )
  );

create policy "Users can update todo tasks for their todos"
  on todo_tasks for update
  using (
    exists (
      select 1 from todos
      where todos.id = todo_tasks.todo_id
      and todos.user_id = auth.uid()
    )
  );

create policy "Users can delete todo tasks for their todos"
  on todo_tasks for delete
  using (
    exists (
      select 1 from todos
      where todos.id = todo_tasks.todo_id
      and todos.user_id = auth.uid()
    )
  );

-- Index
create index if not exists idx_todo_tasks_todo_id on todo_tasks(todo_id);

-- =====================================================
-- 3. SAVINGS_ACCOUNTS TABLE
-- =====================================================
create table if not exists savings_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('cash', 'digital')),
  bank_code text,
  balance decimal(12,2) default 0,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table savings_accounts enable row level security;

create policy "Users can view all savings accounts"
  on savings_accounts for select
  using ( true );

create policy "Users can create their own savings accounts"
  on savings_accounts for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own savings accounts"
  on savings_accounts for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own savings accounts"
  on savings_accounts for delete
  using ( auth.uid() = user_id );

-- Trigger for savings_accounts updated_at
create trigger update_savings_accounts_updated_at
  before update on savings_accounts
  for each row
  execute function update_updated_at_column();

-- Index
create index if not exists idx_savings_accounts_user_id on savings_accounts(user_id);

-- =====================================================
-- 4. SAVINGS_TRANSACTIONS TABLE
-- =====================================================
create table if not exists savings_transactions (
  id uuid default gen_random_uuid() primary key,
  account_id uuid references savings_accounts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  amount decimal(12,2) not null,
  type text not null check (type in ('deposit', 'withdraw')),
  description text,
  date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table savings_transactions enable row level security;

create policy "Users can view all savings transactions"
  on savings_transactions for select
  using ( true );

create policy "Users can create their own savings transactions"
  on savings_transactions for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own savings transactions"
  on savings_transactions for delete
  using ( auth.uid() = user_id );

-- Index
create index if not exists idx_savings_transactions_account_id on savings_transactions(account_id);

-- =====================================================
-- 5. ADD SPLIT BILL COLUMNS TO TRANSACTIONS
-- =====================================================
alter table transactions add column if not exists is_split boolean default false;
alter table transactions add column if not exists split_with uuid references profiles(id);
alter table transactions add column if not exists paid_by uuid references profiles(id);
alter table transactions add column if not exists is_settled boolean default false;

-- =====================================================
-- DONE!
-- =====================================================
