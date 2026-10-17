import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Wallet,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react-native'
import { supabase } from '../api/supabase'
import { theme } from '../theme/colors'
import type { Transaction, SavingsAccount } from '../types'

const colors = theme.dark

const CATEGORIES = [
  { id: 'food', label: '🍔 Makan' },
  { id: 'daily_needs', label: '🛒 Belanja' },
  { id: 'transport', label: '🛵 Transport' },
  { id: 'wedding', label: '💍 Wedding' },
  { id: 'bills', label: '⚡ Tagihan' },
  { id: 'other', label: '📦 Lainnya' },
]

export function FinanceScreen() {
  const [amountStr, setAmountStr] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('food')
  const [description, setDescription] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [saving, setSaving] = useState(false)
  const isSubmittingRef = useRef(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const [txRes, accountsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false })
          .limit(10),
        supabase
          .from('savings_accounts')
          .select('*')
          .order('balance', { ascending: false }),
      ])

      if (txRes.data) {
        setRecentTransactions(txRes.data as Transaction[])
      }

      if (accountsRes.data) {
        const accs = accountsRes.data as SavingsAccount[]
        setSavingsAccounts(accs)
        // Default to first account if none selected
        if (!selectedAccountId && accs.length > 0) {
          setSelectedAccountId(accs[0].id)
        }
      }
    } catch (err) {
      console.error('Error fetching finance data:', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleNumpadPress = (val: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (val === 'DEL') {
      setAmountStr((prev) => prev.slice(0, -1))
    } else {
      setAmountStr((prev) => prev + val)
    }
  }

  const handleSaveTransaction = async () => {
    if (isSubmittingRef.current) return
    const amount = parseInt(amountStr, 10)
    if (!amount || amount <= 0) {
      Alert.alert('Perhatian', 'Masukkan nominal pengeluaran')
      return
    }

    isSubmittingRef.current = true
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Error', 'Sesi login tidak ditemukan')
        return
      }

      const selectedAcc = savingsAccounts.find((a) => a.id === selectedAccountId)
      const pocketLabel = selectedAcc ? ` [${selectedAcc.name}]` : ''
      const finalDesc = (description.trim() || 'Pengeluaran Mobile') + pocketLabel

      // 1. Insert transaction
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'expense',
        category: selectedCategory,
        amount,
        description: finalDesc,
        date: new Date().toISOString(),
        is_split: false,
        is_settled: true,
      })

      if (txError) throw txError

      // 2. Deduct balance from selected pocket if chosen
      if (selectedAcc) {
        const newBalance = (selectedAcc.balance || 0) - amount
        await supabase
          .from('savings_accounts')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', selectedAcc.id)

        // Log savings transaction
        await supabase.from('savings_transactions').insert({
          account_id: selectedAcc.id,
          user_id: user.id,
          amount,
          type: 'withdraw',
          description: `Pengeluaran: ${description.trim() || selectedCategory}`,
          date: new Date().toISOString().split('T')[0],
        })
      }

      setAmountStr('')
      setDescription('')
      fetchData()
      Alert.alert('Tersimpan! ✨', `Pengeluaran ${formatCurrency(amount)} berhasil dicatat${selectedAcc ? ` dan memotong saldo ${selectedAcc.name}` : ''}.`)
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
      isSubmittingRef.current = false
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  const totalLiquid = savingsAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0)

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finance & Asset Pockets</Text>
        <Text style={styles.headerSubtitle}>Pantau lokasi uang & catat pengeluaran kasir</Text>
      </View>

      {/* Asset Pockets Overview ("Di Mana Uang Kita?") */}
      <View style={styles.pocketsContainer}>
        <View style={styles.totalRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Wallet size={16} color={colors.primary} />
            <Text style={styles.pocketsTitle}>TOTAL DANA LIKUID</Text>
          </View>
          <Text style={styles.totalAmount}>{formatCurrency(totalLiquid)}</Text>
        </View>

        {savingsAccounts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pocketScroll}>
            {savingsAccounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id
              return (
                <TouchableOpacity
                  key={acc.id}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setSelectedAccountId(acc.id)
                  }}
                  style={[
                    styles.pocketCard,
                    isSelected && styles.pocketCardActive,
                  ]}
                >
                  <Text style={styles.pocketName} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={[styles.pocketBalance, isSelected && { color: colors.primary }]}>
                    {formatCurrency(acc.balance)}
                  </Text>
                  <Text style={styles.pocketType}>
                    {acc.type === 'bank' ? '🏦 Bank' : acc.type === 'ewallet' ? '📱 E-Wallet' : acc.type === 'friend_loan' ? '🤝 Di Teman' : '💵 Tunai'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        ) : (
          <Text style={styles.emptyPocketsText}>Belum ada kantong tabungan/rekening terdaftar.</Text>
        )}
      </View>

      {/* Input Display Card */}
      <View style={styles.displayCard}>
        <Text style={styles.displayLabel}>NOMINAL PENGELUARAN (RP)</Text>
        <Text style={styles.displayAmount}>
          {amountStr ? formatCurrency(parseInt(amountStr, 10)) : 'Rp 0'}
        </Text>
        <TextInput
          placeholder="Catatan belanja (opsional)..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          style={styles.descInput}
        />
      </View>

      {/* Active Paying Pocket Indicator */}
      {savingsAccounts.length > 0 && (
        <View style={styles.payingFromBar}>
          <Text style={styles.payingFromLabel}>POTONG DARI:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginLeft: 8 }}>
            {savingsAccounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id
              return (
                <TouchableOpacity
                  key={acc.id}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setSelectedAccountId(acc.id)
                  }}
                  style={[styles.miniPocketChip, isSelected && styles.miniPocketChipActive]}
                >
                  <Text style={[styles.miniPocketChipText, isSelected && styles.miniPocketChipTextActive]}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Category Pills */}
      <Text style={styles.sectionHeader}>Kategori</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => {
              Haptics.selectionAsync()
              setSelectedCategory(cat.id)
            }}
            style={[
              styles.catChip,
              selectedCategory === cat.id && styles.catChipActive,
            ]}
          >
            <Text
              style={[
                styles.catChipText,
                selectedCategory === cat.id && styles.catChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Custom Numpad */}
      <View style={styles.numpadGrid}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'DEL'].map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => handleNumpadPress(key)}
            style={styles.numpadKey}
          >
            <Text style={styles.numpadKeyText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSaveTransaction}
        disabled={saving || !amountStr}
        style={[styles.saveButton, (!amountStr || saving) && { opacity: 0.5 }]}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Menyimpan & Memotong Saldo...' : 'Simpan Pengeluaran'}
        </Text>
      </TouchableOpacity>

      {/* Recent Transactions List */}
      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Riwayat Terakhir</Text>
      {recentTransactions.map((tx) => (
        <View key={tx.id} style={styles.txCard}>
          <View style={styles.txIconCircle}>
            <ArrowDownRight size={18} color={colors.destructive} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.txTitle}>{tx.description || tx.category}</Text>
            <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString('id-ID')}</Text>
          </View>
          <Text style={styles.txAmount}>-{formatCurrency(tx.amount)}</Text>
        </View>
      ))}

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
  header: {
    marginBottom: 14,
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
  pocketsContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pocketsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  pocketScroll: {
    flexDirection: 'row',
  },
  pocketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 110,
  },
  pocketCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
  },
  pocketName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  pocketBalance: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  pocketType: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyPocketsText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  payingFromBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  payingFromLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  miniPocketChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 6,
  },
  miniPocketChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  miniPocketChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  miniPocketChipTextActive: {
    color: '#ffffff',
  },
  displayCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    gap: 8,
  },
  displayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  displayAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  descInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 14,
    marginBottom: 8,
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  catChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catChipActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  catChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  numpadKey: {
    width: '31%',
    backgroundColor: colors.card,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  numpadKeyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
    gap: 12,
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  txDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.destructive,
  },
})
