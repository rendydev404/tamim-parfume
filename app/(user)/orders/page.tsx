import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah, formatDate } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import { Package, Droplets, Clock, AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pesanan Saya',
}

// Auto-cancel expired unpaid orders
async function autoCancelExpiredOrders(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    // Find pending_payment orders where payment has expired
    const now = new Date().toISOString()

    const { data: expiredOrders } = await supabase
      .from('orders')
      .select('id, order_number, payment_expired_at, created_at')
      .eq('status', 'pending_payment')

    if (!expiredOrders || expiredOrders.length === 0) return

    for (const order of expiredOrders) {
      // Check if payment_expired_at has passed, or if created_at is more than 24 hours ago
      const expiredAt = order.payment_expired_at
        ? new Date(order.payment_expired_at)
        : new Date(new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000) // Default 24h

      if (new Date(now) > expiredAt) {
        // Cancel the order
        await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            updated_at: now,
          })
          .eq('id', order.id)

        // Restore product/variant stock
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, variant_id, quantity')
          .eq('order_id', order.id)

        if (orderItems) {
          for (const item of orderItems) {
            if (item.variant_id) {
              // Restore variant stock
              const { data: variant } = await supabase
                .from('product_variants')
                .select('stock')
                .eq('id', item.variant_id)
                .single()

              if (variant) {
                await supabase
                  .from('product_variants')
                  .update({ stock: variant.stock + item.quantity })
                  .eq('id', item.variant_id)
              }
            } else if (item.product_id) {
              // Restore product stock
              const { data: product } = await supabase
                .from('products')
                .select('stock')
                .eq('id', item.product_id)
                .single()

              if (product) {
                await supabase
                  .from('products')
                  .update({ stock: product.stock + item.quantity })
                  .eq('id', item.product_id)
              }
            }
          }
        }

        // Restore coupon usage
        const { data: orderCoupon } = await supabase
          .from('order_coupons')
          .select('coupon_id')
          .eq('order_id', order.id)
          .single()

        if (orderCoupon) {
          const { data: couponData } = await supabase
            .from('coupons')
            .select('used_count')
            .eq('id', orderCoupon.coupon_id)
            .single()

          if (couponData && couponData.used_count > 0) {
            await supabase
              .from('coupons')
              .update({ used_count: couponData.used_count - 1 })
              .eq('id', orderCoupon.coupon_id)
          }
        }
      }
    }
  } catch (error) {
    console.error('Auto-cancel error:', error)
  }
}

interface OrderItem {
  id: string
  product_name: string | null
  product_image: string | null
  quantity: number
  price: number
  product_id: string | null
  product: {
    name: string
    images: { url: string; is_primary: boolean }[]
  } | null
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Auto-cancel expired orders first
  await autoCancelExpiredOrders(supabase)

  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(id, product_id, product_name, product_image, quantity, price, product:products(name, images:product_images(url, is_primary)))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Pesanan Saya</h1>

      {orders && orders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.map((order) => {
            const status = ORDER_STATUS[order.status] || { label: order.status, color: '#999' }
            const items = (order.items || []) as OrderItem[]
            const displayItems = items.slice(0, 3)
            const remainingCount = items.length - 3

            // Check if payment is about to expire (for pending orders)
            const isExpiringSoon = order.status === 'pending_payment' && order.payment_expired_at && (() => {
              const expiry = new Date(order.payment_expired_at).getTime()
              const now = Date.now()
              const diff = expiry - now
              return diff > 0 && diff < 2 * 60 * 60 * 1000 // Less than 2 hours
            })()

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="card"
                style={{ padding: '16px', textDecoration: 'none', display: 'block', transition: 'all 0.2s ease' }}
              >
                {/* Header: Order number + Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>#{order.order_number}</span>
                  <span className="badge" style={{ background: `${status.color}20`, color: status.color, fontSize: '11px', padding: '4px 10px' }}>
                    {status.label}
                  </span>
                </div>

                {/* Expiring soon warning */}
                {isExpiringSoon && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 10px', borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    marginBottom: '12px',
                    fontSize: '12px', color: '#f59e0b',
                  }}>
                    <AlertTriangle size={14} />
                    <span>Segera bayar sebelum pembayaran kedaluwarsa</span>
                  </div>
                )}

                {/* Product items with images */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                  {displayItems.map((item) => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      {/* Product image */}
                      {(() => {
                        const productImages = item.product?.images || []
                        const primaryImg = productImages.find((img: { is_primary: boolean }) => img.is_primary) || productImages[0]
                        const displayImage = item.product_image || primaryImg?.url || null
                        const displayName = item.product_name || item.product?.name || 'Produk'
                        return (
                          <>
                            <div style={{
                              width: '48px', height: '48px',
                              borderRadius: '8px',
                              background: 'var(--color-bg-secondary)',
                              flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              overflow: 'hidden',
                              border: '1px solid var(--color-border-light)',
                            }}>
                              {(() => {
                                const isVid = (url: string) => url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video') || url.includes('.mp4'));
                                
                                let displayImg = displayImage;
                                if (displayImg && isVid(displayImg)) {
                                  const productImages = item.product?.images || [];
                                  const nonVidImg = productImages.find((img: any) => !isVid(img.url));
                                  displayImg = nonVidImg?.url || displayImg;
                                }

                                return displayImg ? (
                                  <img src={displayImg} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <Droplets size={18} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                                );
                              })()}
                            </div>

                            {/* Product info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                fontSize: '13px', fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                margin: 0,
                              }}>
                                {displayName}
                              </p>
                              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                                {item.quantity} × {formatRupiah(item.price)}
                              </p>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  ))}

                  {remainingCount > 0 && (
                    <p style={{
                      fontSize: '12px', color: 'var(--color-text-muted)',
                      margin: 0, paddingLeft: '58px',
                    }}>
                      +{remainingCount} produk lainnya
                    </p>
                  )}
                </div>

                {/* Footer: Date, courier, total */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-border-light)',
                }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>
                      {formatDate(order.created_at)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {order.shipping_courier} {order.shipping_service} • {order.recipient_name}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>
                    {formatRupiah(order.total)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Package size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 className="empty-state__title">Belum ada pesanan</h3>
          <p className="empty-state__description">Pesanan Anda akan muncul di sini</p>
          <Link href="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Mulai Belanja
          </Link>
        </div>
      )}
    </div>
  )
}
