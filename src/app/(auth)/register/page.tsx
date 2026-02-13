'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signup } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Mail, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    // Default role - can be updated in settings later
    formData.append('role', 'member')
    
    try {
      const result = await signup(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // Success - redirect handled by server action
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-2xl border-0 bg-white/50 backdrop-blur-xl dark:bg-zinc-900/50">
      <CardHeader className="space-y-2 pb-6 text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Begin Our Journey</CardTitle>
        <CardDescription className="text-base">
          Create an account to join our shared universe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-4">
            <label htmlFor="display_name" className="text-sm font-semibold text-foreground/80 dark:text-foreground/90">
              Display Name
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="display_name"
                name="display_name"
                type="text"
                placeholder="Your name"
                className="pl-12 bg-background/50 border-input/60 focus:border-primary/50 focus:ring-primary/20 h-12"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-4">
            <label htmlFor="email" className="text-sm font-semibold text-foreground/80 dark:text-foreground/90">
              Email
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Must be at least 6 characters
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Creating your space...
              </>
            ) : (
              <>
                Start Our Story
                <UserPlus className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 pt-2">
        <div className="text-sm text-center text-muted-foreground w-full">
          <p className="mb-2">Already part of our story?</p>
          <Link href="/login" className="text-primary hover:text-primary/80 font-semibold hover:underline decoration-2 underline-offset-4 transition-colors">
            Welcome back home
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
