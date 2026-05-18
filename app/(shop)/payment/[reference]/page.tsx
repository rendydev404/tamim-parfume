'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatRupiah } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  Loader2, Copy, Check, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, AlertTriangle, ShieldCheck,
  Home, Package, RefreshCw, ClipboardList
} from 'lucide-react'

interface PaymentInstruction {
  title: string
  steps: string[]
}

interface TransactionData {
  reference: string
  merchant_ref: string
  payment_method: string
  payment_name: string
  customer_name: string
  customer_email: string
  customer_phone: string
  amount: number
  fee_customer: number
  fee_merchant: number
  total_fee: number
  amount_received: number
  pay_code?: string
  pay_url?: string
  checkout_url: string
  status: string
  expired_time: number
  qr_string?: string
  qr_url?: string
  instructions?: PaymentInstruction[]
}

export default function PaymentPage() {
  const router = useRouter()
  const params = useParams()
  const reference = params.reference as string

  const [transaction, setTransaction] = useState<TransactionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [expired, setExpired] = useState(false)
  const [openInstruction, setOpenInstruction] = useState(0)
  const [paymentIconUrl, setPaymentIconUrl] = useState('')

  const fetchTransaction = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment/detail?reference=${reference}`)
      const json = await res.json()
      if (json.success && json.data) {
        setTransaction(json.data)
        if (json.data.status === 'PAID') {
          toast.success('Pembayaran berhasil dikonfirmasi!')
        }
        if (json.data.status === 'EXPIRED' || json.data.status === 'FAILED') {
          setExpired(true)
        }
      } else {
        setError('Transaksi tidak ditemukan')
      }
    } catch {
      setError('Gagal memuat data pembayaran')
    }
    setLoading(false)
  }, [reference])

  useEffect(() => {
    if (reference) fetchTransaction()
    // Fetch payment channels to get the official icon
    fetch('/api/payment/channels')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          // We'll match after transaction loads
          const channels = json.data
          // Store channels to match later
          channelsRef.current = channels
        }
      })
      .catch(() => {})
  }, [reference, fetchTransaction])

  // Use a ref to hold channels data
  const channelsRef = useRef<Array<{ code: string; icon_url: string }>>([])

  // Match icon when transaction loads
  useEffect(() => {
    if (transaction && channelsRef.current.length > 0 && !paymentIconUrl) {
      const match = channelsRef.current.find(
        (ch: { code: string }) => ch.code === transaction.payment_method
      )
      if (match) setPaymentIconUrl(match.icon_url)
    }
  }, [transaction, paymentIconUrl])

  // Poll every 5s for status
  useEffect(() => {
    if (!transaction || transaction.status === 'PAID' || expired) return
    const interval = setInterval(fetchTransaction, 5000)
    return () => clearInterval(interval)
  }, [transaction, expired, fetchTransaction])

  // Countdown timer
  useEffect(() => {
    if (!transaction || expired || transaction.status === 'PAID') return

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = transaction.expired_time - now

      if (diff <= 0) {
        setTimeLeft('00:00:00')
        setExpired(true)
        return
      }

      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60
      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [transaction, expired])

  const copyToClipboard = async (text: string, type: 'code' | 'amount') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'code') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        setCopiedAmount(true)
        setTimeout(() => setCopiedAmount(false), 2000)
      }
      toast.success('Berhasil disalin!')
    } catch {
      toast.error('Gagal menyalin')
    }
  }

  /* ——— Loading state ——— */
  if (loading) {
    return (
      <>
<main className="page-content">
          <div style={styles.centerWrap}>
            <div style={styles.loadingDot}>
              <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '16px', fontSize: '14px' }}>Memuat pembayaran…</p>
          </div>
        </main>
</>
    )
  }

  /* ——— Error state ——— */
  if (error || !transaction) {
    return (
      <>
<main className="page-content">
          <div style={styles.centerWrap}>
            <div style={{ ...styles.iconCircle, background: 'linear-gradient(135deg,#fef2f2,#fee2e2)' }}>
              <AlertTriangle size={32} style={{ color: '#ef4444' }} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginTop: '20px' }}>Transaksi Tidak Ditemukan</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '6px', maxWidth: 320, textAlign: 'center', lineHeight: 1.5 }}>
              {error || 'Data pembayaran tidak tersedia atau sudah kadaluarsa.'}
            </p>
            <div style={styles.btnRow}>
              <button className="btn btn-primary" onClick={() => router.push('/orders')} style={styles.btnPrimary}>
                <Package size={16} /> Pesanan Saya
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/')} style={styles.btnSecondary}>
                <Home size={16} /> Beranda
              </button>
            </div>
          </div>
        </main>
</>
    )
  }

  const isPaid = transaction.status === 'PAID'
  const isExpiredOrFailed = transaction.status === 'EXPIRED' || transaction.status === 'FAILED'
  const payCode = transaction.pay_code || ''

  /* ——————————————————————— RENDER ——————————————————————— */
  return (
    <>
<main className="page-content">
        <div style={styles.wrapper}>

          {/* ═══ PAID STATE ═══ */}
          {isPaid && (
            <div style={styles.stateCard}>
              {/* Animated success checkmark */}
              <div style={styles.successWrapper}>
                <div className="success-ring-1" />
                <div className="success-ring-2" />
                <svg className="success-checkmark" viewBox="0 0 52 52" width="80" height="80" fill="none">
                  <circle className="success-circle-svg" cx="26" cy="26" r="23" stroke="#10b981" strokeWidth="2.5" fill="none" />
                  <path className="success-check-path" d="M14 27l8 8 16-16" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '24px', color: 'var(--color-text)' }}>
                Pembayaran Berhasil!
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '8px', lineHeight: 1.5, maxWidth: 320, textAlign: 'center' }}>
                Terima kasih! Pembayaran Anda sebesar <strong style={{ color: 'var(--color-text)' }}>{formatRupiah(transaction.amount)}</strong> telah dikonfirmasi.
              </p>

              <div style={styles.refBadge}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Referensi</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>{transaction.reference}</span>
              </div>

              <div style={styles.btnRow}>
                <button onClick={() => router.push('/orders')} style={styles.btnPrimary}>
                  <Package size={16} /> Lihat Pesanan
                </button>
                <button onClick={() => router.push('/')} style={styles.btnGhost}>
                  <Home size={16} /> Kembali ke Beranda
                </button>
              </div>
            </div>
          )}

          {/* ═══ EXPIRED STATE ═══ */}
          {isExpiredOrFailed && (
            <div style={styles.stateCard}>
              <div style={styles.expiredCircle}>
                <XCircle size={44} style={{ color: '#fff' }} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '24px', color: 'var(--color-text)' }}>
                Pembayaran Kadaluarsa
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '8px', lineHeight: 1.5, maxWidth: 320, textAlign: 'center' }}>
                Batas waktu pembayaran telah berakhir. Silakan buat pesanan baru untuk melanjutkan.
              </p>

              <div style={styles.refBadge}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Referensi</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>{transaction.reference}</span>
              </div>

              <div style={styles.btnRow}>
                <button onClick={() => router.push('/orders')} style={styles.btnPrimary}>
                  <Package size={16} /> Lihat Pesanan
                </button>
                <button onClick={() => router.push('/')} style={styles.btnGhost}>
                  <Home size={16} /> Kembali ke Beranda
                </button>
              </div>
            </div>
          )}

          {/* ═══ UNPAID — MAIN PAYMENT VIEW ═══ */}
          {!isPaid && !isExpiredOrFailed && (
            <>
              {/* Heading */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Selesaikan Pembayaran</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>
                  Segera lakukan pembayaran sebelum batas waktu berakhir
                </p>
              </div>

              {/* Timer card */}
              <div style={styles.timerCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} style={{ color: timeLeft.startsWith('00:0') ? '#ef4444' : 'var(--color-primary)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Batas Waktu Pembayaran</span>
                </div>
                <div style={{
                  fontSize: '28px', fontWeight: 800, fontFamily: 'monospace',
                  color: timeLeft.startsWith('00:0') ? '#ef4444' : 'var(--color-text)',
                  letterSpacing: '3px', marginTop: '8px',
                }}>
                  {timeLeft}
                </div>
              </div>

              {/* Method + Amount card */}
              <div style={styles.card}>
                {/* Method */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Metode Pembayaran</p>
                    <p style={{ fontSize: '15px', fontWeight: 600 }}>{transaction.payment_name}</p>
                  </div>
                  {paymentIconUrl ? (
                    <img src={paymentIconUrl} alt={transaction.payment_name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }} />
                  ) : (
                    <div style={styles.methodBadge}>
                      {transaction.payment_name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={styles.divider} />

                {/* Total */}
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Total Pembayaran</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {formatRupiah(transaction.amount)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(String(transaction.amount), 'amount')}
                      style={{
                        ...styles.copyBtn,
                        background: copiedAmount ? '#10b98118' : 'var(--color-bg-secondary)',
                        color: copiedAmount ? '#10b981' : 'var(--color-text-secondary)',
                        border: copiedAmount ? '1px solid #10b98140' : '1px solid var(--color-border)',
                      }}
                    >
                      {copiedAmount ? <Check size={14} /> : <Copy size={14} />}
                      {copiedAmount ? 'Disalin' : 'Salin'}
                    </button>
                  </div>
                  {transaction.fee_customer > 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Termasuk biaya layanan {formatRupiah(transaction.fee_customer)}
                    </p>
                  )}
                </div>
              </div>

              {/* VA / Pay Code */}
              {payCode && (
                <div style={styles.card}>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Nomor Virtual Account
                  </p>
                  <div style={styles.codeBox}>
                    <span style={{
                      fontSize: '24px', fontWeight: 800, fontFamily: 'monospace',
                      letterSpacing: '3px', color: 'var(--color-text)',
                    }}>
                      {payCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(payCode, 'code')}
                      style={{
                        ...styles.copyBtnLarge,
                        background: copied ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark, #6d28d9))',
                      }}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Disalin!' : 'Salin'}
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '10px', textAlign: 'center' }}>
                    Pastikan nominal transfer sesuai hingga digit terakhir
                  </p>
                </div>
              )}

              {/* QRIS */}
              {transaction.qr_url && (
                <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                    Scan QR Code
                  </p>
                  <div style={styles.qrFrame}>
                    <img
                      src={transaction.qr_url}
                      alt="QR Code Pembayaran"
                      style={{ width: '200px', height: '200px', borderRadius: '8px' }}
                    />
                  </div>
                  {transaction.qr_string && (
                    <button
                      onClick={() => copyToClipboard(transaction.qr_string!, 'code')}
                      style={{ ...styles.copyBtn, marginTop: '14px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                    >
                      <Copy size={14} /> Salin QR String
                    </button>
                  )}
                </div>
              )}

              {/* Instructions accordion */}
              {transaction.instructions && transaction.instructions.length > 0 && (
                <div style={styles.card}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClipboardList size={16} /> Cara Pembayaran
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {transaction.instructions.map((instr, idx) => (
                      <div key={idx} style={{
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border-light)',
                        overflow: 'hidden',
                        background: openInstruction === idx ? 'var(--color-bg-secondary)' : 'transparent',
                        transition: 'all 0.2s ease',
                      }}>
                        <button
                          onClick={() => setOpenInstruction(openInstruction === idx ? -1 : idx)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', padding: '12px 14px',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            fontSize: '13px', fontWeight: 600, textAlign: 'left',
                            fontFamily: 'inherit', color: 'var(--color-text)',
                          }}
                        >
                          <span>{instr.title}</span>
                          {openInstruction === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {openInstruction === idx && (
                          <div style={{ padding: '0 14px 14px' }}>
                            <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {instr.steps.map((step, sIdx) => (
                                <li key={sIdx} style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}
                                  dangerouslySetInnerHTML={{ __html: step }} />
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction detail */}
              <div style={styles.card}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Detail Transaksi</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    ['No. Pesanan', `#${transaction.merchant_ref}`],
                    ['Referensi', transaction.reference],
                    ['Metode', transaction.payment_name],
                    ['Nama', transaction.customer_name],
                    ['Email', transaction.customer_email],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live status indicator */}
              <div style={styles.liveIndicator}>
                <div style={styles.liveDot} />
                <span>Status pembayaran diperbarui otomatis</span>
              </div>

              {/* Bottom buttons */}
              <div style={{ ...styles.btnRow, marginTop: '8px' }}>
                <button onClick={() => router.push('/orders')} style={styles.btnGhost}>
                  <Package size={16} /> Lihat Pesanan
                </button>
                <button onClick={() => router.push('/')} style={styles.btnGhost}>
                  <Home size={16} /> Kembali ke Beranda
                </button>
              </div>
            </>
          )}

        </div>
      </main>
