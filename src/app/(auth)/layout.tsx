import { APP_NAME } from '@/lib/constants'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-primary/5 via-background to-secondary">
      {/* Left Side - Branding */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-gradient-to-br from-primary to-primary/80 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-xl font-bold">A</span>
            </div>
            <span className="text-white text-xl font-semibold">{APP_NAME}</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Together, We Achieve More 💕
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Your personal couple productivity dashboard. Plan together, grow together, succeed together.
          </p>
        </div>

        <div className="space-y-6">
          <blockquote className="border-l-4 border-white/30 pl-4">
            <p className="text-white/90 italic mb-2">
              "The best relationships are built on shared goals and mutual support."
            </p>
          </blockquote>
          
          <div className="flex items-center gap-4 text-white/70 text-sm">
            <span>Aegg (Fullstack Engineer)</span>
            <span>•</span>
            <span>Peppaa (PM Game Developer)</span>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
