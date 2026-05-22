'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import {
  ArrowLeft, Package, MapPin, FileText, XCircle, CreditCard,
  Loader2, Droplets, User, Phone, Truck, Clock, Tag, Printer
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import PrintLabel from '@/components/order/PrintLabel'

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Record<string, any> | null>(null)
  const [items, setItems] = useState<Record<string, any>[]>([])
  const [coupon, setCoupon] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [returnRequest, setReturnRequest] = useState<any>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [showPrintLabel, setShowPrintLabel] = useState(false)

  // Biteship Logistics States
  const [courierCode, setCourierCode] = useState('jne')
  const [courierService, setCourierService] = useState('reg')
  const [trackingInfo, setTrackingInfo] = useState<any>(null)
  const [loadingTracking, setLoadingTracking] = useState(false)
  const [showManualShipping, setShowManualShipping] = useState(false)

  useEffect(() => {
    loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const loadOrder = async () => {
    const supabase = createClient()

    const { data: orderData, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !orderData) {
      toast.error('Pesanan tidak ditemukan')
      router.push('/admin/orders')
      return
    }

    // Mark as seen by admin in background if not already seen
    if (orderData.seen_by_admin === false) {
      supabase
        .from('orders')
        .update({ seen_by_admin: true })
        .eq('id', orderId)
        .then(({ error: updateErr }) => {
          if (updateErr) console.error('Failed to mark order as seen:', updateErr)
        })
    }

    setOrder(orderData)
    const rawCourier = (orderData.shipping_courier || 'jne').toLowerCase()
    const rawService = (orderData.shipping_service || 'reg').toLowerCase()
    
    let mappedService = 'reg'
    if (rawService.includes('yes') || rawService.includes('best') || rawService.includes('ons')) mappedService = 'yes'
    else if (rawService.includes('eco') || rawService.includes('oke')) mappedService = 'eco'
    
    setCourierCode(rawCourier)
    setCourierService(mappedService)

    // Fetch tracking details if resi is set
    if (orderData.shipping_tracking) {
      setLoadingTracking(true)
      try {
        const tRes = await fetch(`/api/orders/${orderId}/tracking`)
        if (tRes.ok) {
          const tJson = await tRes.json()
          if (tJson.success) {
            setTrackingInfo(tJson.data)
          }
        }
      } catch (tErr) {
        console.error('Failed to load tracking details:', tErr)
      } finally {
        setLoadingTracking(false)
      }
    }

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*, product:products(name, images:product_images(url, is_primary))')
      .eq('order_id', orderId)

    setItems(itemsData || [])

    const { data: couponData } = await supabase
      .from('order_coupons')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle()

    setCoupon(couponData)

    const { data: returnData } = await supabase
      .from('returns')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle()
    
    setReturnRequest(returnData)
    if (returnData?.admin_notes) setAdminNotes(returnData.admin_notes)

    setLoading(false)
  }

  const handleBookShipment = async () => {
    if (!order) return
    if (!confirm(`Booking pickup kurir ${courierCode.toUpperCase()} (${courierService.toUpperCase()}) ke Biteship?`)) return
    
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierCode,
          courierService
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      
      toast.success(json.message || 'Berhasil melakukan booking kurir Biteship!')
      loadOrder()
    } catch (err: any) {
      toast.error(err.message || 'Gagal booking kurir Biteship')
    } finally {
      setUpdating(false)
    }
  }

  const handleBookShipmentAuto = async () => {
    if (!order) return
    const autoCourier = (order.shipping_courier || 'jne').toLowerCase()
    const autoService = (order.shipping_service || 'reg').toLowerCase()
    
    if (!confirm(`Booking pickup kurir ${autoCourier.toUpperCase()} (${autoService.toUpperCase()}) otomatis ke Biteship?`)) return
    
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierCode: autoCourier,
          courierService: autoService
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      
      toast.success(json.message || 'Berhasil melakukan booking kurir Biteship secara otomatis!')
      loadOrder()
    } catch (err: any) {
      toast.error(err.message || 'Gagal booking kurir Biteship')
    } finally {
      setUpdating(false)
    }
  }

  const updateReturnStatus = async (newStatus: string) => {
    if (!returnRequest) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/returns/${returnRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_notes: adminNotes })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`Status retur diperbarui menjadi ${newStatus}`)
      loadOrder()
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui status retur')
    } finally {
      setUpdating(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    if (!order) return
    
    let trackingNumber = order.shipping_tracking || ''
    const isBiteshipCourier = order.shipping_courier && 
      order.shipping_courier.toLowerCase() !== 'local' && 
      order.shipping_courier.toLowerCase() !== 'pickup'

    if (newStatus === 'shipped' && !order.shipping_tracking) {
      if (isBiteshipCourier) {
        const choice = confirm('Pesanan menggunakan kurir Biteship. Apakah Anda ingin memesan kurir secara otomatis?\n\n- Klik [OK] untuk booking kurir Biteship otomatis.\n- Klik [Batal] jika ingin memasukkan nomor resi secara manual.')
        if (!choice) {
          const resiInput = prompt('Masukkan Nomor Resi / AWB Pihak Ketiga (Real) secara manual:', trackingNumber)
          if (resiInput === null) return
          trackingNumber = resiInput.trim()
          if (!trackingNumber) {
            toast.error('Nomor resi wajib diisi untuk status Dikirim!')
            return
          }
        }
      } else {
        const resiInput = prompt('Masukkan Nomor Resi / AWB Pihak Ketiga (Real):', trackingNumber)
        if (resiInput === null) return
        trackingNumber = resiInput.trim()
        if (!trackingNumber) {
          toast.error('Nomor resi wajib diisi untuk status Dikirim!')
          return
        }
      }
    }

    setUpdating(true)

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          tracking: trackingNumber || undefined
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Status pesanan diperbarui')
      loadOrder()
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui status')
    }
    setUpdating(false)
  }

  const handleAdminCancel = async () => {
    if (!confirm('Batalkan pesanan ini? Stok dan kupon akan dikembalikan.')) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Dibatalkan oleh admin' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Pesanan dibatalkan')
      loadOrder()
    } catch (err: any) {
      toast.error(err.message || 'Gagal membatalkan')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={28} className="animate-spin" />
      </div>
    )
  }

  if (!order) return null

  const status = ORDER_STATUS[order.status] || { label: order.status, color: '#999' }

  return (
    <div style={{ maxWidth: '780px' }}>
      {/* Back */}
      <Link
        href="/admin/orders"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px', textDecoration: 'none' }}
      >
        <ArrowLeft size={16} /> Kembali ke Pesanan
      </Link>

      {/* Header */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>No. Pesanan</p>
            <h1 style={{ fontSize: '18px', fontFamily: 'var(--font-body)', fontWeight: 700, marginBottom: '4px' }}>
              #{order.order_number}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              <Clock size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              {formatDateTime(order.created_at)}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {order.shipping_tracking && (
              <button
                onClick={() => setShowPrintLabel(true)}
                className="btn btn-secondary btn-sm"
                style={{ gap: '4px' }}
              >
                <Printer size={14} /> Cetak Resi
              </button>
            )}
            <span className="badge" style={{ background: `${status.color}20`, color: status.color, fontSize: '13px', padding: '6px 14px' }}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Status changer */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>Ubah Status:</span>
          <select
            className="input"
            style={{ padding: '8px 32px 8px 10px', fontSize: '13px', width: 'auto' }}
            value={order.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={updating}
          >
            <option value="pending_payment">Menunggu Bayar</option>
            <option value="paid">Dibayar</option>
            <option value="processing">Diproses</option>
            <option value="shipped">Dikirim</option>
            <option value="delivered">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
            <option value="return_requested">Ajuan Retur</option>
            <option value="return_approved">Retur Disetujui</option>
            <option value="return_rejected">Retur Ditolak</option>
            <option value="returned">Barang Diretur</option>
            <option value="refunded">Dikembalikan (Refund)</option>
          </select>
          {['pending_payment', 'paid', 'processing'].includes(order.status) && (
            <button
              onClick={handleAdminCancel}
              disabled={updating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                color: 'var(--color-error)',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
              }}
            >
              <XCircle size={14} /> Batalkan
            </button>
          )}
        </div>
      </div>

      {/* Cancellation info */}
      {order.status === 'cancelled' && order.cancel_reason && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '16px', borderLeft: '3px solid var(--color-error)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <XCircle size={16} style={{ color: 'var(--color-error)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-error)' }}>Alasan Pembatalan</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>{order.cancel_reason}</p>
          {order.cancelled_at && (
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Dibatalkan pada {formatDateTime(order.cancelled_at)}
            </p>
          )}
        </div>
      )}

      {/* Return Request Info Block */}
      {returnRequest && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px', border: '1px solid var(--color-warning)' }}>
          <h2 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning-dark)' }}>
            <XCircle size={18} />
            Pengajuan Retur Barang
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 4px 0' }}>Alasan Retur</p>
              <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{returnRequest.reason}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 4px 0' }}>Status Retur</p>
              <span className={`badge badge-${returnRequest.status === 'pending' ? 'warning' : returnRequest.status === 'approved' ? 'success' : returnRequest.status === 'completed' ? 'secondary' : 'error'}`}>
                {returnRequest.status.toUpperCase()}
              </span>
            </div>
          </div>

          {returnRequest.details && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 4px 0' }}>Detail Masalah</p>
              <p style={{ fontSize: '13px', margin: 0, background: 'var(--color-bg-secondary)', padding: '10px', borderRadius: '8px' }}>
                {returnRequest.details}
              </p>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 8px 0' }}>Bukti Foto/Video</p>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
              {returnRequest.proof_images?.map((url: string, i: number) => {
                const isVid = /\.(mp4|webm|ogg|mov)$/i.test(url)
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)', display: 'block' }}>
                    {isVid ? (
                      <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={url} alt="Bukti" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </a>
                )
              })}
            </div>
          </div>

          {returnRequest.return_tracking_number && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 4px 0' }}>Resi Pengiriman Balik (Dari Pembeli)</p>
              <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{returnRequest.return_tracking_number}</p>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Catatan Admin (Opsional, untuk alasan penolakan dll)</label>
            <textarea 
              className="input" 
              rows={2} 
              placeholder="Ketik catatan di sini..."
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {returnRequest.status === 'pending' && (
              <>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => updateReturnStatus('rejected')} 
                  disabled={updating}
                  style={{ color: 'var(--color-error)' }}
                >
                  Tolak Retur
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => updateReturnStatus('approved')} 
                  disabled={updating}
                >
                  Setujui Retur
                </button>
              </>
            )}
            {returnRequest.status === 'approved' && (
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => updateReturnStatus('completed')} 
                disabled={updating}
              >
                Tandai Selesai (Refunded)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Customer Notes */}
      {order.notes && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '16px', borderLeft: '3px solid var(--color-accent, #d4a574)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <FileText size={16} style={{ color: 'var(--color-accent, #d4a574)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Catatan dari Pembeli</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.7 }}>
            {order.notes}
          </p>
        </div>
      )}

      {/* Order items */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={16} /> Produk Dipesan ({items.length} item)
        </h3>
        {items.map((item, index) => {
          const productData = item.product as { name: string; images: { url: string; is_primary: boolean }[] } | null
          const productImages = productData?.images || []
          const primaryImg = productImages.find((img: any) => img.is_primary) || productImages[0]
          const displayImage = item.product_image || primaryImg?.url || null
          const displayName = item.product_name || productData?.name || 'Produk'
          return (
          <div key={item.id} style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 0',
            borderBottom: index < items.length - 1 ? '1px solid var(--color-border-light)' : 'none',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-secondary)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '1px solid var(--color-border-light)',
            }}>
              {(() => {
                const isVid = (url: string) => url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video') || url.includes('.mp4'));
                let displayImg = displayImage;
                
                if (displayImg && isVid(displayImg)) {
                  const nonVidImg = productImages.find((img: any) => !isVid(img.url));
                  displayImg = nonVidImg?.url || displayImg;
                }

                return displayImg ? (
                  <img src={displayImg} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Droplets size={18} style={{ color: 'var(--color-text-muted)' }} />
                );
              })()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 2px 0' }}>{displayName}</p>
              {item.variant_label && (
                <p style={{
                  fontSize: '11px', color: 'var(--color-primary)',
                  margin: '0 0 4px 0',
                  padding: '2px 8px',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: '4px',
                  display: 'inline-block',
                  fontWeight: 500,
                }}>
                  {item.variant_label}
                </p>
              )}
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                {item.quantity} × {formatRupiah(item.price)}
              </p>
            </div>
            <span style={{ fontWeight: 600, fontSize: '14px', flexShrink: 0 }}>
              {formatRupiah(item.subtotal)}
            </span>
          </div>
        )})}

        {/* Totals */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
            <span>{formatRupiah(order.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Ongkos Kirim</span>
            <span>{formatRupiah(order.shipping_cost)}</span>
          </div>
          {coupon && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', color: 'var(--color-success)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={12} /> Kupon ({coupon.coupon_code})
              </span>
              <span>- {formatRupiah(coupon.discount_amount)}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '16px',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '8px',
            marginTop: '4px',
          }}>
            <span>Total</span>
            <span>{formatRupiah(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Shipping & Customer Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Customer info */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} /> Info Pemesan
          </h3>
          <div style={{ fontSize: '14px', lineHeight: 1.8 }}>
            <p style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} style={{ color: 'var(--color-text-muted)' }} /> {order.recipient_name}
            </p>
            <p style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} style={{ color: 'var(--color-text-muted)' }} /> {order.recipient_phone}
            </p>
          </div>
        </div>

        {/* Payment info */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={16} /> Pembayaran
          </h3>
          <div style={{ fontSize: '14px', lineHeight: 1.8 }}>
            <p style={{ fontWeight: 500 }}>{order.payment_method || '-'}</p>
            {order.payment_reference && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                Ref: {order.payment_reference}
              </p>
            )}
            {order.paid_at && (
              <p style={{ fontSize: '12px', color: 'var(--color-success)' }}>
                Dibayar: {formatDateTime(order.paid_at)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Biteship Shipment Booking & Details Panel */}
      <div className="card" style={{ padding: '20px', marginTop: '16px', borderLeft: '4px solid var(--color-primary)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
          <Truck size={18} /> Biteship Courier Logistics Aggregator
        </h3>
        
        {order.shipping_tracking ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kurir Booking Terpilih</p>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', textTransform: 'uppercase', padding: '2px 8px' }}>
                    {order.shipping_courier || 'JNE'}
                  </span>
                  <span style={{ textTransform: 'uppercase' }}>{order.shipping_service || 'REG'}</span>
                </p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nomor Resi / AWB</p>
                <p style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', margin: 0, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {order.shipping_tracking}
                  {order.shipping_tracking.startsWith('TP-') && (
                    <span style={{ fontSize: '10px', color: 'var(--color-warning-dark)', background: 'var(--color-warning)20', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                      MOCK SANDBOX
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Print and Webhook buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {order.shipping_label ? (
                <a
                  href={order.shipping_label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Printer size={14} /> Cetak Label Pengiriman (Biteship PDF)
                </a>
              ) : (
                <button
                  onClick={() => setShowPrintLabel(true)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Printer size={14} /> Cetak Label Toko (Standard)
                </button>
              )}
            </div>

            {/* Tracking Log */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Status Perjalanan Real-Time
              </p>
              
              {loadingTracking ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  <Loader2 size={14} className="animate-spin" /> Menghubungi Biteship tracking...
                </div>
              ) : trackingInfo?.checkpoints && trackingInfo.checkpoints.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '14px', borderLeft: '2px solid var(--color-border)' }}>
                  {trackingInfo.checkpoints.slice().reverse().map((cp: any, idx: number) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Bullet */}
                      <div style={{
                        position: 'absolute',
                        left: '-21px',
                        top: '4px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: idx === 0 ? 'var(--color-success)' : 'var(--color-border)',
                        border: '3px solid var(--color-bg-secondary)'
                      }} />
                      <p style={{ fontSize: '13px', fontWeight: idx === 0 ? 600 : 500, color: idx === 0 ? 'var(--color-text)' : 'var(--color-text-secondary)', margin: '0 0 2px 0' }}>
                        {cp.description}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                        {cp.location} • {formatDateTime(cp.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Menunggu kurir melakukan pick up paket.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Pesanan ini siap dikirimkan. Anda dapat memesan kurir secara langsung ke Biteship. Kurir akan datang menjemput barang sesuai alamat toko.
            </p>

            <div style={{
              background: 'var(--color-bg-secondary)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Kurir Pilihan Pelanggan
                </p>
                <p style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                  <span className="badge" style={{ background: 'var(--color-primary)15', color: 'var(--color-primary)', border: '1px solid var(--color-primary)30', textTransform: 'uppercase', padding: '2px 8px', marginRight: '8px' }}>
                    {order.shipping_courier || 'JNE'}
                  </span>
                  <span style={{ textTransform: 'uppercase' }}>{order.shipping_service || 'REG'}</span>
                </p>
              </div>
              <button
                onClick={handleBookShipmentAuto}
                disabled={updating || !['paid', 'processing'].includes(order.status)}
                className="btn btn-primary"
                style={{ gap: '6px', padding: '10px 18px' }}
              >
                {updating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    <Truck size={16} /> Booking Kurir Otomatis (Sesuai Pilihan User)
                  </>
                )}
              </button>
            </div>

            {/* Toggle Manual Shipping */}
            <div style={{ textAlign: 'right', marginBottom: showManualShipping ? '16px' : '0' }}>
              <button
                onClick={() => setShowManualShipping(!showManualShipping)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                {showManualShipping ? '← Sembunyikan Pengaturan Manual' : 'Atur Kurir / Layanan Secara Manual (Biteship) ⚙️'}
              </button>
            </div>

            {/* Courier Selection Form (Hidden by default) */}
            {showManualShipping && (
              <div style={{ background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--color-border)', marginTop: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px', fontWeight: 500 }}>
                  Gunakan form di bawah ini jika Anda ingin mengubah kurir atau jenis layanan yang berbeda dari pilihan pelanggan:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Pilih Kurir Baru</label>
                    <select
                      className="input"
                      style={{ padding: '8px 10px', fontSize: '13px' }}
                      value={courierCode}
                      onChange={(e) => setCourierCode(e.target.value)}
                      disabled={updating}
                    >
                      <option value="jne">JNE (Jalur Nugraha Ekakurir)</option>
                      <option value="jnt">J&T Express</option>
                      <option value="sicepat">SiCepat Express</option>
                      <option value="anteraja">Anteraja</option>
                      <option value="pos">POS Indonesia</option>
                      <option value="tiki">TIKI</option>
                      <option value="ninja">Ninja Xpress</option>
                      <option value="lion">Lion Parcel</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Layanan Kurir Baru</label>
                    <select
                      className="input"
                      style={{ padding: '8px 10px', fontSize: '13px' }}
                      value={courierService}
                      onChange={(e) => setCourierService(e.target.value)}
                      disabled={updating}
                    >
                      <option value="reg">REG (Regular Service)</option>
                      <option value="yes">YES / BEST / ONS (Next Day)</option>
                      <option value="eco">ECO (Economy Service)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleBookShipment}
                  disabled={updating || !['paid', 'processing'].includes(order.status)}
                  className="btn btn-secondary"
                  style={{ width: '100%', gap: '6px', justifyContent: 'center', display: 'flex', alignItems: 'center', fontSize: '13px', padding: '10px' }}
                >
                  {updating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Menghubungi Biteship...
                    </>
                  ) : (
                    <>
                      <Truck size={16} /> Booking Kurir Manual (Gunakan Pilihan Di Atas)
                    </>
                  )}
                </button>
              </div>
            )}

            {!['paid', 'processing'].includes(order.status) && (
              <p style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '6px', textAlign: 'center', margin: '6px 0 0 0' }}>
                * Booking kurir hanya tersedia untuk pesanan dengan status "Dibayar" atau "Diproses".
              </p>
            )}
          </div>
        )}
      </div>

      {/* Shipping address */}
      <div className="card" style={{ padding: '20px', marginTop: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={16} /> Alamat Pengiriman
        </h3>
        <div style={{ fontSize: '14px', lineHeight: 1.7 }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>{order.shipping_address}</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}
          </p>
          <p style={{ marginTop: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Truck size={14} /> {order.shipping_courier?.toUpperCase()} {order.shipping_service}
          </p>
          {order.shipping_tracking && (
            <p style={{ marginTop: '4px' }}>
              Resi: <strong style={{ fontFamily: 'monospace' }}>{order.shipping_tracking}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Print Label Modal */}
      {showPrintLabel && order.shipping_tracking && (
        <PrintLabel
          order={order as any}
          items={items as any}
          onClose={() => setShowPrintLabel(false)}
        />
      )}
    </div>
  )
}
