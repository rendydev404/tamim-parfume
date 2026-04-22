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

    setOrder(orderData)

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
    setUpdating(true)

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
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
