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

export function CurrencyInput({
    name,
    value,
    onChange,
    defaultValue,
    placeholder = "0",
    className,
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
            setDisplayValue(formatNumber(defaultValue.toString()))
        }
    }, [value, defaultValue])

    const formatNumber = (numStr: string) => {
        if (!numStr) return ''
        return new Intl.NumberFormat('id-ID').format(Number(numStr))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove non-digits (keep only numbers)
        const val = e.target.value.replace(/\D/g, '')

        // Update raw value
        setRawValue(val)

        // Update display value with formatting
        setDisplayValue(formatNumber(val))

        // Trigger onChange if provided
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
