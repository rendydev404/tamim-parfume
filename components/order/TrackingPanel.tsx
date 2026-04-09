'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDateTime } from '@/lib/utils'
import { Truck, Copy, Check, MapPin, Package, CheckCircle2, Clock, Navigation, Loader2 } from 'lucide-react'

interface Checkpoint {
  status: string
  description: string
  location: string
  timestamp: string
  completed: boolean
}

interface TrackingData {
  tracking_number: string
  courier: string
  service: string
  status: string
  origin: { city: string; district: string; lat: number; lng: number }
  destination: { city: string; province: string; lat: number; lng: number }
  current_position: { lat: number; lng: number }
  progress: number
  checkpoints: Checkpoint[]
}

const CHECKPOINT_ICONS: Record<string, typeof Package> = {
  confirmed: Package,
  pickup: Truck,
  sort_origin: MapPin,
  in_transit: Navigation,
  sort_dest: MapPin,
  out_for_delivery: Truck,
  delivered: CheckCircle2,
}

export default function TrackingPanel({ orderId }: { orderId: string }) {
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    fetchTracking()
  }, [orderId])

  useEffect(() => {
    if (data && mapRef.current && !mapInstanceRef.current) {
      initMap()
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      // Clear Leaflet's internal ID on the container to prevent
      // "Map container is already initialized" on re-mount
      if (mapRef.current) {
        (mapRef.current as any)._leaflet_id = undefined
      }
    }
  }, [data])

  const fetchTracking = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/tracking`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json.data)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data tracking')
    } finally {
      setLoading(false)
    }
  }

  const initMap = async () => {
    // Guard against double-invocation (React Strict Mode / race conditions)
    if (!data || !mapRef.current || mapInstanceRef.current) return

    const L = (await import('leaflet')).default
    // @ts-ignore - leaflet CSS import
    await import('leaflet/dist/leaflet.css')

    // Double-check after async imports (another call may have initialized the map)
    if (mapInstanceRef.current) return

    // Clear any stale Leaflet ID on the container
    if ((mapRef.current as any)._leaflet_id) {
      (mapRef.current as any)._leaflet_id = undefined
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    })

    // Immediately claim the ref to block concurrent initializations
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map)

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const origin = L.latLng(data.origin.lat, data.origin.lng)
    const dest = L.latLng(data.destination.lat, data.destination.lng)
    const current = L.latLng(data.current_position.lat, data.current_position.lng)

    // Custom icons
    const originIcon = L.divIcon({
      className: 'tracking-marker tracking-marker--origin',
      html: `<div class="tracking-marker__inner"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })

    const destIcon = L.divIcon({
      className: 'tracking-marker tracking-marker--dest',
      html: `<div class="tracking-marker__inner"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })

    const currentIcon = L.divIcon({
      className: 'tracking-marker tracking-marker--current',
      html: `<div class="tracking-marker__pulse"></div><div class="tracking-marker__inner tracking-marker__inner--current"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    })

    L.marker(origin, { icon: originIcon }).addTo(map)
      .bindPopup(`<strong>Asal</strong><br/>${data.origin.district}, ${data.origin.city}`)
    L.marker(dest, { icon: destIcon }).addTo(map)
      .bindPopup(`<strong>Tujuan</strong><br/>${data.destination.city}, ${data.destination.province}`)

    // Fetch real road route from OSRM (free routing API)
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${data.origin.lng},${data.origin.lat};${data.destination.lng},${data.destination.lat}?overview=full&geometries=geojson`
      const routeRes = await fetch(osrmUrl)
      const routeData = await routeRes.json()

      if (routeData.routes && routeData.routes.length > 0) {
        const coords: [number, number][] = routeData.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
        )

        // Split route into completed and remaining based on progress
        const splitIndex = Math.floor(coords.length * data.progress)
        const completedCoords = coords.slice(0, Math.max(splitIndex, 1))
        const remainingCoords = coords.slice(Math.max(splitIndex - 1, 0))

        // Completed route (gray — already traveled)
        L.polyline(completedCoords, {
          color: '#9ca3af',
          weight: 4,
          opacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)

        // Remaining route (blue — heading to destination)
        L.polyline(remainingCoords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)

        // Update current position marker to be on the actual road
        if (data.status !== 'delivered' && completedCoords.length > 0) {
          const roadPos = completedCoords[completedCoords.length - 1]
          L.marker(L.latLng(roadPos[0], roadPos[1]), { icon: currentIcon }).addTo(map)
            .bindPopup('<strong>Posisi Paket Saat Ini</strong>')
        }
      } else {
        throw new Error('No route found')
      }
    } catch {
      // Fallback: straight line if OSRM fails
      if (data.status !== 'delivered') {
        L.marker(current, { icon: currentIcon }).addTo(map)
          .bindPopup('<strong>Posisi Paket Saat Ini</strong>')
      }

      L.polyline([origin, current], {
        color: '#9ca3af',
        weight: 3,
        opacity: 0.7,
      }).addTo(map)

      L.polyline([current, dest], {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.9,
      }).addTo(map)
    }

    // Fit bounds
    const bounds = L.latLngBounds([origin, dest])
    map.fitBounds(bounds, { padding: [50, 50] })
  }

  const handleCopy = () => {
    if (data?.tracking_number) {
      navigator.clipboard.writeText(data.tracking_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="tracking-panel">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', gap: '8px' }}>
          <Loader2 size={20} className="animate-spin" />
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Memuat data tracking...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const reversedCheckpoints = [...data.checkpoints].reverse()

  return (
    <div className="tracking-panel">
      {/* Header */}
      <div className="tracking-header">
        <div className="tracking-header__top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={18} />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Lacak Paket</span>
          </div>
          <span className="tracking-header__courier">
            {data.courier} {data.service}
          </span>
        </div>
        <div className="tracking-header__resi">
          <div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>No. Resi</span>
            <span style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {data.tracking_number}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="tracking-header__copy"
            title="Salin nomor resi"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </div>

        {/* Route summary */}
        <div className="tracking-header__route">
          <div className="tracking-header__route-point">
            <div className="tracking-header__route-dot tracking-header__route-dot--origin" />
            <span>{data.origin.city}</span>
          </div>
          <div className="tracking-header__route-line" />
          <div className="tracking-header__route-point">
            <div className="tracking-header__route-dot tracking-header__route-dot--dest" />
            <span>{data.destination.city}</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="tracking-map" ref={mapRef} />

      {/* Timeline */}
      <div className="tracking-timeline">
        <h4 className="tracking-timeline__title">
          <Clock size={14} /> Riwayat Pengiriman
        </h4>
        <div className="tracking-timeline__list">
          {reversedCheckpoints.map((cp, index) => {
            const Icon = CHECKPOINT_ICONS[cp.status] || Package
            const isLatest = index === 0
            return (
              <div
                key={index}
                className={`tracking-checkpoint ${cp.completed ? 'tracking-checkpoint--completed' : ''} ${isLatest ? 'tracking-checkpoint--latest' : ''}`}
              >
                <div className="tracking-checkpoint__indicator">
                  <div className="tracking-checkpoint__circle">
                    {cp.completed ? <Check size={12} /> : <Icon size={12} />}
                  </div>
                  {index < reversedCheckpoints.length - 1 && (
                    <div className={`tracking-checkpoint__line ${cp.completed ? 'tracking-checkpoint__line--completed' : ''}`} />
                  )}
                </div>
                <div className="tracking-checkpoint__content">
                  <p className="tracking-checkpoint__desc">{cp.description}</p>
                  <div className="tracking-checkpoint__meta">
                    <span>{cp.location}</span>
                    <span>·</span>
                    <span>{formatDateTime(cp.timestamp)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
