import type { CalendarItem } from '@/types'

/**
 * Parses iCalendar (.ics) format date/datetime strings.
 * Formats handled:
 * - 20261005 (DATE value -> allDay)
 * - 20261005T090000Z (UTC datetime)
 * - 20261005T090000 (Local datetime)
 */
export function parseIcsDate(rawStr: string): { iso: string; date: string; time: string | null; allDay: boolean } {
  // Strip param prefixes like VALUE=DATE: or TZID=Asia/Jakarta:
  const parts = rawStr.split(':')
  const val = parts[parts.length - 1].trim()
  const isDateOnly = val.length === 8 && /^\d{8}$/.test(val)

  if (isDateOnly) {
    const year = val.substring(0, 4)
    const month = val.substring(4, 6)
    const day = val.substring(6, 8)
    const dateStr = `${year}-${month}-${day}`
    return {
      iso: `${dateStr}T00:00:00.000Z`,
      date: dateStr,
      time: null,
      allDay: true,
    }
  }

  // Datetime: YYYYMMDDTHHmmss(Z)?
  const match = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
  if (match) {
    const [, year, month, day, hour, min, sec, isUtc] = match
    const dateStr = `${year}-${month}-${day}`
    const timeStr = `${hour}:${min}`
    const iso = isUtc
      ? new Date(Date.UTC(+year, +month - 1, +day, +hour, +min, +sec)).toISOString()
      : `${dateStr}T${hour}:${min}:${sec}`

    return {
      iso,
      date: dateStr,
      time: timeStr,
      allDay: false,
    }
  }

  // Fallback to JS Date
  const parsed = new Date(val)
  if (!isNaN(parsed.getTime())) {
    const dateStr = parsed.toISOString().split('T')[0]
    const timeStr = parsed.toTimeString().slice(0, 5)
    return {
      iso: parsed.toISOString(),
      date: dateStr,
      time: timeStr,
      allDay: false,
    }
  }

  const today = new Date().toISOString().split('T')[0]
  return { iso: new Date().toISOString(), date: today, time: null, allDay: true }
}

/**
 * Unfolds folded lines in RFC 5545 format (lines starting with space or tab).
 */
export function unfoldIcs(icsText: string): string[] {
  const rawLines = icsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const lines: string[] = []

  for (const line of rawLines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (lines.length > 0) {
        lines[lines.length - 1] += line.slice(1)
      }
    } else if (line.trim().length > 0) {
      lines.push(line.trim())
    }
  }

  return lines
}

/**
 * Unescapes ICS text fields (e.g. \, -> ,, \; -> ;, \n -> newline).
 */
export function unescapeIcsText(str: string): string {
  if (!str) return ''
  return str
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

export interface InboundFeedSource {
  url: string
  ownerName: string
  role: 'aegg' | 'peppaa'
  color?: string
}

/**
 * Parses raw ICS text from a Google Calendar / Gmail iCal feed into CalendarItems.
 */
export function parseGoogleCalendarIcs(
  icsContent: string,
  source: InboundFeedSource
): CalendarItem[] {
  const lines = unfoldIcs(icsContent)
  const items: CalendarItem[] = []
  let inEvent = false
  let currentEvent: Record<string, string> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
      continue
    }

    if (line === 'END:VEVENT') {
      inEvent = false

      if (currentEvent.STATUS === 'CANCELLED') continue
      if (!currentEvent.SUMMARY && !currentEvent.DTSTART) continue

      const dtStartRaw = currentEvent['DTSTART'] || ''
      const dtEndRaw = currentEvent['DTEND'] || ''

      const start = parseIcsDate(dtStartRaw)
      const end = dtEndRaw ? parseIcsDate(dtEndRaw) : null

      const title = unescapeIcsText(currentEvent['SUMMARY'] || 'Acara Google Calendar')
      const description = unescapeIcsText(currentEvent['DESCRIPTION'] || currentEvent['LOCATION'] || '')
      const uid = currentEvent['UID'] || Math.random().toString(36).substring(2)

      const color = source.color || (source.role === 'peppaa' ? '#EC4899' : '#3B82F6')

      items.push({
        id: `gcal-${source.role}-${uid}`,
        type: 'event',
        title: `[GCal ${source.ownerName}] ${title}`,
        description: description || `Disinkronkan dari Google Calendar (${source.ownerName})`,
        date: start.date,
        time: start.time,
        endTime: end?.time || null,
        startIso: start.iso,
        endIso: end?.iso || null,
        allDay: start.allDay,
        color,
        completed: false,
        priority: null,
        owner: {
          display_name: source.ownerName,
          role: source.role,
        },
      })

      continue
    }

    if (inEvent) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const keyPart = line.substring(0, colonIdx)
        const valPart = line.substring(colonIdx + 1)
        const key = keyPart.split(';')[0].toUpperCase()

        if (key === 'DTSTART' || key === 'DTEND') {
          currentEvent[key] = line
        } else {
          currentEvent[key] = valPart
        }
      }
    }
  }

  return items
}
