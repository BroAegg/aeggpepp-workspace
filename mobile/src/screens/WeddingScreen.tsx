import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import {
  DollarSign,
  Users,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
} from 'lucide-react-native'
import { supabase } from '../api/supabase'
import { theme } from '../theme/colors'
import type {
  WeddingBudgetItem,
  WeddingGuest,
  WeddingRundownItem,
  WeddingRsvpStatus,
} from '../types'

const TARGET_BUDGET = 25000000 // Rp 25.000.000 Target Anggaran
const TARGET_PAX = 180 // Skala 180 Pax Undangan Aegg & Peppaa
const colors = theme.dark

export function WeddingScreen() {
  const [activeTab, setActiveTab] = useState<'budget' | 'guests' | 'rundown'>('budget')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data
  const [budgetItems, setBudgetItems] = useState<WeddingBudgetItem[]>([])
  const [guests, setGuests] = useState<WeddingGuest[]>([])
  const [rundown, setRundown] = useState<WeddingRundownItem[]>([])

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const [budgetRes, guestsRes, rundownRes] = await Promise.all([
        supabase.from('wedding_budget_items').select('*').order('created_at', { ascending: true }),
        supabase.from('wedding_guests').select('*').order('created_at', { ascending: false }),
        supabase.from('wedding_rundown').select('*').order('time_start', { ascending: true }),
      ])

      if (budgetRes.data) setBudgetItems(budgetRes.data as WeddingBudgetItem[])
      if (guestsRes.data) setGuests(guestsRes.data as WeddingGuest[])
      if (rundownRes.data) setRundown(rundownRes.data as WeddingRundownItem[])
    } catch (err) {
      console.error('Error fetching wedding data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Calculations
  const totalActual = useMemo(() => {
    return budgetItems.reduce((acc, item) => {
      const cost = item.actual_cost && item.actual_cost > 0 ? item.actual_cost : item.estimated_cost
      return acc + (cost || 0)
    }, 0)
  }, [budgetItems])

  const totalPaid = useMemo(() => {
    return budgetItems.reduce((acc, item) => acc + (item.paid_amount || 0), 0)
  }, [budgetItems])

  const totalUnpaid = Math.max(0, totalActual - totalPaid)
  const percentUsed = Math.min(100, Math.round((totalActual / TARGET_BUDGET) * 100))

  const guestStats = useMemo(() => {
    const totalPax = guests.reduce((sum, g) => sum + (g.pax || 1), 0)
    const confirmedPax = guests
      .filter((g) => g.rsvp_status === 'attending')
      .reduce((sum, g) => sum + (g.pax || 1), 0)
    const pendingPax = guests
      .filter((g) => g.rsvp_status === 'pending')
      .reduce((sum, g) => sum + (g.pax || 1), 0)
    const declinedPax = guests
      .filter((g) => g.rsvp_status === 'declined')
      .reduce((sum, g) => sum + (g.pax || 1), 0)

    return { totalPax, confirmedPax, pendingPax, declinedPax }
  }, [guests])

  // Handlers
  const handleToggleRsvp = async (guest: WeddingGuest) => {
    // Tactile Haptic Feedback (Game-feel!)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const nextStatus: WeddingRsvpStatus =
      guest.rsvp_status === 'attending'
        ? 'declined'
        : guest.rsvp_status === 'declined'
        ? 'pending'
        : 'attending'

    // Optimistic UI
    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, rsvp_status: nextStatus } : g))
    )

    try {
      await supabase.from('wedding_guests').update({ rsvp_status: nextStatus }).eq('id', guest.id)
    } catch {
      fetchData()
    }
  }

  const handleOpenWhatsApp = (phone: string, guestName?: string) => {
    Haptics.selectionAsync()
    let clean = phone.replace(/\D/g, '')
    if (clean.startsWith('0')) clean = '62' + clean.slice(1)

    const text = guestName
      ? `Halo ${guestName}, kami mengundang Anda untuk menghadiri pernikahan kami (Aegg & Peppaa). Mohon konfirmasi kehadirannya ya!`
      : 'Halo, saya ingin menanyakan perihal wedding kami.'

    Linking.openURL(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Wedding Preparation</Text>
          <Text style={styles.headerSubtitle}>Target Anggaran Rp 25.000.000 • Aegg & Peppaa</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            fetchData()
          }}
          style={styles.refreshButton}
        >
          <RefreshCw size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Segment Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            setActiveTab('budget')
          }}
          style={[styles.tabButton, activeTab === 'budget' && styles.tabButtonActive]}
        >
          <DollarSign size={14} color={activeTab === 'budget' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'budget' && styles.tabTextActive]}>
            Budget 25Jt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            setActiveTab('guests')
          }}
          style={[styles.tabButton, activeTab === 'guests' && styles.tabButtonActive]}
        >
          <Users size={14} color={activeTab === 'guests' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'guests' && styles.tabTextActive]}>
            Tamu ({guestStats.confirmedPax}/{guestStats.totalPax})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            setActiveTab('rundown')
          }}
          style={[styles.tabButton, activeTab === 'rundown' && styles.tabButtonActive]}
        >
          <Clock size={14} color={activeTab === 'rundown' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'rundown' && styles.tabTextActive]}>
            Rundown ({rundown.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat persiapan pernikahan...</Text>
        </View>
      ) : (
        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
          {/* TAB 1: BUDGET */}
          {activeTab === 'budget' && (
            <View style={styles.tabContent}>
              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.labelMuted}>TARGET ANGGARAN</Text>
                    <Text style={styles.summaryAmount}>{formatCurrency(TARGET_BUDGET)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.labelMuted}>REALISASI / EST.</Text>
                    <Text style={[styles.summaryAmount, { color: colors.primary }]}>
                      {formatCurrency(totalActual)}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${percentUsed}%` }]} />
                </View>

                <View style={styles.summarySubRow}>
                  <Text style={styles.subRowText}>
                    Terbayar: <Text style={{ color: colors.success }}>{formatCurrency(totalPaid)}</Text>
                  </Text>
                  <Text style={styles.subRowText}>
                    Sisa Tagihan:{' '}
                    <Text style={{ color: colors.warning }}>{formatCurrency(totalUnpaid)}</Text>
                  </Text>
                </View>
              </View>

              {/* Items List */}
              <Text style={styles.sectionTitle}>Rincian Pos Pengeluaran ({budgetItems.length})</Text>

              {budgetItems.map((item) => {
                const cost =
                  item.actual_cost && item.actual_cost > 0 ? item.actual_cost : item.estimated_cost
                const unpaid = Math.max(0, cost - (item.paid_amount || 0))

                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        {item.notes ? (
                          <Text style={styles.itemNotes}>{item.notes}</Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === 'paid_off'
                            ? styles.badgeSuccess
                            : item.status === 'booked_dp'
                            ? styles.badgeWarning
                            : styles.badgeMuted,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            item.status === 'paid_off'
                              ? { color: colors.success }
                              : item.status === 'booked_dp'
                              ? { color: colors.warning }
                              : { color: colors.textMuted },
                          ]}
                        >
                          {item.status === 'paid_off'
                            ? 'Lunas'
                            : item.status === 'booked_dp'
                            ? 'Sudah DP'
                            : 'Rencana'}
                        </Text>
                      </View>
                    </View>

                    {item.vendor_name ? (
                      <View style={styles.vendorRow}>
                        <Text style={styles.vendorText}>Vendor: {item.vendor_name}</Text>
                        {item.vendor_contact ? (
                          <TouchableOpacity
                            onPress={() => handleOpenWhatsApp(item.vendor_contact!)}
                            style={styles.waLink}
                          >
                            <Phone size={12} color={colors.success} />
                            <Text style={styles.waLinkText}>WA Vendor</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={styles.itemFooter}>
                      <Text style={styles.costText}>Kebutuhan: {formatCurrency(cost)}</Text>
                      {unpaid > 0 ? (
                        <Text style={[styles.costText, { color: colors.warning }]}>
                          Sisa: {formatCurrency(unpaid)}
                        </Text>
                      ) : (
                        <Text style={[styles.costText, { color: colors.success }]}>✓ Lunas</Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* TAB 2: GUESTS */}
          {activeTab === 'guests' && (
            <View style={styles.tabContent}>
              {/* Guest Metrics */}
              <View style={styles.guestStatsGrid}>
                <View style={styles.guestStatCard}>
                  <Text style={styles.guestStatLabel}>Target</Text>
                  <Text style={[styles.guestStatValue, { color: colors.text }]}>
                    {TARGET_PAX}
                  </Text>
                </View>
                <View style={styles.guestStatCard}>
                  <Text style={styles.guestStatLabel}>Hadir</Text>
                  <Text style={[styles.guestStatValue, { color: colors.success }]}>
                    {guestStats.confirmedPax}
                  </Text>
                </View>
                <View style={styles.guestStatCard}>
                  <Text style={styles.guestStatLabel}>Menunggu</Text>
                  <Text style={[styles.guestStatValue, { color: colors.warning }]}>
                    {guestStats.pendingPax}
                  </Text>
                </View>
                <View style={styles.guestStatCard}>
                  <Text style={styles.guestStatLabel}>Batal</Text>
                  <Text style={[styles.guestStatValue, { color: colors.destructive }]}>
                    {guestStats.declinedPax}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Daftar Tamu Undangan ({guests.length})</Text>

              {guests.map((g) => (
                <View key={g.id} style={styles.guestCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestName}>{g.name}</Text>
                    <Text style={styles.guestGroup}>
                      {g.group_type.replace('_', ' ').toUpperCase()} • {g.pax || 1} Pax
                    </Text>
                    {g.notes ? <Text style={styles.guestNotes}>{g.notes}</Text> : null}
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    {/* RSVP Toggle Button */}
                    <TouchableOpacity
                      onPress={() => handleToggleRsvp(g)}
                      style={[
                        styles.rsvpButton,
                        g.rsvp_status === 'attending'
                          ? styles.badgeSuccess
                          : g.rsvp_status === 'declined'
                          ? styles.badgeDestructive
                          : styles.badgeWarning,
                      ]}
                    >
                      <Text
                        style={[
                          styles.rsvpButtonText,
                          g.rsvp_status === 'attending'
                            ? { color: colors.success }
                            : g.rsvp_status === 'declined'
                            ? { color: colors.destructive }
                            : { color: colors.warning },
                        ]}
                      >
                        {g.rsvp_status === 'attending'
                          ? '✓ Hadir'
                          : g.rsvp_status === 'declined'
                          ? '✕ Berhalangan'
                          : '⏱ Menunggu'}
                      </Text>
                    </TouchableOpacity>

                    {g.phone ? (
                      <TouchableOpacity
                        onPress={() => handleOpenWhatsApp(g.phone!, g.name)}
                        style={styles.waLink}
                      >
                        <Phone size={12} color={colors.success} />
                        <Text style={styles.waLinkText}>Kirim WA</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TAB 3: RUNDOWN */}
          {activeTab === 'rundown' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Susunan Acara Hari-H ({rundown.length} Sesi)</Text>

              {rundown.map((item, idx) => (
                <View key={item.id} style={styles.rundownCard}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeText}>
                      {item.time_start} {item.time_end ? `– ${item.time_end}` : ''}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.rundownTitle}>{item.title}</Text>
                    {item.pic ? (
                      <Text style={styles.rundownPic}>PIC: {item.pic}</Text>
                    ) : null}
                    {item.notes ? (
                      <Text style={styles.rundownNotes}>{item.notes}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  tabButtonActive: {
    backgroundColor: colors.cardBorder,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelMuted: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  summarySubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  subRowText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itemNotes: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeMuted: {
    backgroundColor: 'rgba(161, 161, 170, 0.1)',
    borderColor: 'rgba(161, 161, 170, 0.3)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  vendorText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  waLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waLinkText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  costText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  guestStatsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  guestStatCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  guestStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  guestStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  guestCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  guestGroup: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  guestNotes: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  rsvpButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  rsvpButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rundownCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  timeBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  rundownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  rundownPic: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  rundownNotes: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
})
