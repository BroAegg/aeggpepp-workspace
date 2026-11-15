import React from 'react'
import { cn } from '@/lib/utils'

export type BankCategory = 'digital_bank' | 'conventional_bank' | 'ewallet' | 'cash' | 'other'

export interface BankPreset {
  code: string
  name: string
  shortName: string
  category: BankCategory
  categoryLabel: string
  brandColor: string
  bgLight: string
  borderAccent: string
}

export const BANK_PRESETS: BankPreset[] = [
  // --- BANK DIGITAL ---
  {
    code: 'seabank',
    name: 'SeaBank',
    shortName: 'SEABANK',
    category: 'digital_bank',
    categoryLabel: 'Bank Digital',
    brandColor: '#FF5722',
    bgLight: 'bg-[#FF5722]/10 dark:bg-[#FF5722]/20',
    borderAccent: 'border-[#FF5722]/30',
  },
  {
    code: 'jago',
    name: 'Bank Jago',
    shortName: 'JAGO',
    category: 'digital_bank',
    categoryLabel: 'Bank Digital',
    brandColor: '#FF8400',
    bgLight: 'bg-[#FF8400]/10 dark:bg-[#FF8400]/20',
    borderAccent: 'border-[#FF8400]/30',
  },
  {
    code: 'blu',
    name: 'Blu by BCA Digital',
    shortName: 'BLU',
    category: 'digital_bank',
    categoryLabel: 'Bank Digital',
    brandColor: '#00A3E0',
    bgLight: 'bg-[#00A3E0]/10 dark:bg-[#00A3E0]/20',
    borderAccent: 'border-[#00A3E0]/30',
  },
  {
    code: 'krom',
    name: 'Krom Bank',
    shortName: 'KROM',
    category: 'digital_bank',
    categoryLabel: 'Bank Digital',
    brandColor: '#4A3AFF',
    bgLight: 'bg-[#4A3AFF]/10 dark:bg-[#4A3AFF]/20',
    borderAccent: 'border-[#4A3AFF]/30',
  },
  {
    code: 'superbank',
    name: 'Superbank',
    shortName: 'SUPER',
    category: 'digital_bank',
    categoryLabel: 'Bank Digital',
    brandColor: '#1E293B',
    bgLight: 'bg-slate-500/10 dark:bg-slate-400/20',
    borderAccent: 'border-slate-500/30',
  },
  {
    code: 'jenius',
    name: 'Jenius BTPN',
    shortName: 'JENIUS',
    category: 'digital_bank',
    categoryLabel: 'Bank Digital',
    brandColor: '#00A9E0',
    bgLight: 'bg-[#00A9E0]/10 dark:bg-[#00A9E0]/20',
    borderAccent: 'border-[#00A9E0]/30',
  },

  // --- BANK KONVENSIONAL & SYARIAH ---
  {
    code: 'bca',
    name: 'Bank BCA',
    shortName: 'BCA',
    category: 'conventional_bank',
    categoryLabel: 'Bank Konvensional',
    brandColor: '#0066AE',
    bgLight: 'bg-[#0066AE]/10 dark:bg-[#0066AE]/20',
    borderAccent: 'border-[#0066AE]/30',
  },
  {
    code: 'mandiri',
    name: 'Bank Mandiri',
    shortName: 'MANDIRI',
    category: 'conventional_bank',
    categoryLabel: 'Bank Konvensional',
    brandColor: '#003876',
    bgLight: 'bg-[#003876]/10 dark:bg-[#003876]/20',
    borderAccent: 'border-[#003876]/30',
  },
  {
    code: 'bri',
    name: 'Bank BRI',
    shortName: 'BRI',
    category: 'conventional_bank',
    categoryLabel: 'Bank Konvensional',
    brandColor: '#00529C',
    bgLight: 'bg-[#00529C]/10 dark:bg-[#00529C]/20',
    borderAccent: 'border-[#00529C]/30',
  },
  {
    code: 'bni',
    name: 'Bank BNI',
    shortName: 'BNI',
    category: 'conventional_bank',
    categoryLabel: 'Bank Konvensional',
    brandColor: '#F15A24',
    bgLight: 'bg-[#F15A24]/10 dark:bg-[#F15A24]/20',
    borderAccent: 'border-[#F15A24]/30',
  },
  {
    code: 'bsi',
    name: 'Bank Syariah Indonesia (BSI)',
    shortName: 'BSI',
    category: 'conventional_bank',
    categoryLabel: 'Bank Syariah',
    brandColor: '#00A39D',
    bgLight: 'bg-[#00A39D]/10 dark:bg-[#00A39D]/20',
    borderAccent: 'border-[#00A39D]/30',
  },
  {
    code: 'cimb',
    name: 'CIMB Niaga',
    shortName: 'CIMB',
    category: 'conventional_bank',
    categoryLabel: 'Bank Konvensional',
    brandColor: '#ED1C24',
    bgLight: 'bg-[#ED1C24]/10 dark:bg-[#ED1C24]/20',
    borderAccent: 'border-[#ED1C24]/30',
  },

  // --- E-WALLET & KAS ---
  {
    code: 'gopay',
    name: 'GoPay',
    shortName: 'GOPAY',
    category: 'ewallet',
    categoryLabel: 'E-Wallet',
    brandColor: '#00AED6',
    bgLight: 'bg-[#00AED6]/10 dark:bg-[#00AED6]/20',
    borderAccent: 'border-[#00AED6]/30',
  },
  {
    code: 'ovo',
    name: 'OVO',
    shortName: 'OVO',
    category: 'ewallet',
    categoryLabel: 'E-Wallet',
    brandColor: '#4C3494',
    bgLight: 'bg-[#4C3494]/10 dark:bg-[#4C3494]/20',
    borderAccent: 'border-[#4C3494]/30',
  },
  {
    code: 'dana',
    name: 'DANA',
    shortName: 'DANA',
    category: 'ewallet',
    categoryLabel: 'E-Wallet',
    brandColor: '#118EEA',
    bgLight: 'bg-[#118EEA]/10 dark:bg-[#118EEA]/20',
    borderAccent: 'border-[#118EEA]/30',
  },
  {
    code: 'shopeepay',
    name: 'ShopeePay',
    shortName: 'SPAY',
    category: 'ewallet',
    categoryLabel: 'E-Wallet',
    brandColor: '#EE4D2D',
    bgLight: 'bg-[#EE4D2D]/10 dark:bg-[#EE4D2D]/20',
    borderAccent: 'border-[#EE4D2D]/30',
  },
  {
    code: 'cash',
    name: 'Dompet Tunai / Kas',
    shortName: 'KAS',
    category: 'cash',
    categoryLabel: 'Uang Tunai',
    brandColor: '#10B981',
    bgLight: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    borderAccent: 'border-emerald-500/30',
  },
  {
    code: 'friend_loan',
    name: 'Piutang di Teman',
    shortName: 'PIUTANG',
    category: 'other',
    categoryLabel: 'Piutang',
    brandColor: '#D97706',
    bgLight: 'bg-amber-500/10 dark:bg-amber-500/20',
    borderAccent: 'border-amber-500/30',
  },
  {
    code: 'investment',
    name: 'Investasi / Portofolio',
    shortName: 'INVEST',
    category: 'other',
    categoryLabel: 'Investasi',
    brandColor: '#8B5CF6',
    bgLight: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderAccent: 'border-purple-500/30',
  },
  {
    code: 'other',
    name: 'Rekening Lainnya',
    shortName: 'LAINNYA',
    category: 'other',
    categoryLabel: 'Lainnya',
    brandColor: '#64748B',
    bgLight: 'bg-slate-500/10 dark:bg-slate-500/20',
    borderAccent: 'border-slate-500/30',
  },
]

