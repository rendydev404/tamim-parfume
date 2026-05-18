'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldAlert, MessageCircle, LogOut } from 'lucide-react'
import Link from 'next/link'

interface BanInfo {
  is_banned: boolean
  banned_until: string | null
  ban_reason: string | null
}

export default function BanOverlay() {
  const pathname = usePathname()
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkBanStatus()
  }, [])

  const checkBanStatus = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, banned_until, ban_reason')
        .eq('id', user.id)
        .single()

      if (profile?.is_banned) {
        // Check if ban has expired
        if (profile.banned_until) {
          const expiry = new Date(profile.banned_until).getTime()
          if (Date.now() >= expiry) {
            // Ban expired, auto-unban
            await supabase
              .from('profiles')
              .update({ is_banned: false, banned_until: null, ban_reason: null })
              .eq('id', user.id)
            setLoading(false)
            return
          }
        }
        setBanInfo(profile)
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }

  // Countdown timer
  useEffect(() => {
    if (!banInfo?.banned_until) return

    const updateCountdown = () => {
      const now = Date.now()
      const expiry = new Date(banInfo.banned_until!).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        // Ban expired, reload page
        setBanInfo(null)
        window.location.reload()
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeLeft(`${days} hari ${hours} jam ${minutes} menit ${seconds} detik`)
      } else if (hours > 0) {
        setTimeLeft(`${hours} jam ${minutes} menit ${seconds} detik`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes} menit ${seconds} detik`)
      } else {
        setTimeLeft(`${seconds} detik`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [banInfo?.banned_until])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading || !banInfo) return null

  // Don't show overlay on contact page so banned users can reach it
  if (pathname === '/hubungi-kami') return null

  // Don't show overlay on admin pages
  if (pathname?.startsWith('/admin')) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(0, 0, 0, 0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--color-bg, #fff)',
        borderRadius: '20px',
        padding: '40px 32px',
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
        animation: 'slideUp 0.4s ease',
      }}>
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <ShieldAlert size={36} style={{ color: '#dc2626' }} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '22px', fontWeight: 700, marginBottom: '8px',
          color: '#dc2626',
        }}>
          Akun Anda Di-suspend
        </h2>

        {/* Reason */}
        <p style={{
          fontSize: '14px', color: 'var(--color-text-secondary, #666)',
          marginBottom: '20px', lineHeight: 1.6,
        }}>
          {banInfo.ban_reason || 'Akun Anda telah di-suspend karena melanggar ketentuan layanan.'}
        </p>

        {/* Countdown */}
        {banInfo.banned_until ? (
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Akses akan dipulihkan dalam
            </p>
            <p style={{
              fontSize: '24px', fontWeight: 700, color: '#fff',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.02em',
            }}>
              {timeLeft || 'Menghitung...'}
            </p>
          </div>
        ) : (
          <div style={{
            background: '#fef2f2',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '24px',
            border: '1px solid #fecaca',
          }}>
            <p style={{ fontSize: '13px', color: '#991b1b', fontWeight: 500 }}>
              Suspend permanen — Hubungi kami untuk informasi lebih lanjut
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link
            href="/hubungi-kami"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #191919ff, #1e1e1eff)',
              color: '#fff', fontWeight: 600, fontSize: '14px',
              textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 14px rgba(0, 64, 192, 0.3)',
            }}
          >
            <MessageCircle size={18} />
            Hubungi Kami
          </Link>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', borderRadius: '12px',
              background: 'var(--color-bg-secondary, #f5f5f5)',
              color: 'var(--color-text-secondary, #666)',
              border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '14px',
              fontFamily: 'inherit',
            }}
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </div>
    </div>
  )
}
