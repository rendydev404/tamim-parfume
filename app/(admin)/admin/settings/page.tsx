'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Store, Phone, Map, Search, Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react'

interface StoreSettings {
  name: string
  phone: string
  address: string
  district: string
  city: string
  province: string
  postal_code: string
  lat: number
  lng: number
  biteship_area_id: string
  rajaongkir_id: number
  village_code: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({
    name: 'Tamim Parfume',
    phone: '08129000123',
    address: '',
    district: '',
    city: '',
    province: '',
    postal_code: '',
    lat: -6.5822558,
    lng: 106.813082,
    biteship_area_id: 'ID1615211011',
    rajaongkir_id: 8174,
    village_code: '76116'
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Map search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  // 1. Fetch current settings on mount
  useEffect(() => {
    fetch('/api/store-settings')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setSettings(json.data)
        }
      })
      .catch(err => {
        console.error('Failed to load settings:', err)
        setErrorMsg('Gagal memuat pengaturan toko dari database. Menggunakan default.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // 2. Initialize Leaflet Map once loaded
  useEffect(() => {
    if (!loading && mapRef.current && !mapInstanceRef.current) {
      initMap()
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      if (mapRef.current) {
        (mapRef.current as any)._leaflet_id = undefined
      }
    }
  }, [loading])

  const initMap = async () => {
    if (mapInstanceRef.current) return

    const L = (await import('leaflet')).default
    // @ts-ignore - leaflet CSS import
    await import('leaflet/dist/leaflet.css')

    if (mapInstanceRef.current) return

    // Clear Leaflet ID
    if ((mapRef.current as any)._leaflet_id) {
      (mapRef.current as any)._leaflet_id = undefined
    }

    const initialPos = L.latLng(settings.lat, settings.lng)
    
    const map = L.map(mapRef.current as HTMLElement, {
      zoomControl: true,
      attributionControl: false,
    }).setView(initialPos, 15)

    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Customize marker icon to match premium theme
    const customIcon = L.divIcon({
      className: 'store-map-marker',
      html: `<div style="
        width: 40px;
        height: 40px;
        background: #10b981;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-10px, -10px);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    })

    const marker = L.marker(initialPos, {
      draggable: true,
      icon: customIcon
    }).addTo(map)

    markerRef.current = marker

    // Marker Dragend event
    marker.on('dragend', async () => {
      const position = marker.getLatLng()
      await reverseGeocode(position.lat, position.lng)
    })

    // Map click event to relocate pin
    map.on('click', async (e: any) => {
      const position = e.latlng
      marker.setLatLng(position)
      await reverseGeocode(position.lat, position.lng)
    })
  }

  // Helper to fly to coordinates and update pin
  const flyToCoords = (lat: number, lng: number) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16)
      markerRef.current.setLatLng([lat, lng])
    }
  }

  // 3. Search address using OSM Nominatim API
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&countrycodes=id&limit=5`)
      const data = await res.json()
      setSearchResults(data)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const selectSearchResult = async (result: any) => {
    const lat = Number(result.lat)
    const lng = Number(result.lon)
    setSearchResults([])
    setSearchQuery('')
    
    // Update map view & pin
    flyToCoords(lat, lng)

    // Process address details from search hit
    await processAddressFromNominatim(result.address, lat, lng, result.display_name)
  }

  // 4. Reverse Geocode from coordinates using OSM Nominatim API
  const reverseGeocode = async (lat: number, lng: number) => {
    setResolving(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data && data.address) {
        await processAddressFromNominatim(data.address, lat, lng, data.display_name)
      }
    } catch (err) {
      console.error('Reverse geocode failed:', err)
    } finally {
      setResolving(false)
    }
  }

  // 5. Extract structured address components and call backend ID resolver
  const processAddressFromNominatim = async (addr: any, lat: number, lng: number, fullDisplayName: string) => {
    const district = addr.city_district || addr.subdistrict || addr.subcounty || ''
    const city = addr.city || addr.town || addr.municipality || addr.county || ''
    const province = addr.state || ''
    const postal_code = addr.postcode || ''
    const village = addr.suburb || addr.village || addr.neighbourhood || ''

    // Format a clean, human-readable street address
    const road = addr.road || ''
    const houseNumber = addr.house_number || ''
    let cleanAddress = [road, houseNumber, village, district, city, province, postal_code]
      .filter(Boolean)
      .join(', ')

    if (!cleanAddress) cleanAddress = fullDisplayName

    // Update coordinates and geocoded info
    setSettings(prev => ({
      ...prev,
      address: cleanAddress,
      district,
      city,
      province,
      postal_code,
      lat,
      lng
    }))

    // Automatically resolve Biteship Area ID and RajaOngkir ID from backend
    setResolving(true)
    try {
      const q = new URLSearchParams({
        district,
        city,
        province,
        village
      })
      const res = await fetch(`/api/admin/store-settings/resolve-ids?${q.toString()}`)
      const json = await res.json()

      if (json.success && json.data) {
        setSettings(prev => ({
          ...prev,
          biteship_area_id: json.data.biteship_area_id,
          rajaongkir_id: json.data.rajaongkir_id,
          village_code: json.data.village_code || prev.village_code
        }))
      }
    } catch (err) {
      console.error('Resolve IDs API failed:', err)
    } finally {
      setResolving(false)
    }
  }

  // 6. Save settings to DB
  const handleSave = async () => {
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const res = await fetch('/api/admin/store-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan data')

      setSuccessMsg('Pengaturan alamat toko berhasil disimpan dan terintegrasi!')
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px', gap: '10px' }}>
        <Loader2 className="animate-spin" size={24} />
        <span>Memuat pengaturan alamat toko...</span>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Pengaturan Lokasi Toko</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Geser pin di peta untuk meletakkan titik maps koordinat toko, alamat dan kode area ekspedisi akan terisi otomatis.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || resolving}
          className="btn btn-primary"
          style={{ gap: '8px', display: 'flex', alignItems: 'center' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Lokasi'}</span>
        </button>
      </div>

      {successMsg && (
        <div style={{
          padding: '16px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--color-success)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-success)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-error)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="lg:grid-cols-2">
        <style>{`
          @media (min-width: 1024px) {
            .lg\\:grid-cols-2 {
              grid-template-columns: 1.2fr 0.8fr !important;
            }
          }
          .store-settings-card {
            background: #111111;
            border: 1px solid #222222;
            border-radius: var(--radius-lg);
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            height: 100%;
          }
          .store-settings-input {
            width: 100%;
            background: #1e1e1e;
            border: 1px solid #333333;
            border-radius: var(--radius-md);
            padding: 10px 14px;
            color: #ffffff !important;
            font-size: 13px;
            transition: all 0.2s;
            margin-top: 6px;
          }
          .store-settings-input:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 2px rgba(212,165,116,0.15);
          }
          .store-settings-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .store-settings-form-group {
            margin-bottom: 18px;
          }
          .search-result-item {
            padding: 10px 14px;
            border-bottom: 1px solid #222222;
            cursor: pointer;
            font-size: 12px;
            color: #ffffff !important;
            transition: background 0.15s;
          }
          .search-result-item:hover {
            background: #222222;
          }
        `}</style>

        {/* Column 1: Map Picker */}
        <div className="store-settings-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <span className="store-settings-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Map size={14} /> PETA PENENTU LOKASI TOKO
            </span>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Cari jalan, gedung, atau kelurahan toko..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="store-settings-input"
                  style={{ marginTop: 0, paddingLeft: '36px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              </div>
              <button type="submit" disabled={searching} className="btn btn-secondary" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                <span>Cari</span>
              </button>
            </form>

            {/* Autocomplete Search Results */}
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '52px',
                background: '#1a1a1a',
                border: '1px solid #333333',
                borderRadius: 'var(--radius-md)',
                zIndex: 1000,
                maxHeight: '240px',
                overflowY: 'auto',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
              }}>
                {searchResults.map((res, i) => (
                  <div key={i} className="search-result-item" onClick={() => selectSearchResult(res)}>
                    {res.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaflet Container */}
          <div
            ref={mapRef}
            style={{
              flex: 1,
              width: '100%',
              minHeight: '400px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #222222',
              position: 'relative',
              zIndex: 1,
              background: '#141414'
            }}
          />
        </div>

        {/* Column 2: Alamat Form */}
        <div className="store-settings-card">
          <span className="store-settings-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
            <Store size={14} /> INFORMASI ALAMAT TOKO (ORIGIN)
          </span>

          <div className="store-settings-form-group">
            <label className="store-settings-label">Nama Toko</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="store-settings-input"
              placeholder="Nama Toko"
            />
          </div>

          <div className="store-settings-form-group">
            <label className="store-settings-label">No. HP Hubungi</label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="store-settings-input"
              placeholder="Contoh: 08129000123"
            />
          </div>

          <div className="store-settings-form-group">
            <label className="store-settings-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Alamat Lengkap</span>
              {resolving && (
                <span style={{ fontSize: '11px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'none' }}>
                  <Loader2 size={10} className="animate-spin" /> Resolving alamat...
                </span>
              )}
            </label>
            <textarea
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="store-settings-input"
              style={{ minHeight: '80px', resize: 'vertical' }}
              placeholder="Alamat lengkap toko dari hasil klik peta..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="store-settings-form-group">
              <label className="store-settings-label">Kecamatan</label>
              <input
                type="text"
                value={settings.district}
                onChange={(e) => setSettings({ ...settings, district: e.target.value })}
                className="store-settings-input"
                placeholder="Kecamatan"
              />
            </div>
            <div className="store-settings-form-group">
              <label className="store-settings-label">Kota</label>
              <input
                type="text"
                value={settings.city}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="store-settings-input"
                placeholder="Kota/Kabupaten"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
            <div className="store-settings-form-group">
              <label className="store-settings-label">Provinsi</label>
              <input
                type="text"
                value={settings.province}
                onChange={(e) => setSettings({ ...settings, province: e.target.value })}
                className="store-settings-input"
                placeholder="Provinsi"
              />
            </div>
            <div className="store-settings-form-group">
              <label className="store-settings-label">Kode Pos</label>
              <input
                type="text"
                value={settings.postal_code}
                onChange={(e) => setSettings({ ...settings, postal_code: e.target.value })}
                className="store-settings-input"
                placeholder="Kode Pos"
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #222222', marginTop: '16px', paddingTop: '16px' }}>
            <span className="store-settings-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', color: '#10b981' }}>
              <MapPin size={14} /> AREA ID PENGIRIMAN (OTOMATIS)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="store-settings-form-group">
                <label className="store-settings-label">Biteship Area ID</label>
                <input
                  type="text"
                  value={settings.biteship_area_id}
                  onChange={(e) => setSettings({ ...settings, biteship_area_id: e.target.value })}
                  className="store-settings-input"
                  style={{ fontFamily: 'monospace' }}
                  placeholder="ID Area Biteship"
                />
              </div>
              <div className="store-settings-form-group">
                <label className="store-settings-label">RajaOngkir ID</label>
                <input
                  type="number"
                  value={settings.rajaongkir_id}
                  onChange={(e) => setSettings({ ...settings, rajaongkir_id: Number(e.target.value) })}
                  className="store-settings-input"
                  style={{ fontFamily: 'monospace' }}
                  placeholder="ID RajaOngkir"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="store-settings-form-group">
                <label className="store-settings-label">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={settings.lat}
                  onChange={(e) => setSettings({ ...settings, lat: Number(e.target.value) })}
                  className="store-settings-input"
                  style={{ color: '#888888' }}
                />
              </div>
              <div className="store-settings-form-group">
                <label className="store-settings-label">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={settings.lng}
                  onChange={(e) => setSettings({ ...settings, lng: Number(e.target.value) })}
                  className="store-settings-input"
                  style={{ color: '#888888' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
