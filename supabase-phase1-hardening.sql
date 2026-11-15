-- =========================================================================
-- AEGGPEPP WORKSPACE — FASE 1: FONDASI DATA, KEAMANAN & REALTIME SYNC
-- Run this migration in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. IDEMPOTENCY & AUDIT TRAIL COLUMNS
-- =====================================================

-- Transactions: Idempotency, Soft Delete & Audit Trail
alter table public.transactions 
  add column if not exists idempotency_key uuid unique,
  add column if not exists deleted_at timestamp with time zone,
  add column if not exists updated_by uuid references public.profiles(id);

-- Todos: Idempotency Key
alter table public.todos 
  add column if not exists idempotency_key uuid unique;

-- Performance Indexes
create index if not exists idx_transactions_deleted_at on public.transactions(deleted_at);
create index if not exists idx_transactions_idempotency on public.transactions(idempotency_key);
create index if not exists idx_todos_idempotency on public.todos(idempotency_key);

-- =====================================================
-- 2. COUPLE MEMBERSHIP HELPER & HARDENED RLS POLICIES
-- =====================================================

-- Helper to verify if the requesting user belongs to the Aegg & Peppaa couple workspace
create or replace function public.is_couple_member()
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('aegg', 'peppaa')
  );
end;
$$ language plpgsql;

-- Grant execution to authenticated users
grant execute on function public.is_couple_member() to authenticated;

-- Hardened RLS on Transactions
alter table public.transactions enable row level security;
drop policy if exists "Couple members can select transactions" on public.transactions;
drop policy if exists "Couple members can insert transactions" on public.transactions;
drop policy if exists "Couple members can update transactions" on public.transactions;
drop policy if exists "Couple members can delete transactions" on public.transactions;
drop policy if exists "Users can view all transactions" on public.transactions;
drop policy if exists "Users can create their own transactions" on public.transactions;
drop policy if exists "Users can update their own transactions" on public.transactions;
drop policy if exists "Users can delete their own transactions" on public.transactions;
drop policy if exists "Partners can update transactions" on public.transactions;
drop policy if exists "Partners can delete transactions" on public.transactions;

create policy "Couple members can select transactions" 
  on public.transactions for select 
  using (public.is_couple_member());

create policy "Couple members can insert transactions" 
  on public.transactions for insert 
  with check (public.is_couple_member() and auth.uid() = user_id);

create policy "Couple members can update transactions" 
  on public.transactions for update 
  using (public.is_couple_member());

create policy "Couple members can delete transactions" 
  on public.transactions for delete 
  using (public.is_couple_member());

-- Hardened RLS on Todos
alter table public.todos enable row level security;
drop policy if exists "Couple members can select todos" on public.todos;
drop policy if exists "Couple members can insert todos" on public.todos;
drop policy if exists "Couple members can update todos" on public.todos;
drop policy if exists "Couple members can delete todos" on public.todos;
drop policy if exists "Users can view all todos" on public.todos;
drop policy if exists "Users can create their own todos" on public.todos;
drop policy if exists "Users can update their own todos" on public.todos;
drop policy if exists "Users can delete their own todos" on public.todos;
drop policy if exists "Partners can update todos" on public.todos;
drop policy if exists "Partners can delete todos" on public.todos;

create policy "Couple members can select todos" 
  on public.todos for select 
  using (public.is_couple_member());

create policy "Couple members can insert todos" 
  on public.todos for insert 
  with check (public.is_couple_member() and auth.uid() = user_id);

create policy "Couple members can update todos" 
  on public.todos for update 
  using (public.is_couple_member());

create policy "Couple members can delete todos" 
  on public.todos for delete 
  using (public.is_couple_member());

-- =====================================================
-- 2. COUPLE MEMBERSHIP HELPER & HARDENED RLS POLICIES
-- =====================================================