<style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <style jsx global>{`
        /* Success checkmark animations */
        .success-ring-1, .success-ring-2 {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(16, 185, 129, 0.2);
        }
        .success-ring-1 {
          width: 100px; height: 100px;
          animation: ring-expand 2.5s ease-out infinite;
        }
        .success-ring-2 {
          width: 100px; height: 100px;
          animation: ring-expand 2.5s ease-out 0.8s infinite;
        }
        @keyframes ring-expand {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        .success-checkmark {
          position: relative; z-index: 2;
          filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3));
          animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes pop-in {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }

        .success-circle-svg {
          stroke-dasharray: 145;
          stroke-dashoffset: 145;
          animation: circle-draw 0.6s 0.3s ease forwards;
        }
        @keyframes circle-draw {
          to { stroke-dashoffset: 0; }
        }
        .success-check-path {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: check-draw 0.4s 0.75s ease forwards;
        }
        @keyframes check-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </>
  )
}

/* ——— Style objects ——— */
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    paddingTop: '24px', paddingBottom: '40px', maxWidth: '480px', margin: '0 auto', padding: '24px 16px 40px',
  },
  centerWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh',
  },
  loadingDot: {
    width: '72px', height: '72px', borderRadius: '50%',
    background: 'var(--color-bg-secondary)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircle: {
    width: '72px', height: '72px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stateCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '48px 24px 32px', borderRadius: '16px',
    background: 'var(--color-bg)', border: '1px solid var(--color-border-light)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  successWrapper: {
    position: 'relative' as const,
    width: '120px', height: '120px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  expiredCircle: {
    width: '88px', height: '88px', borderRadius: '50%',
    background: 'linear-gradient(135deg,#f87171,#dc2626)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 12px 32px rgba(239,68,68,0.3)',
  },
  refBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
    padding: '10px 20px', borderRadius: '8px',
    background: 'var(--color-bg-secondary)', marginTop: '20px',
    border: '1px solid var(--color-border-light)',
  },
  btnRow: {
    display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '24px',
  },
  btnPrimary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '14px 24px', borderRadius: '12px', border: 'none',
    background: '#111',
    color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
  },
  btnGhost: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '13px 24px', borderRadius: '12px',
    border: '1.5px solid var(--color-border)', background: 'transparent',
    color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  btnSecondary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '13px 24px', borderRadius: '12px',
    border: '1.5px solid var(--color-border)', background: 'var(--color-bg-secondary)',
    color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  timerCard: {
    textAlign: 'center' as const, padding: '20px',
    borderRadius: '14px', marginBottom: '16px',
    background: 'var(--color-bg)', border: '1px solid var(--color-border-light)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  card: {
    padding: '20px', borderRadius: '14px', marginBottom: '12px',
    background: 'var(--color-bg)', border: '1px solid var(--color-border-light)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  divider: {
    height: '1px', background: 'var(--color-border-light)', margin: '0',
  },
  methodBadge: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark, #6d28d9))',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontWeight: 700,
  },
  codeBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px', borderRadius: '12px', gap: '12px',
    background: 'var(--color-bg-secondary)',
    border: '2px dashed var(--color-border)',
  },
  copyBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '8px', border: 'none',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  },
  copyBtnLarge: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '10px 20px', borderRadius: '10px', border: 'none',
    color: '#fff', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
    whiteSpace: 'nowrap' as const,
  },
  qrFrame: {
    display: 'inline-flex', padding: '12px',
    background: '#ffffff', borderRadius: '12px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
  },
  liveIndicator: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    fontSize: '12px', color: 'var(--color-text-muted)',
    padding: '12px', marginBottom: '4px',
  },
  liveDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#10b981', animation: 'blink 2s infinite',
    boxShadow: '0 0 6px rgba(16,185,129,0.5)',
  },
}
