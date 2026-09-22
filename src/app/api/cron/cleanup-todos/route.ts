import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        // Basic authorization check - can be improved with a cron secret
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // Allow Vercel cron internal authorization style or simple secret
            // For simplicity, we assume Vercel handles invocation if this is not exposed publicly
            // But adding a simple check is safer.
            // If no CRON_SECRET is set, proceed but warn.
            if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                return new NextResponse('Unauthorized', { status: 401 })
            }
        }

        const supabase = createAdminClient()

        // Archive tasks that are marked as 'completed'
        // This runs weekly to move completed tasks to the archive so they don't clutter the active view,
        // while safely preserving all couple history and memories forever.
        const { count, error } = await supabase
            .from('todos')
            .update({ status: 'archived', updated_at: new Date().toISOString() }, { count: 'exact' })
            .eq('status', 'completed')

        if (error) {
            console.error('Error cleaning up todos:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Cleaned up ${count} completed todos`,
            count
        })
    } catch (error) {
        console.error('Error in cron job:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
