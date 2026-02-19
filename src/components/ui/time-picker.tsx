'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimePickerProps {
    value: string
    onChange: (value: string) => void
    label?: string
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [hours, setHours] = useState('09')
    const [minutes, setMinutes] = useState('00')
    const containerRef = useRef<HTMLDivElement>(null)

    // Sync state with value prop
    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':')
            setHours(h || '09')
            setMinutes(m || '00')
        }
    }, [value])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleHourChange = (h: string) => {
        setHours(h)
        onChange(`${h}:${minutes}`)
    }

    const handleMinuteChange = (m: string) => {
        setMinutes(m)
        onChange(`${hours}:${m}`)
    }

    const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
    const minutesList = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')) // 5-minute steps

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 group",
                    isOpen
                        ? "border-primary ring-2 ring-primary/20 bg-background"
                        : "border-border bg-background hover:border-primary/50 hover:bg-secondary/30"
                )}
            >
                <span className="text-xl font-mono font-medium tracking-widest text-foreground">
                    {hours}:{minutes}
                </span>
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    isOpen ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground group-hover:text-primary"
                )}>
                    <Clock className="w-4 h-4" />
                </div>
            </button>

            {/* Popover */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 mt-2 w-full p-4 bg-card border border-border rounded-2xl shadow-xl select-none"
                    >
                        <div className="flex gap-4 h-48">
                            {/* Hours Column */}
                            <div className="flex-1 flex flex-col">
                                <span className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-wider mb-2">Hours</span>
                                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth space-y-1 pr-1 mask-linear-fade">
                                    {hoursList.map((h) => (
                                        <button
                                            key={h}
                                            onClick={() => handleHourChange(h)}
                                            className={cn(
                                                "w-full py-2 rounded-lg text-sm font-medium transition-all snap-center",
                                                hours === h
                                                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                            )}
                                        >
                                            {h}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Separator */}
                            <div className="flex items-center justify-center">
                                <span className="text-2xl font-bold text-muted-foreground/30">:</span>
                            </div>

                            {/* Minutes Column */}
                            <div className="flex-1 flex flex-col">
                                <span className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-wider mb-2">Minutes</span>
                                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth space-y-1 pl-1 mask-linear-fade">
                                    {minutesList.map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => handleMinuteChange(m)}
                                            className={cn(
                                                "w-full py-2 rounded-lg text-sm font-medium transition-all snap-center",
                                                minutes === m
                                                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                            )}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Quick Selection Footer */}
                        <div className="mt-4 pt-3 border-t border-border flex justify-between gap-2">
                            <button
                                onClick={() => { handleHourChange('09'); handleMinuteChange('00'); setIsOpen(false); }}
                                className="text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                            >
                                🕘 9AM
                            </button>
                            <button
                                onClick={() => { handleHourChange('12'); handleMinuteChange('00'); setIsOpen(false); }}
                                className="text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                            >
                                🕛 12PM
                            </button>
                            <button
                                onClick={() => { handleHourChange('17'); handleMinuteChange('00'); setIsOpen(false); }}
                                className="text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                            >
                                🕔 5PM
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
