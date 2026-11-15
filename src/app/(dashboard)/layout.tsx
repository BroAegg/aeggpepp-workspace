import { Sidebar } from '@/components/layout/sidebar'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { ActivityTracker } from '@/components/activity-tracker'
import { AuthProvider } from '@/providers/auth-provider'

import { ToastContainer } from '@/components/ui/toast'
import { RealtimeProvider } from '@/providers/realtime-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <div className="flex h-screen bg-background overflow-hidden">
          <Sidebar />
          <main className="flex-1 w-full flex flex-col min-w-0 overflow-hidden">
            {/* Children will include the Header for each page */}
            <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
              {children}
            </div>
          </main>
          <MobileBottomNav />
          <ActivityTracker />
          <ToastContainer />
        </div>
      </RealtimeProvider>
    </AuthProvider>
  )
}
