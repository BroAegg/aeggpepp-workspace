'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  addDays,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Trash2,
  Edit,
  Loader2,
  Target,
  Calendar as CalendarIcon,
  CheckCircle2,
  CalendarDays,
  CircleDot,
  CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EVENT_COLORS } from '@/lib/constants'
import { getHolidaysByDate, type Holiday } from '@/lib/holidays'
import {
  getCalendarItems,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent as deleteEventAction,
} from '@/lib/actions/calendar'
import type { CalendarEvent, CalendarItem } from '@/types'

// ============== MAIN PAGE ==============

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('09:00')
  const [formEndTime, setFormEndTime] = useState('10:00')
  const [formAllDay, setFormAllDay] = useState(false)
  const [formColor, setFormColor] = useState('#2563EB')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [eventsData, itemsData] = await Promise.all([
        getEvents(),
        getCalendarItems(),
      ])
      setEvents(eventsData)

      // Post-process items to fix time using browser timezone
      const processedItems = itemsData.map((item) => {
        if (item.startIso) {
          const dateParams = new Date(item.startIso)
          return {
            ...item,
            // Update time to local time (HH:MM)
            time: dateParams.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            // Update endTime if exists
            endTime: item.endIso
              ? new Date(item.endIso).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
              : null,
            // Also update date string to local date in case timezone shift changes the day
            date: format(dateParams, 'yyyy-MM-dd'),
          }
        }
        return item
      })
      setCalendarItems(processedItems)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now)
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd })
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Get calendar items for a specific day
  const getItemsForDay = (day: Date): CalendarItem[] => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return calendarItems.filter((item) => item.date === dayStr)
  }

  // Items for selected date
  const selectedDateItems = useMemo(() => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd')
    const items = calendarItems.filter((item) => item.date === dayStr)
    // Sort: timed events first (by time), then all-day items
    return items.sort((a, b) => {
      if (a.time && !b.time) return -1
      if (!a.time && b.time) return 1
      if (a.time && b.time) return a.time.localeCompare(b.time)
      // For all-day: events first, then goals
      const typeOrder: Record<string, number> = { event: 0, goal: 1 }
      return typeOrder[a.type] - typeOrder[b.type]
    })
  }, [calendarItems, selectedDate])

  // Upcoming items (next 7 days from today, excludes today)
  const upcomingItems = useMemo(() => {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const nextWeek = addDays(today, 7)
    const nextWeekStr = format(nextWeek, 'yyyy-MM-dd')

    return calendarItems
      .filter((item) => item.date >= todayStr && item.date <= nextWeekStr && !item.completed)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  }, [calendarItems])

  // Group upcoming by date
  const upcomingByDate = useMemo(() => {
    const groups: Record<string, CalendarItem[]> = {}
    for (const item of upcomingItems) {
      if (!groups[item.date]) groups[item.date] = []
      groups[item.date].push(item)
    }
    return groups
  }, [upcomingItems])

  // --- Modal handlers ---
  const openAddModal = (date?: Date) => {
    const targetDate = date || selectedDate
    setEditingEvent(null)
    setFormTitle('')
    setFormDescription('')
    setFormStartDate(format(targetDate, 'yyyy-MM-dd'))
    setFormStartTime('09:00')
    setFormEndTime('10:00')
    setFormAllDay(false)
    setFormColor('#ff7dda')
    setShowModal(true)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormTitle(event.title)
    setFormDescription(event.description || '')
    setFormStartDate(format(new Date(event.start_date), 'yyyy-MM-dd'))
    setFormStartTime(format(new Date(event.start_date), 'HH:mm'))
    setFormEndTime(event.end_date ? format(new Date(event.end_date), 'HH:mm') : '10:00')
    setFormAllDay(event.all_day)
    setFormColor(event.color)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim()) return
    setSaving(true)

    const startDatetime = formAllDay
      ? new Date(`${formStartDate}T00:00:00`).toISOString()
      : new Date(`${formStartDate}T${formStartTime}:00`).toISOString()
    const endDatetime = formAllDay
      ? new Date(`${formStartDate}T23:59:59`).toISOString()
      : new Date(`${formStartDate}T${formEndTime}:00`).toISOString()

    const formData = new FormData()
    formData.set('title', formTitle)
    formData.set('description', formDescription)
    formData.set('start_date', startDatetime)
    formData.set('end_date', endDatetime)
    formData.set('all_day', String(formAllDay))
    formData.set('color', formColor)

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, formData)
      } else {
        await createEvent(formData)
      }
      await fetchData()
      setShowModal(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('Error saving event:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEventAction(id)
      await fetchData()
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
  }

  // Find the original event for editing
  const findEventById = (id: string): CalendarEvent | undefined =>
    events.find((e) => e.id === id)

  return (
    <>
      <Header title="Calendar" icon={CalendarIcon} />

      <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto">
        {/* ============ TOOLBAR ============ */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center bg-secondary rounded-md p-1">
              <button
                onClick={prevMonth}
                className="p-1 hover:bg-background rounded-sm transition-colors text-muted-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm font-medium text-secondary-foreground hover:bg-background rounded-sm transition-colors"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1 hover:bg-background rounded-sm transition-colors text-muted-foreground"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <Button onClick={() => openAddModal()}>
            <Plus className="w-4 h-4 mr-2" /> New Event
          </Button>
        </div>

        {/* ============ CALENDAR GRID ============ */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-6">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-secondary/50">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-border divide-y auto-rows-fr">
            {calendarDays.map((day) => {
              const today = isToday(day)
              const sameMonth = isSameMonth(day, monthStart)
              const selected = isSameDay(day, selectedDate)
              const dayItems = getItemsForDay(day)
              const dayHolidays = getHolidaysByDate(format(day, 'yyyy-MM-dd'))

              // Group indicators by type
              const hasEvents = dayItems.some((i) => i.type === 'event')
              const hasGoals = dayItems.some((i) => i.type === 'goal')
              const hasHoliday = dayHolidays.length > 0

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    'relative min-h-[110px] lg:min-h-[130px] p-2 transition-colors cursor-pointer group flex flex-col',
                    !sameMonth && 'bg-secondary/20 opacity-50',
                    selected && 'bg-primary/5 ring-1 ring-inset ring-primary/20',
                    !selected && 'hover:bg-secondary/40'
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={cn(
                        'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                        today ? 'bg-red-500 text-white' : 'text-foreground',
                        selected && !today && 'bg-primary/10 text-primary'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Add button on hover */}
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-secondary rounded transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        openAddModal(day)
                      }}
                    >
                      <Plus className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Holiday label */}
                  {dayHolidays.length > 0 && (
                    <div className="px-1 py-0.5 rounded-sm truncate text-[9px] font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 mb-0.5">
                      🏷️ {dayHolidays[0].name}
                    </div>
                  )}

                  {/* Event items (max 2 shown) */}
                  <div className="flex flex-col gap-1 overflow-hidden flex-1 mt-1">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={cn(
                          'px-1.5 py-0.5 rounded-sm truncate text-[10px] font-medium',
                          item.completed && 'opacity-40 line-through'
                        )}
                        style={{
                          backgroundColor: `${item.color}15`,
                          borderLeft: `3px solid ${item.color}`,
                          color: item.color,
                        }}
                      >
                        {item.type === 'goal' && '🎯 '}
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="text-[10px] text-muted-foreground pl-1 font-medium">
                        +{dayItems.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Type indicator dots */}
                  {(dayItems.length > 0 || hasHoliday) && (
                    <div className="flex items-center gap-0.5 mt-0.5 justify-center">
                      {hasHoliday && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                      {hasEvents && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      {hasGoals && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ============ TODAY'S SCHEDULE / SELECTED DAY ============ */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  isToday(selectedDate) ? 'bg-red-500 text-white' : 'bg-secondary'
                )}
              >
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {isToday(selectedDate)
                    ? "Today's Schedule"
                    : format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedDateItems.length === 0
                    ? 'No items scheduled'
                    : `${selectedDateItems.length} item${selectedDateItems.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => openAddModal(selectedDate)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>

          {/* Holiday banner for selected date */}
          {(() => {
            const selHolidays = getHolidaysByDate(format(selectedDate, 'yyyy-MM-dd'))
            if (selHolidays.length === 0) return null
            return (
              <div className="mb-3 space-y-1.5">
                {selHolidays.map((h) => (
                  <div
                    key={h.date + h.name}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium',
                      h.type === 'national'
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800'
                        : h.type === 'religious'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300 border border-pink-200 dark:border-pink-800'
                    )}
                  >
                    <span className="text-base">
                      {h.type === 'national' ? '🇮🇩' : h.type === 'religious' ? '🕌' : '🌍'}
                    </span>
                    <span>{h.name}</span>
                    <span className="ml-auto text-[10px] font-normal opacity-70 capitalize">
                      {h.type === 'national' ? 'Hari Nasional' : h.type === 'religious' ? 'Hari Keagamaan' : 'International'}
                    </span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty state */}
          {!loading && selectedDateItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {isToday(selectedDate)
                  ? '🎉 Free day! No tasks or events.'
                  : 'Nothing scheduled for this day.'}
              </p>
            </div>
          )}

          {/* Timed items (timeline view) */}
          {!loading && selectedDateItems.filter((i) => i.time).length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Scheduled
              </p>
              <div className="space-y-1.5">
                {selectedDateItems
                  .filter((i) => i.time)
                  .map((item) => (
                    <ScheduleItem
                      key={`${item.type}-${item.id}`}
                      item={item}
                      onEditEvent={
                        item.type === 'event'
                          ? () => {
                            const ev = findEventById(item.id)
                            if (ev) openEditModal(ev)
                          }
                          : undefined
                      }
                    />
                  ))}
              </div>
            </div>
          )}

          {/* All-day / no-time items */}
          {!loading && selectedDateItems.filter((i) => !i.time).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {selectedDateItems.some((i) => i.time) ? 'All Day' : ''}
              </p>
              <div className="space-y-1.5">
                {selectedDateItems
                  .filter((i) => !i.time)
                  .map((item) => (
                    <ScheduleItem
                      key={`${item.type}-${item.id}`}
                      item={item}
                      onEditEvent={
                        item.type === 'event'
                          ? () => {
                            const ev = findEventById(item.id)
                            if (ev) openEditModal(ev)
                          }
                          : undefined
                      }
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ============ UPCOMING (NEXT 7 DAYS) ============ */}
        {Object.keys(upcomingByDate).length > 0 && (
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Upcoming Agenda</h3>
                <p className="text-xs text-muted-foreground">
                  Next 7 days · {upcomingItems.length} item{upcomingItems.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(upcomingByDate).map(([dateStr, items]) => (
                <div key={dateStr}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                    {format(new Date(dateStr + 'T00:00:00'), 'EEEE, MMM d')}
                  </p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <ScheduleItem key={`${item.type}-${item.id}`} item={item} compact />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============ ADD/EDIT EVENT MODAL ============ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {editingEvent ? 'Edit Event' : 'New Event'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="Event name..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    placeholder="Add details..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* All Day Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="all_day"
                    checked={formAllDay}
                    onChange={(e) => setFormAllDay(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="all_day" className="text-sm text-foreground">
                    All day event
                  </label>
                </div>


                {/* Time */}
                {!formAllDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Start Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          value={formStartTime}
                          onChange={(e) => setFormStartTime(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none tracking-widest text-lg font-mono"
                        />
                        <Clock className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">End Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          value={formEndTime}
                          onChange={(e) => setFormEndTime(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none tracking-widest text-lg font-mono"
                        />
                        <Clock className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        type="button"
                        className={cn(
                          'w-8 h-8 rounded-full transition-all',
                          formColor === colorOption.value
                            ? 'ring-2 ring-offset-2 ring-offset-card scale-110'
                            : 'hover:scale-110'
                        )}
                        style={{ backgroundColor: colorOption.value }}
                        title={colorOption.label}
                        onClick={() => setFormColor(colorOption.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                {editingEvent && (
                  <Button
                    variant="outline"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      handleDeleteEvent(editingEvent.id)
                      setShowModal(false)
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={!formTitle.trim() || saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingEvent ? (
                    'Save Changes'
                  ) : (
                    'Create Event'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ============== SCHEDULE ITEM COMPONENT ==============

function ScheduleItem({
  item,
  onEditEvent,
  compact = false,
}: {
  item: CalendarItem
  onEditEvent?: () => void
  compact?: boolean
}) {
  const ownerEmoji = item.owner.role === 'aegg' ? '⭐' : item.owner.role === 'peppaa' ? '🌙' : '👤'

  const typeIcon =
    item.type === 'event' ? (
      <CircleDot className="w-3.5 h-3.5" style={{ color: item.color }} />
    ) : item.type === 'goal' ? (
      <Target className="w-3.5 h-3.5 text-purple-500" />
    ) : (
      <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
    )

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'relative flex items-stretch gap-3 rounded-lg transition-colors group',
        compact ? 'px-2.5 py-2' : 'px-3 py-3',
        'hover:bg-secondary/50',
        item.completed && 'opacity-50'
      )}
      onClick={onEditEvent}
      style={{ cursor: onEditEvent ? 'pointer' : 'default' }}
    >
      {/* Mobile Indicator Bar */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md sm:hidden"
        style={{ backgroundColor: item.color }}
      />

      {/* Time column (Desktop) */}
      <div className="hidden sm:flex flex-col items-end w-16 flex-shrink-0 text-right pr-2">
        {item.time ? (
          <>
            <span className="text-sm font-mono font-medium text-foreground">{item.time}</span>
            {item.endTime && (
              <span className="text-[10px] text-muted-foreground mt-0.5">{item.endTime}</span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </div>

      {/* Color bar (Desktop) */}
      <div
        className="hidden sm:block w-1.5 self-stretch rounded-full flex-shrink-0 opacity-80"
        style={{ backgroundColor: item.color }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 pl-2 sm:pl-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">

          {/* Top Row: Icon + Title */}
          <div className="flex items-start sm:items-center gap-1.5 min-w-0">
            {/* Mobile Time Inline */}
            <div className="sm:hidden flex-shrink-0 mr-1">
              {item.time ? (
                <span className="text-[10px] font-mono font-bold text-foreground bg-secondary/50 px-1 rounded">{item.time}</span>
              ) : null}
            </div>

            {typeIcon}
            <p
              className={cn(
                'text-sm font-medium leading-tight', // Wrapped text
                item.completed ? 'line-through text-muted-foreground' : 'text-foreground'
              )}
            >
              {item.title}
            </p>
          </div>

          {/* Badge (Right or Bottom) */}
          <div
            className={cn(
              'flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium w-fit sm:ml-0',
              item.owner.role === 'aegg'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : item.owner.role === 'peppaa'
                  ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                  : 'bg-secondary text-muted-foreground'
            )}
          >
            {ownerEmoji} {item.owner.display_name?.split(' ')[0] || 'User'}
          </div>
        </div>

        {!compact && item.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-0">
            {item.description}
          </p>
        )}
      </div>

      {/* Edit button for events */}
      {onEditEvent && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEditEvent()
          }}
          className="md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-opacity flex-shrink-0 h-fit"
        >
          <Edit className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  )
}