export function getBankPreset(code?: string | null): BankPreset {
  if (!code) return BANK_PRESETS.find((b) => b.code === 'cash')!
  const found = BANK_PRESETS.find((b) => b.code.toLowerCase() === code.toLowerCase())
  if (found) return found
  return {
    code,
    name: code.toUpperCase(),
    shortName: code.slice(0, 4).toUpperCase(),
    category: 'other',
    categoryLabel: 'Lainnya',
    brandColor: '#64748B',
    bgLight: 'bg-slate-500/10 dark:bg-slate-500/20',
    borderAccent: 'border-slate-500/30',
  }
}

/**
 * Clean SVG Vector Logo for Indonesian Banks & E-Wallets
 * Designed with precise proportions, modern lettermarks, and brand fidelity (Anti-Slop).
 */
export function BankLogo({
  bankCode,
  className = 'w-6 h-6',
  variant = 'badge',
}: {
  bankCode?: string | null
  className?: string
  variant?: 'badge' | 'raw'
}) {
  const code = (bankCode || 'cash').toLowerCase()
  const preset = getBankPreset(code)

  const renderVector = () => {
    switch (code) {
      case 'seabank':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#FF5722" />
            <path
              d="M12 25.5C12 22 15.5 20.5 20 20.5C24.5 20.5 28 19 28 15.5C28 13 25.5 11 20 11C15 11 13 13 12.5 15"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M28 14.5C28 18 24.5 19.5 20 19.5C15.5 19.5 12 21 12 24.5C12 27 14.5 29 20 29C25 29 27 27 27.5 25"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </svg>
        )

      case 'jago':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#FF8400" />
            <path
              d="M23 12V23.5C23 26 21 28 18.5 28C16 28 14 26 14 23.5"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="23" cy="12" r="2.2" fill="#FFFFFF" />
            <circle cx="27" cy="18" r="2" fill="#FFE27A" />
          </svg>
        )

      case 'blu':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#00A3E0" />
            <text
              x="20"
              y="26"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="sans-serif"
              fontWeight="900"
              fontSize="16"
              letterSpacing="-0.5"
            >
              blu
            </text>
          </svg>
        )

      case 'krom':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#4A3AFF" />
            <path
              d="M14 12V28M14 20L25 12M17 18L26 28"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )

      case 'superbank':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#18181B" />
            <path
              d="M26 15C25 13 23 12 20 12C16 12 14 14 14 16.5C14 21 26 19 26 23.5C26 26.5 23.5 28 20 28C16.5 28 14 26.5 13.5 24"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </svg>
        )

      case 'jenius':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#00A9E0" />
            <circle cx="20" cy="20" r="10" stroke="#FFFFFF" strokeWidth="3" />
            <circle cx="26" cy="14" r="3.2" fill="#FFE200" />
          </svg>
        )

      case 'bca':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#0066AE" />
            <path
              d="M12 14L20 9L28 14V22C28 26 24 29 20 31C16 29 12 26 12 22V14Z"
              fill="#FFFFFF"
              fillOpacity="0.15"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <text
              x="20"
              y="25"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="sans-serif"
              fontWeight="900"
              fontSize="12"
              letterSpacing="0.5"
            >
              BCA
            </text>
          </svg>
        )

      case 'mandiri':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#003876" />
            <path
              d="M10 20C14 17 22 17 28 21"
              stroke="#FFB800"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <text
              x="20"
              y="28"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="sans-serif"
              fontWeight="800"
              fontSize="8.5"
              letterSpacing="0.8"
            >
              MANDIRI
            </text>
          </svg>
        )

      case 'bri':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#00529C" />
            <rect x="8" y="10" width="24" height="20" rx="4" stroke="#FFFFFF" strokeWidth="1.8" />
            <text
              x="20"
              y="24"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="sans-serif"
              fontWeight="900"
              fontSize="11"
              letterSpacing="0.5"
            >
              BRI
            </text>
          </svg>
        )

      case 'bni':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#005B60" />
            <text
              x="16"
              y="25"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="sans-serif"
              fontWeight="900"
              fontSize="11"
            >
              BNI
            </text>
            <circle cx="28" cy="20" r="5" fill="#F15A24" />
          </svg>
        )

      case 'bsi':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#00A39D" />
            <path
              d="M20 9L23 16L30 17L25 22L26 29L20 25L14 29L15 22L10 17L17 16L20 9Z"
              fill="#FFB800"
            />
            <text
              x="20"
              y="37"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="sans-serif"
              fontWeight="900"
              fontSize="8"
            >
              BSI
            </text>
          </svg>
        )

      case 'cimb':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#ED1C24" />
            <path
              d="M13 14L22 20L13 26V14Z"
              fill="#FFFFFF"
            />
            <path
              d="M21 14L27 20L21 26"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )

      case 'gopay':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#00AED6" />
            <circle cx="20" cy="20" r="9.5" stroke="#FFFFFF" strokeWidth="3" />
            <circle cx="20" cy="20" r="3.5" fill="#FFFFFF" />
          </svg>
        )

      case 'ovo':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#4C3494" />
            <circle cx="20" cy="20" r="10" stroke="#FFFFFF" strokeWidth="3.2" />
            <circle cx="20" cy="20" r="4" stroke="#FFFFFF" strokeWidth="2.4" />
          </svg>
        )

      case 'dana':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#118EEA" />
            <path
              d="M12 16C12 13.8 13.8 12 16 12H24C26.2 12 28 13.8 28 16V24C28 26.2 26.2 28 24 28H16C13.8 28 12 26.2 12 24V16Z"
              stroke="#FFFFFF"
              strokeWidth="2.4"
            />
            <circle cx="23" cy="20" r="2.2" fill="#FFFFFF" />
          </svg>
        )

      case 'shopeepay':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#EE4D2D" />
            <path
              d="M14 15V13C14 11 16 9 19 9H21C24 9 26 11 26 13V15"
              stroke="#FFFFFF"
              strokeWidth="2.2"
            />
            <rect x="11" y="14" width="18" height="17" rx="3.5" fill="#FFFFFF" />
            <path
              d="M21.5 19C21 18 20 17.5 19 17.5C17.5 17.5 16.5 18.5 16.5 19.8C16.5 22.5 23.5 21.5 23.5 24.5C23.5 26 22 27 20 27C18 27 17 26 16.5 25"
              stroke="#EE4D2D"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )

      case 'cash':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#10B981" />
            <rect x="10" y="13" width="20" height="14" rx="2.5" stroke="#FFFFFF" strokeWidth="2.2" />
            <circle cx="20" cy="20" r="3.2" stroke="#FFFFFF" strokeWidth="2" />
            <line x1="13" y1="20" x2="14" y2="20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="20" x2="27" y2="20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )

      case 'friend_loan':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#D97706" />
            <path
              d="M11 20L17 26L23 20M29 20L23 14L17 20"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )

      case 'investment':
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#8B5CF6" />
            <path
              d="M11 26L18 19L23 23L29 14M29 14H24M29 14V19"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )

      default:
        return (
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <rect width="40" height="40" rx="10" fill="#64748B" />
            <rect x="10" y="13" width="20" height="14" rx="3" stroke="#FFFFFF" strokeWidth="2.2" />
            <line x1="10" y1="18" x2="30" y2="18" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
        )
    }
  }

  if (variant === 'raw') {
    return <div className={cn('relative shrink-0 overflow-hidden', className)}>{renderVector()}</div>
  }

  return (
    <div
      className={cn(
        'relative shrink-0 rounded-xl overflow-hidden flex items-center justify-center p-0.5 shadow-2xs',
        className
      )}
    >
      {renderVector()}
    </div>
  )
}
