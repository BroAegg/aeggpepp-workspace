import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import {
  Gem,
  Wallet,
  CheckSquare,
  Sparkles,
  Heart,
  TrendingUp,
} from 'lucide-react-native'
import { supabase } from '../api/supabase'
import { theme } from '../theme/colors'

const colors = theme.dark

export function HomeScreen({ navigation }: any) {
  const [userProfile, setUserProfile] = useState<{ display_name: string; role: string } | null>(null)
  const [weddingBudgetTotal, setWeddingBudgetTotal] = useState(0)
  const [guestCount, setGuestCount] = useState(0)
  const [todoCount, setTodoCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOverview = async () => {
    try {
      setRefreshing(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, role')
          .eq('id', user.id)
          .single()
        if (profile) setUserProfile(profile)
      }

      // Fetch overview counts
      const [budgetRes, guestsRes, todosRes] = await Promise.all([
        supabase.from('wedding_budget_items').select('actual_cost, estimated_cost'),
        supabase.from('wedding_guests').select('pax, rsvp_status'),
        supabase.from('todos').select('id').eq('completed', false),
      ])

      if (budgetRes.data) {
        const total = budgetRes.data.reduce(
          (acc, item) => acc + (item.actual_cost && item.actual_cost > 0 ? item.actual_cost : item.estimated_cost),
          0
        )
        setWeddingBudgetTotal(total)
      }

      if (guestsRes.data) {
        const confirmed = guestsRes.data
          .filter((g) => g.rsvp_status === 'attending')
          .reduce((sum, g) => sum + (g.pax || 1), 0)
        setGuestCount(confirmed)
      }

      if (todosRes.data) {
        setTodoCount(todosRes.data.length)
      }
    } catch (err) {
      console.error('Error fetching home overview:', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={fetchOverview}
          tintColor={colors.primary}
        />
      }
    >
      {/* Top Greeting */}
      <View style={styles.topHeader}>
        <View>
          <View style={styles.badgeRow}>
            <Heart size={14} color={colors.primary} />
            <Text style={styles.badgeText}>AeggPepp Space</Text>
          </View>
          <Text style={styles.greetingTitle}>
            Halo, {userProfile?.display_name || 'Aegg & Peppaa'}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            Workspace pribadi & persiapan pernikahan kita berdua
          </Text>
        </View>
      </View>

      {/* Wedding Highlight Banner */}
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync()
          navigation?.navigate('Wedding')
        }}
        activeOpacity={0.8}
        style={styles.weddingBanner}
      >
        <View style={styles.weddingBannerHeader}>
          <View style={styles.iconCircle}>
            <Gem size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTag}>TARGET 25 JUTA INTIMATE</Text>
            <Text style={styles.bannerTitle}>Wedding Preparation Hub</Text>
          </View>
        </View>

        <View style={styles.bannerStatsRow}>
          <View>
            <Text style={styles.bannerStatLabel}>Total Kebutuhan</Text>
            <Text style={styles.bannerStatValue}>{formatCurrency(weddingBudgetTotal)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.bannerStatLabel}>Tamu Hadir</Text>
            <Text style={[styles.bannerStatValue, { color: colors.success }]}>
              {guestCount} Pax Terdata
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick Action Grid */}
      <Text style={styles.sectionHeader}>Akses Cepat</Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            navigation?.navigate('Finance')
          }}
          style={styles.quickCard}
        >
          <Wallet size={22} color={colors.warning} />
          <Text style={styles.quickTitle}>Catat Belanja</Text>
          <Text style={styles.quickSubtitle}>Input cepat kasir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            navigation?.navigate('Todos')
          }}
          style={styles.quickCard}
        >
          <CheckSquare size={22} color={colors.accent} />
          <Text style={styles.quickTitle}>Tugas & Belanja</Text>
          <Text style={styles.quickSubtitle}>{todoCount} belum selesai</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            navigation?.navigate('Wedding')
          }}
          style={styles.quickCard}
        >
          <Gem size={22} color={colors.primary} />
          <Text style={styles.quickTitle}>Checklist Akad</Text>
          <Text style={styles.quickSubtitle}>Rundown & vendor</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  topHeader: {
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  weddingBanner: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    marginBottom: 24,
    gap: 16,
  },
  weddingBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  bannerTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  bannerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  bannerStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  bannerStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  quickSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
})