-- Ensure Wedding Tables exist before applying RLS
create table if not exists public.wedding_budget_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  title text not null,
  estimated_cost decimal(12,2) default 0 not null,
  actual_cost decimal(12,2) default 0 not null,
  paid_amount decimal(12,2) default 0 not null,
  status text default 'planned',
  due_date date,
  vendor_name text,
  vendor_contact text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.wedding_guests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  group_type text default 'family_aegg',
  pax integer default 1 not null check (pax > 0),
  rsvp_status text default 'pending',
  phone text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.wedding_rundown (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  time_start text not null,
  time_end text,
  title text not null,
  pic text,
  notes text,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Hardened RLS on Wedding Tables
alter table public.wedding_budget_items enable row level security;
drop policy if exists "Couple members can select wedding budget" on public.wedding_budget_items;
drop policy if exists "Couple members can insert wedding budget" on public.wedding_budget_items;
drop policy if exists "Couple members can update wedding budget" on public.wedding_budget_items;
drop policy if exists "Couple members can delete wedding budget" on public.wedding_budget_items;

create policy "Couple members can select wedding budget" 
  on public.wedding_budget_items for select using (public.is_couple_member());
create policy "Couple members can insert wedding budget" 
  on public.wedding_budget_items for insert with check (public.is_couple_member() and auth.uid() = user_id);
create policy "Couple members can update wedding budget" 
  on public.wedding_budget_items for update using (public.is_couple_member());
create policy "Couple members can delete wedding budget" 
  on public.wedding_budget_items for delete using (public.is_couple_member());

alter table public.wedding_guests enable row level security;
drop policy if exists "Couple members can select wedding guests" on public.wedding_guests;
drop policy if exists "Couple members can insert wedding guests" on public.wedding_guests;
drop policy if exists "Couple members can update wedding guests" on public.wedding_guests;
drop policy if exists "Couple members can delete wedding guests" on public.wedding_guests;

create policy "Couple members can select wedding guests" 
  on public.wedding_guests for select using (public.is_couple_member());
create policy "Couple members can insert wedding guests" 
  on public.wedding_guests for insert with check (public.is_couple_member() and auth.uid() = user_id);
create policy "Couple members can update wedding guests" 
  on public.wedding_guests for update using (public.is_couple_member());
create policy "Couple members can delete wedding guests" 
  on public.wedding_guests for delete using (public.is_couple_member());

alter table public.wedding_rundown enable row level security;
drop policy if exists "Couple members can select wedding rundown" on public.wedding_rundown;
drop policy if exists "Couple members can insert wedding rundown" on public.wedding_rundown;
drop policy if exists "Couple members can update wedding rundown" on public.wedding_rundown;
drop policy if exists "Couple members can delete wedding rundown" on public.wedding_rundown;

create policy "Couple members can select wedding rundown" 
  on public.wedding_rundown for select using (public.is_couple_member());
create policy "Couple members can insert wedding rundown" 
  on public.wedding_rundown for insert with check (public.is_couple_member() and auth.uid() = user_id);
create policy "Couple members can update wedding rundown" 
  on public.wedding_rundown for update using (public.is_couple_member());
create policy "Couple members can delete wedding rundown" 
  on public.wedding_rundown for delete using (public.is_couple_member());

-- =====================================================
-- 3. PRIVACY-FIRST STORAGE BUCKETS (Private Buckets)
-- =====================================================

-- Receipts Bucket (Private)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

-- Gallery Bucket (Private)
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', false)
on conflict (id) do update set public = false;

-- Wedding Docs Bucket (Private)
insert into storage.buckets (id, name, public)
values ('wedding-docs', 'wedding-docs', false)
on conflict (id) do update set public = false;

-- Secure Storage Policies for Receipts
drop policy if exists "Couple members can access receipts" on storage.objects;
drop policy if exists "Couple members can upload receipts" on storage.objects;
drop policy if exists "Couple members can update receipts" on storage.objects;
drop policy if exists "Couple members can delete receipts" on storage.objects;

create policy "Couple members can access receipts"
  on storage.objects for select
  using ( bucket_id in ('receipts', 'gallery', 'wedding-docs') and public.is_couple_member() );

create policy "Couple members can upload receipts"
  on storage.objects for insert
  with check ( bucket_id in ('receipts', 'gallery', 'wedding-docs') and public.is_couple_member() );

create policy "Couple members can update receipts"
  on storage.objects for update
  using ( bucket_id in ('receipts', 'gallery', 'wedding-docs') and public.is_couple_member() );

create policy "Couple members can delete receipts"
  on storage.objects for delete
  using ( bucket_id in ('receipts', 'gallery', 'wedding-docs') and public.is_couple_member() );

-- =====================================================
-- 4. REALTIME PUBLICATION ACTIVATION
-- =====================================================

-- Enable Supabase Realtime publication on key collaborative tables
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'todos'
  ) then
    alter publication supabase_realtime add table public.todos;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'wedding_guests'
  ) then
    alter publication supabase_realtime add table public.wedding_guests;
  end if;
end;
$$;
