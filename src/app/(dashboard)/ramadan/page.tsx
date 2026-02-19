import { createClient } from '@/lib/supabase/server'
import { getRamadanLogs } from '@/lib/actions/ramadan'
import { RamadanView } from '@/components/features/ramadan/ramadan-view'
import { redirect } from 'next/navigation'

export default async function RamadanPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Identify role and partner
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // Determine partner ID (simple assumption for Aegg/Peppaa system)
    let partnerId: string | undefined

    if (profile?.role === 'aegg' || profile?.role === 'peppaa') {
        const partnerRole = profile.role === 'aegg' ? 'peppaa' : 'aegg'
        const { data: partner } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', partnerRole)
            .single()

        if (partner) {
            partnerId = partner.id
        }
    }

    const logs = await getRamadanLogs(user.id)

    return (
        <RamadanView
            userData={{ id: user.id, role: profile?.role || 'member', partnerId }}
            initialLogs={logs}
        />
    )
}
