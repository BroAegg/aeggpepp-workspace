import { APP_NAME } from '@/lib/constants'
import { Heart } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Side - Branding */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-primary p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern/Decoration */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">A</span>
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">{APP_NAME}</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Building Our <br/>
            Future, <span className="text-white/90">Together</span>
            <Heart className="inline-block ml-3 w-8 h-8 text-pink-300 animate-pulse" fill="currentColor" />
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm">
            A digital home for our dreams, plans, and every moment in between. Let’s organize our life with love and precision.
          </p>
        </div>

        <div className="space-y-8 relative z-10">
          <blockquote className="border-l-2 border-white/30 pl-6 italic">
            <p className="text-white/90 text-lg font-light leading-relaxed">
              "Love does not consist in gazing at each other, but in looking outward together in the same direction."
            </p>
            <footer className="mt-2 text-white/60 text-sm font-medium">— Antoine de Saint-Exupéry</footer>
          </blockquote>
          
          <div className="flex items-center gap-4 py-4 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm w-fit">
            <div className="flex -space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-primary text-xs font-bold text-primary">A</div>
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center border-2 border-primary text-xs font-bold text-pink-500">P</div>
            </div>
            <div className="flex flex-col">
              <span className="text-white/90 text-sm font-medium">Aegg & Peppaa</span>
              <span className="text-white/60 text-xs">Partners in Life & Code</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
         <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))] dark:bg-grid-slate-700/25 -z-10" />
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  )

}
