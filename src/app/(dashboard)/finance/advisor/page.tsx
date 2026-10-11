'use client'

import React from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { AdvisorTab } from '@/components/features/finance/advisor-tab'

export default function FinanceAdvisorPage() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/finance">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Finansial</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>AI Consultation Room</span>
          </div>
        </div>

        <AdvisorTab />
      </div>
    </div>
  )
}
