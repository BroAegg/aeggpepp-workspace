-- =========================================================================
-- AeggPepp Workspace — Database Performance & Index Optimization
-- Execute this script in Supabase SQL Editor to eliminate sequential scans
-- and accelerate query response times across all dashboard modules.
-- =========================================================================

-- 1. Budgets table
create index if not exists idx_budgets_user_id on budgets(user_id);
create index if not exists idx_budgets_user_period on budgets(user_id, period);

-- 2. Savings accounts table
create index if not exists idx_savings_accounts_user_id on savings_accounts(user_id);
create index if not exists idx_savings_accounts_shared on savings_accounts(is_shared);

-- 3. Wishlist table
create index if not exists idx_wishlist_user_id on wishlist(user_id);
create index if not exists idx_wishlist_user_shared on wishlist(user_id, is_shared);
create index if not exists idx_wishlist_priority on wishlist(priority);
create index if not exists idx_wishlist_purchased on wishlist(is_purchased);

-- 4. Subtasks (Foreign Key joins)
create index if not exists idx_goal_tasks_goal_id on goal_tasks(goal_id);
create index if not exists idx_todo_tasks_todo_id on todo_tasks(todo_id);

-- 5. Activity logs table (Frequent filtering & sorting)
create index if not exists idx_activity_logs_user_action_time 
  on activity_logs(user_id, action, created_at desc);

-- 6. Composite indexes for high-frequency time-series queries
create index if not exists idx_transactions_user_date_comp 
  on transactions(user_id, date desc);

create index if not exists idx_events_user_start_comp 
  on events(user_id, start_date asc);

-- 7. Receipts table & items
create index if not exists idx_receipt_items_transaction_id 
  on receipt_items(transaction_id);

-- Done! All foreign keys and high-frequency filter columns are now indexed.
