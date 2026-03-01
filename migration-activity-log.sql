-- Activity Log Migration
-- Run this in your Supabase SQL Editor

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,         -- 'page_view', 'create_todo', 'complete_todo', 'add_transaction', etc.
    page TEXT,                    -- '/todos', '/finance', '/calendar', etc.
    metadata JSONB DEFAULT '{}', -- Extra context: { title, amount, category, etc. }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Both partners can read all activity logs
CREATE POLICY "Users can read all activity logs"
    ON activity_logs FOR SELECT
    USING (true);

-- Users can only insert their own logs
CREATE POLICY "Users can insert own activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Auto-cleanup: delete logs older than 90 days (optional, run as cron)
-- DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days';
