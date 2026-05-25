import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import OrderTimeline from '@/components/order/OrderTimeline'
import TrackingPanel from '@/components/order/TrackingPanel'
import ReturnOrderButton from '@/components/order/ReturnOrderButton'
import Link from 'next/link'
import { ArrowLeft, Package, MapPin, CreditCard, Droplets, FileText, XCircle, Clock, Wallet, ShoppingBag, Check } from 'lucide-react'
import CancelOrderButton from '@/components/order/CancelOrderButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Detail Pesanan',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(name, slug, images:product_images(url, is_primary)))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!order) notFound()

  const { data: userReviews } = await supabase
    .from('reviews')
    .select('order_id, product_id')
    .eq('user_id', user.id)

  const reviewedKeys = new Set((userReviews || []).map(r => `${r.order_id}_${r.product_id}`))

  // Get coupon info if applied
  const { data: orderCoupon } = await supabase
    .from('order_coupons')
    .select('*')
    .eq('order_id', order.id)
    .single()

  // Get return info if requested
  const { data: returnRequest } = await supabase
    .from('returns')
    .select('*')
    .eq('order_id', order.id)
    .maybeSingle()

  const status = ORDER_STATUS[order.status] || { label: order.status, color: '#999' }

  // Calculate payment expiry countdown info
  const paymentExpired = order.status === 'pending_payment' && order.payment_expired_at
    ? new Date(order.payment_expired_at) < new Date()
    : false

  const paymentExpiryTime = order.payment_expired_at
    ? formatDateTime(order.payment_expired_at)
    : null

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px', maxWidth: '720px' }}>
      <Link href="/orders" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px', textDecoration: 'none' }}>
        <ArrowLeft size={16} /> Kembali ke Pesanan
      </Link>

      {/* Order header */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No. Pesanan</p>
            <h1 style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
              #{order.order_number}
            </h1>
          </div>
          <span className="badge" style={{ background: `${status.color}20`, color: status.color, fontSize: '12px', padding: '6px 12px' }}>
            {status.label}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Dipesan pada {formatDateTime(order.created_at)}
        </p>
      </div>

      {/* Timeline */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={16} /> Status Pesanan
        </h3>
        <OrderTimeline
          status={order.status}
          createdAt={order.created_at}
          paidAt={order.paid_at}
          shippingTracking={order.shipping_tracking}
        />
      </div>

      {/* Payment expiry warning */}
      {order.status === 'pending_payment' && paymentExpiryTime && !paymentExpired && (
        <div className="card" style={{
          padding: '16px 20px', marginBottom: '16px',
          borderLeft: '3px solid #f59e0b',
          background: 'rgba(245, 158, 11, 0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Clock size={16} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>Batas Waktu Pembayaran</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
            Bayar sebelum <strong>{paymentExpiryTime}</strong>, atau pesanan akan dibatalkan otomatis.
          </p>
        </div>
      )}

      {/* Payment expired info */}
      {order.status === 'pending_payment' && paymentExpired && (
        <div className="card" style={{
          padding: '16px 20px', marginBottom: '16px',
          borderLeft: '3px solid #ef4444',
          background: 'rgba(239, 68, 68, 0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <XCircle size={16} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>Pembayaran Kedaluwarsa</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
            Batas waktu pembayaran telah berakhir. Pesanan ini akan segera dibatalkan.
          </p>
        </div>
      )}

      {/* Payment link */}
      {order.status === 'pending_payment' && order.payment_reference && !paymentExpired && (
        <a
          href={`/payment/${order.payment_reference}`}
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
        >
          Bayar Sekarang <CreditCard size={16} />
        </a>
      )}

      {/* Cancel button — only for pending_payment and paid */}
      {(order.status === 'pending_payment' || order.status === 'paid') && (
        <div style={{ marginBottom: '16px' }}>
          <CancelOrderButton orderId={order.id} orderStatus={order.status} />
        </div>
      )}

      {/* Tracking panel — only for shipped and delivered */}
      {(order.status === 'shipped' || order.status === 'delivered') && (
        <div style={{ marginBottom: '16px' }}>
          <TrackingPanel orderId={order.id} />
        </div>
      )}

      {/* Return order button */}
      {order.status === 'delivered' && (
        <ReturnOrderButton orderId={order.id} deliveredAt={order.delivered_at} />
      )}

      {/* Cancellation info */}
      {order.status === 'cancelled' && order.cancel_reason && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '16px', borderLeft: '3px solid var(--color-error)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
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

      {/* Return Request Info */}
      {returnRequest && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '16px', borderLeft: `3px solid ${returnRequest.status === 'rejected' ? 'var(--color-error)' : returnRequest.status === 'approved' ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <XCircle size={16} style={{ color: returnRequest.status === 'rejected' ? 'var(--color-error)' : returnRequest.status === 'approved' ? 'var(--color-success)' : 'var(--color-warning)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: returnRequest.status === 'rejected' ? 'var(--color-error)' : returnRequest.status === 'approved' ? 'var(--color-success)' : 'var(--color-warning-dark)' }}>
              Status Pengajuan Retur: {returnRequest.status === 'pending' ? 'Menunggu Review Admin' : returnRequest.status === 'approved' ? 'Retur Disetujui' : returnRequest.status === 'completed' ? 'Retur Selesai (Refunded)' : 'Retur Ditolak'}
            </span>
          </div>
          
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: returnRequest.admin_notes ? '12px' : '0' }}>
            <strong>Alasan Anda:</strong> {returnRequest.reason}
          </div>

          {returnRequest.admin_notes && (
            <div style={{ background: 'var(--color-bg-secondary)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
              <strong>Catatan Admin:</strong> {returnRequest.admin_notes}
            </div>
          )}

          {returnRequest.status === 'approved' && !returnRequest.return_tracking_number && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <p style={{ fontSize: '13px', margin: '0 0 8px 0' }}><strong>Tindakan Diperlukan:</strong> Mohon kirimkan barang retur ke alamat toko kami dan hubungi admin untuk konfirmasi nomor resi pengiriman Anda.</p>
            </div>
          )}
        </div>
      )}

      {/* Order items with product detail */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={16} /> Produk Dipesan ({order.items?.length || 0} item)
        </h3>
        {order.items?.map((item: Record<string, unknown>, index: number) => {
          const productData = item.product as { name: string; slug: string; images: { url: string; is_primary: boolean }[] } | null
          const productImages = productData?.images || []
          const primaryImg = productImages.find(img => img.is_primary) || productImages[0]
          const displayImage = (item.product_image as string) || primaryImg?.url || null
          const displayName = (item.product_name as string) || productData?.name || 'Produk'
          const isCompleted = order.status === 'delivered' || order.status === 'completed'
          const hasReviewed = item.product_id && reviewedKeys.has(`${order.id}_${item.product_id}`)
          return (
            <div key={item.id as string} style={{
              display: 'flex',
              gap: '12px',
              padding: '14px 0',
              borderBottom: index < (order.items?.length || 0) - 1 ? '1px solid var(--color-border-light)' : 'none',
            }}>
              {/* Product image */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '10px',
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
                    <Droplets size={24} style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} />
                  );
                })()}
              </div>

              {/* Product details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>
                  {displayName}
                </p>
                {item.variant_label ? (
                  <p style={{
                    fontSize: '11px', color: 'var(--color-primary)',
                    margin: '0 0 4px 0',
                    padding: '2px 8px',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '4px',
                    display: 'inline-block',
                  }}>
                    {String(item.variant_label)}
                  </p>
                ) : null}
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 2px 0' }}>
                  {item.quantity as number} × {formatRupiah(item.price as number)}
                </p>

                {isCompleted && productData?.slug && (
                  <div style={{ marginTop: '8px' }}>
                    {hasReviewed ? (
                      <span
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.08)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.15)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={12} strokeWidth={3} /> Sudah Diulas
                      </span>
                    ) : (
                      <Link
                        href={`/products/${productData.slug}?order_id=${order.id}#reviews`}
                        className="btn"
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                      >
                        Beri Ulasan
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Subtotal */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>
                  {formatRupiah(item.subtotal as number)}
                </span>
              </div>
            </div>
          )
        })}

        {/* Price breakdown */}
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Subtotal ({order.items?.length || 0} item)</span>
            <span>{formatRupiah(order.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Ongkos Kirim</span>
            <span>{formatRupiah(order.shipping_cost)}</span>
          </div>
          {orderCoupon && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#10b981' }}>
              <span>Diskon ({orderCoupon.coupon_code})</span>
              <span>-{formatRupiah(orderCoupon.discount_amount)}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '16px',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '10px',
            marginTop: '6px',
          }}>
            <span>Total</span>
            <span style={{ color: 'var(--color-primary)' }}>{formatRupiah(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Payment info */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wallet size={16} /> Informasi Pembayaran
        </h3>
        <div style={{ fontSize: '14px', lineHeight: 1.8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Metode Pembayaran</span>
            <span style={{ fontWeight: 500 }}>{order.payment_method || '-'}</span>
          </div>
          {order.payment_reference && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Referensi</span>
              <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '12px' }}>{order.payment_reference}</span>
            </div>
          )}
          {order.paid_at && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Dibayar pada</span>
              <span style={{ fontWeight: 500 }}>{formatDateTime(order.paid_at)}</span>
            </div>
          )}
          {order.payment_expired_at && order.status === 'pending_payment' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Batas Bayar</span>
              <span style={{ fontWeight: 500, color: paymentExpired ? '#ef4444' : '#f59e0b' }}>
                {formatDateTime(order.payment_expired_at)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Shipping info */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={16} /> Informasi Pengiriman
        </h3>
        <div style={{ fontSize: '14px', lineHeight: 1.7 }}>
          <p style={{ fontWeight: 500 }}>{order.recipient_name}</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>{order.recipient_phone}</p>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>{order.shipping_address}</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>{order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}</p>
          <p style={{ marginTop: '8px', fontWeight: 500 }}>
            {order.shipping_courier?.toUpperCase()} {order.shipping_service}
          </p>
          {order.shipping_tracking && ['shipped', 'delivered', 'completed'].includes(order.status) && (
            <p style={{ marginTop: '4px', fontSize: '15px' }}>
              Resi: <strong style={{ fontFamily: 'monospace' }}>{order.shipping_tracking}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Order Notes */}
      {order.notes && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} /> Catatan Pesanan
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: 0 }}>
            {order.notes}
          </p>
        </div>
      )}
    </div>
  )
}
