import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { allHolidays } from '@/lib/holidays'

export const dynamic = 'force-dynamic'

function formatIcsDate(dateStr: string, isAllDay: boolean = false): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''

  if (isAllDay) {
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcsText(str: string): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()

    // 1. Fetch all events
    const { data: events } = await supabase
      .from('events')
      .select('*, profiles:user_id(display_name, role)')
      .order('start_date', { ascending: true })

    // 2. Fetch goals with due dates
    const { data: goals } = await supabase
      .from('goals')
      .select('*, profiles:user_id(display_name, role)')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AeggPepp//AeggPepp Couple OS//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:AeggPepp Couple Calendar',
      'X-WR-TIMEZONE:Asia/Jakarta',
      'X-WR-CALDESC:Kalender bersama Aegg & Peppaa (Agenda, Kencan, Target, dan Hari Libur)',
    ]

    const nowIcs = formatIcsDate(new Date().toISOString())

    // 3. Add Couple Events
    if (events && events.length > 0) {
      for (const ev of events) {
        const isAllDay = Boolean(ev.all_day)
        const dtStart = formatIcsDate(ev.start_date, isAllDay)
        const dtEnd = ev.end_date
          ? formatIcsDate(ev.end_date, isAllDay)
          : isAllDay
          ? dtStart
          : formatIcsDate(new Date(new Date(ev.start_date).getTime() + 3600000).toISOString())

        const ownerRole = ev.profiles?.role === 'peppaa' ? 'Peppaa' : 'Aegg'

        lines.push(
          'BEGIN:VEVENT',
          `UID:event-${ev.id}@aeggpepp.app`,
          `DTSTAMP:${nowIcs}`,
          isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
          isAllDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
          `SUMMARY:${escapeIcsText(`[${ownerRole}] ${ev.title}`)}`,
          `DESCRIPTION:${escapeIcsText(ev.description || 'Agenda AeggPepp')}`,
          'STATUS:CONFIRMED',
          'END:VEVENT'
        )
      }
    }

    // 4. Add Goals with Deadlines
    if (goals && goals.length > 0) {
      for (const g of goals) {
        const dueDate = formatIcsDate(g.due_date, true)
        const ownerRole = g.profiles?.role === 'peppaa' ? 'Peppaa' : 'Aegg'

        lines.push(
          'BEGIN:VEVENT',
          `UID:goal-${g.id}@aeggpepp.app`,
          `DTSTAMP:${nowIcs}`,
          `DTSTART;VALUE=DATE:${dueDate}`,
          `DTEND;VALUE=DATE:${dueDate}`,
          `SUMMARY:${escapeIcsText(`[${ownerRole}] Target: ${g.title}`)}`,
          `DESCRIPTION:${escapeIcsText(g.description || 'Target AeggPepp Workspace')}`,
          'STATUS:CONFIRMED',
          'END:VEVENT'
        )
      }
    }

    // 5. Add Indonesian Holidays
    for (const h of allHolidays) {
      const hDate = formatIcsDate(h.date, true)
      lines.push(
        'BEGIN:VEVENT',
        `UID:holiday-${h.date}-${h.name.replace(/\s+/g, '-')}@aeggpepp.app`,
        `DTSTAMP:${nowIcs}`,
        `DTSTART;VALUE=DATE:${hDate}`,
        `DTEND;VALUE=DATE:${hDate}`,
        `SUMMARY:${escapeIcsText(`🇮🇩 Libur: ${h.name}`)}`,
        `DESCRIPTION:${escapeIcsText(h.type === 'religious' ? 'Hari Libur Keagamaan' : 'Hari Libur Nasional')}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      )
    }

    lines.push('END:VCALENDAR')
    const icsContent = lines.join('\r\n')

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="aeggpepp-calendar.ics"',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Error generating calendar feed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
