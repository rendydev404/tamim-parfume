'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save, User, MapPin, Shield, Plus, Pencil, Trash2, Star, X, Camera, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface Address {
  id: string
  label: string
  recipient_name: string
  phone: string
  province: string
  city: string
  district: string
  postal_code: string
  full_address: string
  is_default: boolean
}

interface RegionItem { code: string; name: string }

interface StreetSuggestion {
  display_name: string
  label: string
  short_label: string
  road: string
  house_number: string
  building: string
  neighbourhood: string
  village: string
  city: string
  postcode: string
}

const emptyAddress = {
  label: 'Rumah',
  recipient_name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  postal_code: '',
  street_address: '',
  address_detail: '',
  is_default: false,
}

export default function ProfilePage() {
  const [tab, setTab] = useState<'profile' | 'address' | 'security'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({ full_name: '', phone: '', email: '', avatar_url: '' })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressLoading, setAddressLoading] = useState(true)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [addressForm, setAddressForm] = useState(emptyAddress)
  const [addressSaving, setAddressSaving] = useState(false)

  // Regional dropdown state
  const [provinces, setProvinces] = useState<RegionItem[]>([])
  const [regencies, setRegencies] = useState<RegionItem[]>([])
  const [districts, setDistricts] = useState<RegionItem[]>([])
  const [villages, setVillages] = useState<RegionItem[]>([])
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedRegency, setSelectedRegency] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedVillage, setSelectedVillage] = useState('')
  const [regionLoading, setRegionLoading] = useState('')

  // Street autocomplete state
  const [streetSuggestions, setStreetSuggestions] = useState<StreetSuggestion[]>([])
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false)
  const [streetSearching, setStreetSearching] = useState(false)
  const streetDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const streetInputRef = useRef<HTMLDivElement>(null)

  // Password state
  const [passwordForm, setPasswordForm] = useState({ current: '', new_password: '', confirm: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    loadProfile()
    loadAddresses()
    // Load provinces for address form
    fetch('/api/regional?type=provinces')
      .then(r => r.json())
      .then(json => setProvinces(json.data || []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile({
        full_name: data.full_name || '',
        phone: data.phone || '',
        email: data.email || user.email || '',
        avatar_url: data.avatar_url || '',
      })
    }
    setLoading(false)
  }

  const loadAddresses = async () => {
    try {
      const res = await fetch('/api/addresses')
      const json = await res.json()
      setAddresses(json.data || [])
    } catch { /* ignore */ }
    setAddressLoading(false)
  }

  // Regional data loading
  const loadRegencies = async (provinceCode: string) => {
    setRegencies([]); setDistricts([]); setVillages([])
    setSelectedRegency(''); setSelectedDistrict(''); setSelectedVillage('')
    try {
      setRegionLoading('regencies')
      const res = await fetch(`/api/regional?type=regencies&code=${provinceCode}`)
      const json = await res.json()
      setRegencies(json.data || [])
    } catch { /* ignore */ }
    setRegionLoading('')
  }

  const loadDistricts = async (regencyCode: string) => {
    setDistricts([]); setVillages([])
    setSelectedDistrict(''); setSelectedVillage('')
    try {
      setRegionLoading('districts')
      const res = await fetch(`/api/regional?type=districts&code=${regencyCode}`)
      const json = await res.json()
      setDistricts(json.data || [])
    } catch { /* ignore */ }
    setRegionLoading('')
  }

  const loadVillages = async (districtCode: string) => {
    setVillages([]); setSelectedVillage('')
    try {
      setRegionLoading('villages')
      const res = await fetch(`/api/regional?type=villages&code=${districtCode}`)
      const json = await res.json()
      setVillages(json.data || [])
    } catch { /* ignore */ }
    setRegionLoading('')
  }

  const resetRegionDropdowns = () => {
    setSelectedProvince('')
    setSelectedRegency('')
    setSelectedDistrict('')
    setSelectedVillage('')
    setRegencies([])
    setDistricts([])
    setVillages([])
  }

  // Street search with debounce — filtered by selected region
  const searchStreet = useCallback((query: string) => {
    if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current)
    if (query.trim().length < 2) {
      setStreetSuggestions([])
      setShowStreetSuggestions(false)
      return
    }
    streetDebounceRef.current = setTimeout(async () => {
      setStreetSearching(true)
      try {
        // Get the selected region names for contextual filtering
        const villageName = villages.find(v => v.code === selectedVillage)?.name || ''
        const districtName = districts.find(d => d.code === selectedDistrict)?.name || ''
        const regencyName = regencies.find(r => r.code === selectedRegency)?.name || ''
        const provinceName = provinces.find(p => p.code === selectedProvince)?.name || ''

        const params = new URLSearchParams({
          q: query,
          village: villageName,
          district: districtName,
          city: regencyName,
          province: provinceName,
        })
        const res = await fetch(`/api/street-search?${params.toString()}`)
        const json = await res.json()
        setStreetSuggestions(json.data || [])
        setShowStreetSuggestions(true)
      } catch {
        setStreetSuggestions([])
      }
      setStreetSearching(false)
    }, 400)
  }, [villages, districts, regencies, provinces, selectedVillage, selectedDistrict, selectedRegency, selectedProvince])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (streetInputRef.current && !streetInputRef.current.contains(e.target as Node)) {
        setShowStreetSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let avatarUrl = profile.avatar_url

      // Upload avatar if changed — via server API to bypass RLS
      if (avatarFile) {
        const formData = new FormData()
        formData.append('avatar', avatarFile)

        const uploadRes = await fetch('/api/auth/avatar', {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          toast.error(uploadData.error || 'Gagal mengupload foto')
          setSaving(false)
          return
        }

        avatarUrl = uploadData.avatar_url
      }

      // Update profile (name, phone) — avatar already updated by the API if changed
      const updateData: Record<string, string> = {
        full_name: profile.full_name,
        phone: profile.phone,
      }
      // Only include avatar_url if we didn't upload (upload API already saves it)
      if (!avatarFile) {
        updateData.avatar_url = avatarUrl
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) throw error
      setProfile({ ...profile, avatar_url: avatarUrl })
      setAvatarFile(null)
      setAvatarPreview(null)
      toast.success('Profil berhasil disimpan')
    } catch {
      toast.error('Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  // Address CRUD
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddressSaving(true)

    // Resolve names from selected dropdowns
    const provName = provinces.find(p => p.code === selectedProvince)?.name || addressForm.province
    const regName = regencies.find(r => r.code === selectedRegency)?.name || addressForm.city
    const distName = districts.find(d => d.code === selectedDistrict)?.name || addressForm.district
    const vilName = villages.find(v => v.code === selectedVillage)?.name || ''

    // Concatenate street + detail into full_address
    const fullAddress = addressForm.address_detail
      ? `${addressForm.street_address}, ${addressForm.address_detail}`
      : addressForm.street_address

    const formData = {
      label: addressForm.label,
      recipient_name: addressForm.recipient_name,
      phone: addressForm.phone,
      province: provName,
      city: regName,
      district: distName,
      postal_code: vilName ? vilName : addressForm.postal_code,
      full_address: fullAddress,
      is_default: addressForm.is_default,
    }

    try {
      const url = editingAddress ? `/api/addresses/${editingAddress.id}` : '/api/addresses'
      const method = editingAddress ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success(editingAddress ? 'Alamat diperbarui' : 'Alamat ditambahkan')
      setShowAddressForm(false)
      setEditingAddress(null)
      setAddressForm(emptyAddress)
      resetRegionDropdowns()
      loadAddresses()
    } catch {
      toast.error('Gagal menyimpan alamat')
    } finally {
      setAddressSaving(false)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Hapus alamat ini?')) return
    try {
      await fetch(`/api/addresses/${id}`, { method: 'DELETE' })
      toast.success('Alamat dihapus')
      loadAddresses()
    } catch {
      toast.error('Gagal menghapus alamat')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await fetch(`/api/addresses/${id}`, { method: 'PATCH' })
      toast.success('Alamat utama diubah')
      loadAddresses()
    } catch {
      toast.error('Gagal mengubah alamat utama')
    }
  }

  const handleEditAddress = (addr: Address) => {
    setEditingAddress(addr)
    // Parse full_address back: if it contains ', ' try to split street and detail
    // But since we can't know for sure, put it all in street_address
    setAddressForm({
      label: addr.label,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      postal_code: addr.postal_code,
      street_address: addr.full_address,
      address_detail: '',
      is_default: addr.is_default,
    })
    // Reset dropdown selections (user will re-select from dropdowns)
    resetRegionDropdowns()
    setShowAddressForm(true)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }
    setPasswordSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password })
      if (error) throw error
      toast.success('Password berhasil diubah')
      setPasswordForm({ current: '', new_password: '', confirm: '' })
    } catch {
      toast.error('Gagal mengubah password')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '24px' }}>
        <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    )
  }

  const avatarSrc = avatarPreview || profile.avatar_url
  const initial = (profile.full_name?.[0] || profile.email?.[0] || '?').toUpperCase()

  const tabs = [
    { key: 'profile' as const, label: 'Profil', icon: User },
    { key: 'address' as const, label: 'Alamat', icon: MapPin },
    { key: 'security' as const, label: 'Keamanan', icon: Shield },
  ]

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px', maxWidth: '640px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Pengaturan Akun</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '4px' }}>
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '10px 12px', border: 'none', borderRadius: 'var(--radius-md)',
                background: tab === t.key ? 'var(--color-bg)' : 'transparent',
                color: tab === t.key ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: tab === t.key ? 600 : 400, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                fontSize: '13px', transition: 'all 0.15s',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontFamily: 'inherit',
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* PROFILE TAB */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="card" style={{ padding: '24px' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700 }}>
                  {initial}
                </div>
              )}
              <label style={{
                position: 'absolute', bottom: 0, right: 0, width: 28, height: 28,
                borderRadius: '50%', background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: '2px solid var(--color-bg)',
              }}>
                <Camera size={14} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" value={profile.email} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="input-group">
              <label className="input-label">Nama Lengkap</label>
              <input className="input" value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Masukkan nama lengkap" />
            </div>
            <div className="input-group">
              <label className="input-label">No. Telepon</label>
              <input className="input" value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="08xx-xxxx-xxxx" />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan Profil</>}
            </button>
          </div>
        </form>
      )}

      {/* ADDRESS TAB */}
      {tab === 'address' && (
        <div>
          {/* Add address button */}
          {!showAddressForm && (
            <button
              onClick={() => { setEditingAddress(null); setAddressForm(emptyAddress); resetRegionDropdowns(); setShowAddressForm(true) }}
              className="btn btn-primary btn-full"
              style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Tambah Alamat Baru
            </button>
          )}

          {/* Address Form */}
          {showAddressForm && (
            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                  {editingAddress ? 'Edit Alamat' : 'Tambah Alamat Baru'}
                </h3>
                <button onClick={() => { setShowAddressForm(false); setEditingAddress(null); resetRegionDropdowns() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveAddress}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Label Alamat</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['Rumah', 'Kantor', 'Kos'].map((l) => (
                        <button key={l} type="button"
                          onClick={() => setAddressForm({ ...addressForm, label: l })}
                          style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px',
                            border: addressForm.label === l ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                            background: addressForm.label === l ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
                            cursor: 'pointer', fontWeight: addressForm.label === l ? 600 : 400,
                            fontFamily: 'inherit',
                          }}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Nama Penerima *</label>
                    <input className="input" required value={addressForm.recipient_name}
                      onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                      placeholder="Nama lengkap penerima" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">No. Telepon *</label>
                    <input className="input" required value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      placeholder="08xx-xxxx-xxxx" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="input-group">
                      <label className="input-label">Provinsi *</label>
                      <select className="input" required value={selectedProvince}
                        onChange={(e) => {
                          setSelectedProvince(e.target.value)
                          if (e.target.value) loadRegencies(e.target.value)
                        }}
                        disabled={regionLoading === 'provinces'}
                      >
                        <option value="">{regionLoading === 'provinces' ? 'Memuat...' : (editingAddress && addressForm.province ? `${addressForm.province} (pilih ulang)` : 'Pilih Provinsi')}</option>
                        {provinces.map((p) => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Kota/Kabupaten *</label>
                      <select className="input" required value={selectedRegency}
                        onChange={(e) => {
                          setSelectedRegency(e.target.value)
                          if (e.target.value) loadDistricts(e.target.value)
                        }}
                        disabled={!selectedProvince || regionLoading === 'regencies'}
                      >
                        <option value="">{regionLoading === 'regencies' ? 'Memuat...' : (editingAddress && addressForm.city && !selectedProvince ? `${addressForm.city} (pilih ulang)` : 'Pilih Kota')}</option>
                        {regencies.map((r) => (
                          <option key={r.code} value={r.code}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="input-group">
                      <label className="input-label">Kecamatan *</label>
                      <select className="input" required value={selectedDistrict}
                        onChange={(e) => {
                          setSelectedDistrict(e.target.value)
                          if (e.target.value) loadVillages(e.target.value)
                        }}
                        disabled={!selectedRegency || regionLoading === 'districts'}
                      >
                        <option value="">{regionLoading === 'districts' ? 'Memuat...' : (editingAddress && addressForm.district && !selectedRegency ? `${addressForm.district} (pilih ulang)` : 'Pilih Kecamatan')}</option>
                        {districts.map((d) => (
                          <option key={d.code} value={d.code}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Kelurahan/Desa *</label>
                      <select className="input" required value={selectedVillage}
                        onChange={(e) => setSelectedVillage(e.target.value)}
                        disabled={!selectedDistrict || regionLoading === 'villages'}
                      >
                        <option value="">{regionLoading === 'villages' ? 'Memuat...' : 'Pilih Kelurahan'}</option>
                        {villages.map((v) => (
                          <option key={v.code} value={v.code}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Kode Pos</label>
                    <input className="input" value={addressForm.postal_code}
                      onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                      placeholder="12110" />
                  </div>
                  <div className="input-group" ref={streetInputRef} style={{ position: 'relative' }}>
                    <label className="input-label">Nama Jalan, Gedung & No. Rumah *</label>
                    {!selectedVillage && !editingAddress && (
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0 0 4px 0' }}>Pilih kelurahan/desa terlebih dahulu untuk pencarian jalan</p>
                    )}
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{
                        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)', pointerEvents: 'none',
                      }} />
                      <input
                        className="input"
                        required
                        value={addressForm.street_address}
                        onChange={(e) => {
                          setAddressForm({ ...addressForm, street_address: e.target.value })
                          if (selectedVillage || editingAddress) searchStreet(e.target.value)
                        }}
                        onFocus={() => {
                          if (streetSuggestions.length > 0) setShowStreetSuggestions(true)
                        }}
                        placeholder={selectedVillage || editingAddress ? 'Cari nama jalan, gedung, atau ketik manual...' : 'Pilih kelurahan/desa dulu...'}
                        autoComplete="off"
                        style={{ paddingLeft: '36px', opacity: (!selectedVillage && !editingAddress) ? 0.6 : 1 }}
                      />
                      {streetSearching && (
                        <Loader2 size={16} className="animate-spin" style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          color: 'var(--color-text-muted)',
                        }} />
                      )}
                    </div>
                    {/* Suggestions dropdown */}
                    {showStreetSuggestions && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        maxHeight: '240px', overflowY: 'auto', marginTop: '4px',
                      }}>
                        {streetSuggestions.length > 0 ? streetSuggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setAddressForm({ ...addressForm, street_address: s.short_label || s.label })
                              setShowStreetSuggestions(false)
                            }}
                            style={{
                              width: '100%', textAlign: 'left', padding: '10px 14px',
                              border: 'none', borderBottom: i < streetSuggestions.length - 1 ? '1px solid var(--color-border-light, var(--color-border))' : 'none',
                              background: 'transparent', cursor: 'pointer', fontSize: '13px',
                              fontFamily: 'inherit', lineHeight: 1.4,
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <MapPin size={14} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
                              <span>
                                <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                  {s.short_label || s.label.split(',')[0]}
                                </span>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                                  {s.label}
                                </span>
                              </span>
                            </span>
                          </button>
                        )) : !streetSearching && addressForm.street_address.trim().length >= 2 ? (
                          <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 4px 0' }}>Nama jalan ini belum terdaftar di database peta.</p>
                            <p style={{ margin: '0 0 6px 0', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                              Silakan ketik manual nama jalan Anda.
                            </p>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', opacity: 0.7 }}>
                              Contoh: Jl. Coneang RT 01/02 No. 15
                            </p>
                          </div>
                        ) : streetSearching ? (
                          <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                            <p style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <Loader2 size={14} className="animate-spin" /> Mencari dari beberapa sumber data...
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="input-group">
                    <label className="input-label">Detail Alamat <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opsional)</span></label>
                    <input
                      className="input"
                      value={addressForm.address_detail}
                      onChange={(e) => setAddressForm({ ...addressForm, address_detail: e.target.value })}
                      placeholder="Lantai, blok, patokan, RT/RW, dll."
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={addressForm.is_default}
                      onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })} />
                    Jadikan alamat utama
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                      onClick={() => { setShowAddressForm(false); setEditingAddress(null); resetRegionDropdowns() }}
                    >Batal</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={addressSaving}>
                      {addressSaving ? <Loader2 size={16} className="animate-spin" /> : 'Simpan'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Address List */}
          {addressLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <MapPin size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Belum ada alamat tersimpan</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {addresses.map((addr) => (
                <div key={addr.id} className="card" style={{
                  padding: '16px',
                  border: addr.is_default ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600,
                        background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                      }}>{addr.label}</span>
                      {addr.is_default && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600,
                          background: 'var(--color-primary)', color: '#fff',
                        }}>Utama</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {!addr.is_default && (
                        <button onClick={() => handleSetDefault(addr.id)} title="Jadikan utama"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-text-muted)' }}>
                          <Star size={16} />
                        </button>
                      )}
                      <button onClick={() => handleEditAddress(addr)} title="Edit"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-text-muted)' }}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDeleteAddress(addr.id)} title="Hapus"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-error, #ef4444)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{addr.recipient_name}</p>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{addr.phone}</p>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    {addr.full_address}, {addr.district && `${addr.district}, `}{addr.city}, {addr.province}{addr.postal_code && ` ${addr.postal_code}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECURITY TAB */}
      {tab === 'security' && (
        <form onSubmit={handleChangePassword} className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} /> Ubah Password
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Password Baru</label>
              <input className="input" type="password" required value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                placeholder="Minimal 6 karakter" minLength={6} />
            </div>
            <div className="input-group">
              <label className="input-label">Konfirmasi Password Baru</label>
              <input className="input" type="password" required value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder="Ulangi password baru" />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={passwordSaving}>
              {passwordSaving ? <><Loader2 size={16} className="animate-spin" /> Mengubah...</> : <><Shield size={16} /> Ubah Password</>}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
