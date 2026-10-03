import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Plus, ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react-native'
import { supabase } from '../api/supabase'
import { theme } from '../theme/colors'
import type { Transaction } from '../types'

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
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [saving, setSaving] = useState(false)

  const fetchTransactions = async () => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(10)
      if (data) setRecentTransactions(data as Transaction[])
    } catch (err) {
      console.error('Error fetching transactions:', err)
    }
  }

  useEffect(() => {
    fetchTransactions()
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
    const amount = parseInt(amountStr, 10)
    if (!amount || amount <= 0) {
      Alert.alert('Perhatian', 'Masukkan nominal pengeluaran')
      return
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Error', 'Sesi login tidak ditemukan')
        return
      }

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'expense',
        category: selectedCategory,
        amount,
        description: description.trim() || 'Pengeluaran Mobile',
        date: new Date().toISOString(),
        is_split: false,
        is_settled: true,
      })

      if (error) throw error

      setAmountStr('')
      setDescription('')
      fetchTransactions()
      Alert.alert('Berhasil', 'Pengeluaran berhasil dicatat!')
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finance & Quick Expense</Text>
        <Text style={styles.headerSubtitle}>Catat pengeluaran instan saat di kasir</Text>
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
          {saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
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
    marginBottom: 16,
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
  displayCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    gap: 8,
  },
  displayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  displayAmount: {
    fontSize: 28,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  catChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
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
    paddingVertical: 14,
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
    marginTop: 16,
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
