import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { User, Shield, Info, LogOut, Heart } from 'lucide-react-native'
import { supabase } from '../api/supabase'
import { theme } from '../theme/colors'

const colors = theme.dark

export function SettingsScreen() {
  const [profile, setProfile] = useState<{ display_name: string; email?: string; role: string } | null>(null)

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, role')
          .eq('id', user.id)
          .single()
        setProfile({
          display_name: data?.display_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          role: data?.role || 'aegg',
        })
      }
    }
    getProfile()
  }, [])

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('Konfirmasi Logout', 'Apakah Anda yakin ingin keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pengaturan & Profil</Text>
        <Text style={styles.headerSubtitle}>AeggPepp Workspace v1.0.0</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {profile?.display_name?.charAt(0).toUpperCase() || 'A'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{profile?.display_name || 'Aegg & Peppaa'}</Text>
          <Text style={styles.profileEmail}>{profile?.email || 'aeggpepp@couple.space'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {profile?.role === 'aegg' ? '👨‍💻 Aegg (Engineer)' : '👩‍💼 Peppaa (PM Game Dev)'}
            </Text>
          </View>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.sectionCard}>
        <View style={styles.row}>
          <Shield size={18} color={colors.success} />
          <Text style={styles.rowLabel}>Database Supabase</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>Terhubung</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Heart size={18} color={colors.primary} />
          <Text style={styles.rowLabel}>Target Pernikahan</Text>
          <Text style={styles.rowValue}>Rp 25.000.000</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Info size={18} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Versi Aplikasi</Text>
          <Text style={styles.rowValue}>1.0.0 (Native Release)</Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <LogOut size={16} color={colors.destructive} />
        <Text style={styles.logoutText}>Keluar Akun</Text>
      </TouchableOpacity>

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
    marginBottom: 20,
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
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  roleText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.destructive,
  },
})
