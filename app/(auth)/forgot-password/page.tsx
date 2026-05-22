'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, KeyRound, ShieldCheck, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

type Step = 'email' | 'otp' | 'password' | 'success'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [resetToken, setResetToken] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    }
  }, [step])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Gagal mengirim kode OTP')
        return
      }

      toast.success('Kode OTP telah dikirim ke email Anda')
      setStep('otp')
      setCountdown(60)
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste - distribute digits across inputs
      const digits = value.replace(/\D/g, '').slice(0, 4)
      const newOtp = [...otp]
      for (let i = 0; i < digits.length && index + i < 4; i++) {
        newOtp[index + i] = digits[i]
      }
      setOtp(newOtp)
      // Focus the next empty input or the last filled one
      const nextIndex = Math.min(index + digits.length, 3)
      otpRefs.current[nextIndex]?.focus()
      return
    }

    if (value && !/^\d$/.test(value)) return // Only allow single digits

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
      const newOtp = [...otp]
      newOtp[index - 1] = ''
      setOtp(newOtp)
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pastedData.length > 0) {
      const newOtp = [...otp]
      for (let i = 0; i < pastedData.length && i < 4; i++) {
        newOtp[i] = pastedData[i]
      }
      setOtp(newOtp)
      const focusIndex = Math.min(pastedData.length, 3)
      otpRefs.current[focusIndex]?.focus()
    }
  }

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resetToken, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Gagal mengubah password')
        return
      }

      setStep('success')
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0) return
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Kode OTP baru telah dikirim')
        setCountdown(60)
        setOtp(['', '', '', ''])
        otpRefs.current[0]?.focus()
      } else {
        toast.error(data.error || 'Gagal mengirim ulang kode OTP')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const otpCode = otp.join('')

  // Step indicators
  const steps = [
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'otp', label: 'Verifikasi', icon: KeyRound },
    { key: 'password', label: 'Password Baru', icon: ShieldCheck },
  ]

  const currentStepIndex = step === 'email' ? 0 : step === 'otp' ? 1 : step === 'password' ? 2 : 3

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px',
          textDecoration: 'none',
        }}>
          <ArrowLeft size={16} /> Kembali ke Login
        </Link>

        <h1 className="auth-card__logo">TAMIM PARFUME</h1>

        {step !== 'success' && (
          <>
            <p className="auth-card__subtitle">Atur Ulang Password</p>

            {/* Step Indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0', marginBottom: '28px', marginTop: '8px',
            }}>
              {steps.map((s, i) => {
                const Icon = s.icon
                const isActive = i === currentStepIndex
                const isDone = i < currentStepIndex
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isActive
                          ? 'var(--color-primary)'
                          : isDone
                            ? 'var(--color-primary)'
                            : 'var(--color-bg-secondary)',
                        color: isActive || isDone ? '#fff' : 'var(--color-text-muted)',
                        border: isActive
                          ? '2px solid var(--color-primary)'
                          : isDone
                            ? '2px solid var(--color-primary)'
                            : '2px solid var(--color-border)',
                        transition: 'all 0.3s ease',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}>
                        {isDone ? <CheckCircle2 size={18} /> : <Icon size={16} />}
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                        whiteSpace: 'nowrap',
                      }}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div style={{
                        width: '40px', height: '2px',
                        background: i < currentStepIndex ? 'var(--color-primary)' : 'var(--color-border)',
                        margin: '0 6px', marginBottom: '18px',
                        transition: 'background 0.3s ease',
                        borderRadius: '1px',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* STEP 1: Enter Email */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{
              fontSize: '13px', color: 'var(--color-text-secondary)',
              textAlign: 'center', margin: '0 0 4px 0', lineHeight: 1.5,
            }}>
              Masukkan email yang terdaftar. Kami akan mengirimkan kode OTP untuk mengatur ulang password Anda.
            </p>

            <div className="input-group">
              <label className="input-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)', pointerEvents: 'none',
                }} />
                <input
                  type="email"
                  className="input"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Mengirim...</> : 'Kirim Kode OTP'}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent, var(--color-primary)))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Mail size={24} style={{ color: '#fff' }} />
              </div>
              <p style={{
                fontSize: '13px', color: 'var(--color-text-secondary)',
                lineHeight: 1.5, margin: 0,
              }}>
                Kode OTP telah dikirim ke<br />
                <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
              </p>
              <p style={{
                fontSize: '11px', color: 'var(--color-text-muted)',
                margin: '8px 0 0 0',
              }}>
                Cek folder inbox atau spam pada email Anda
              </p>
            </div>

            {/* OTP Inputs */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '12px',
            }} onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  style={{
                    width: '54px', height: '56px',
                    textAlign: 'center', fontSize: '24px', fontWeight: 700,
                    borderRadius: 'var(--radius-md)',
                    border: digit
                      ? '2px solid var(--color-primary)'
                      : '2px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    caretColor: 'var(--color-primary)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-primary)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb, 0,0,0), 0.15)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = digit ? 'var(--color-primary)' : 'var(--color-border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              ))}
            </div>

            {/* Resend & Continue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={async () => {
                  if (otpCode.length !== 4) {
                    toast.error('Masukkan 4 digit kode OTP')
                    return
                  }
                  setLoading(true)
                  try {
                    const res = await fetch('/api/auth/verify-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email, otp: otpCode }),
                    })
                    const data = await res.json()
                    if (!res.ok) {
                      toast.error(data.error || 'Kode OTP tidak valid')
                      return
                    }
                    setResetToken(data.resetToken)
                    setStep('password')
                  } catch {
                    toast.error('Terjadi kesalahan saat verifikasi')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="btn btn-primary btn-full btn-lg"
                disabled={otpCode.length !== 4 || loading}
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Memverifikasi...</> : 'Verifikasi OTP'}
              </button>

              <div style={{ textAlign: 'center' }}>
                {countdown > 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                    Kirim ulang kode dalam <strong style={{ color: 'var(--color-text)' }}>{countdown}s</strong>
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={loading}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)',
                      fontFamily: 'inherit', padding: '4px',
                      textDecoration: 'underline', textUnderlineOffset: '2px',
                    }}
                  >
                    {loading ? 'Mengirim...' : 'Kirim Ulang Kode OTP'}
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => { setStep('email'); setOtp(['', '', '', '']) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12px', color: 'var(--color-text-muted)',
                fontFamily: 'inherit', textAlign: 'center',
              }}
            >
              Ganti email
            </button>
          </div>
        )}

        {/* STEP 3: New Password */}
        {step === 'password' && (
          <form onSubmit={handleVerifyAndReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <ShieldCheck size={24} style={{ color: '#fff' }} />
              </div>
              <p style={{
                fontSize: '13px', color: 'var(--color-text-secondary)',
                margin: 0, lineHeight: 1.5,
              }}>
                Kode OTP terverifikasi. Silakan buat password baru Anda.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Konfirmasi Password Baru</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Ulangi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '-8px' }}>
                {[1, 2, 3, 4].map((level) => {
                  const strength = newPassword.length >= 12 ? 4
                    : newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /\d/.test(newPassword) ? 3
                    : newPassword.length >= 6 ? 2 : 1
                  return (
                    <div key={level} style={{
                      flex: 1, height: '3px', borderRadius: '2px',
                      background: level <= strength
                        ? strength <= 1 ? '#ef4444'
                          : strength === 2 ? '#f59e0b'
                            : strength === 3 ? '#3b82f6' : '#10b981'
                        : 'var(--color-border)',
                      transition: 'background 0.2s',
                    }} />
                  )
                })}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : 'Simpan Password Baru'}
            </button>

            <button
              type="button"
              onClick={() => setStep('otp')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12px', color: 'var(--color-text-muted)',
                fontFamily: 'inherit', textAlign: 'center',
              }}
            >
              Kembali ke verifikasi OTP
            </button>
          </form>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '16px', padding: '8px 0',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse 2s infinite',
            }}>
              <CheckCircle2 size={36} style={{ color: '#fff' }} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, textAlign: 'center' }}>
              Password Berhasil Diubah!
            </h2>
            <p style={{
              fontSize: '13px', color: 'var(--color-text-secondary)',
              textAlign: 'center', margin: 0, lineHeight: 1.5,
            }}>
              Password Anda telah berhasil diperbarui. Silakan login menggunakan password baru Anda.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: '8px' }}
            >
              Masuk Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  )
}
