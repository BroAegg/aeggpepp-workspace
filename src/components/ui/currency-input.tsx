'use client'

import React, { useState, useEffect } from 'react'

interface CurrencyInputProps {
    name?: string
    value?: number
    onChange?: (value: number) => void
    defaultValue?: number
    placeholder?: string
    className?: string
    required?: boolean
}

function sanitizeCurrencyInput(inputStr: string): string {
    if (!inputStr) return ''
    let cleaned = inputStr.trim()
    // Strip currency symbols and whitespace
    cleaned = cleaned.replace(/^(?:Rp|IDR)\.?\s*/i, '')
    // Strip trailing cents (,00 or .00)
    cleaned = cleaned.replace(/[,.]00$/, '')
    // If Indonesian decimal comma followed by 1-2 digits, drop the decimal part
    if (cleaned.includes(',')) {
        const parts = cleaned.split(',')
        if (parts.length === 2 && parts[1].length <= 2) {
            cleaned = parts[0]
        }
    }
    // Remove non-digit characters
    return cleaned.replace(/\D/g, '')
}

export function CurrencyInput({
    name,
    value,
    onChange,
    defaultValue,
    placeholder = "0",
    className = '',
    required
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('')
    const [rawValue, setRawValue] = useState<string>('')

    // Handle external value control
    useEffect(() => {
        if (value !== undefined) {
            setRawValue(value.toString())
            setDisplayValue(value === 0 ? '' : formatNumber(value.toString()))
        } else if (defaultValue !== undefined) {
            setRawValue(defaultValue.toString())
            setDisplayValue(defaultValue === 0 ? '' : formatNumber(defaultValue.toString()))
        }
    }, [value, defaultValue])

    const formatNumber = (numStr: string) => {
        if (!numStr) return ''
        const n = Number(numStr)
        if (isNaN(n)) return ''
        return new Intl.NumberFormat('id-ID').format(n)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = sanitizeCurrencyInput(e.target.value)
        setRawValue(val)
        setDisplayValue(formatNumber(val))
        if (onChange) {
            onChange(val === '' ? 0 : Number(val))
        }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text')
        const val = sanitizeCurrencyInput(text)
        setRawValue(val)
        setDisplayValue(formatNumber(val))
        if (onChange) {
            onChange(val === '' ? 0 : Number(val))
        }
    }

    return (
        <>
            <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                onPaste={handlePaste}
                placeholder={placeholder}
                className={className}
                required={required}
                inputMode="numeric"
                autoComplete="off"
            />
            {/* Hidden input to ensure standard form submission works with the raw number */}
            {name && <input type="hidden" name={name} value={rawValue} />}
        </>
    )
}
