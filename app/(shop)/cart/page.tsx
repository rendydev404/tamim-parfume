'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Droplets } from 'lucide-react'
import { useCartStore, type CartItem } from '@/stores/cart-store'
import { formatRupiah } from '@/lib/utils'
export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <>
<main className="page-content">
          <div className="container" style={{ paddingTop: '24px' }}>
            <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
          </div>
        </main>
</>
    )
  }

  return (
    <>
<main className="page-content">
        <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Keranjang Belanja</h1>

          {items.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={64} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
              <h3 className="empty-state__title">Keranjang kosong</h3>
              <p className="empty-state__description">
                Belum ada produk di keranjang. Yuk mulai belanja!
              </p>
              <Link href="/products" className="btn btn-primary" style={{ marginTop: '20px' }}>
                Mulai Belanja
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              <style>{`
                @media (min-width: 768px) {
                  .cart-layout {
                    grid-template-columns: 1fr 360px !important;
                  }
                }
              `}</style>
              <div className="cart-layout" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Cart Items */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span className="text-sm text-muted">{items.length} produk</span>
                    <button className="btn btn-ghost btn-sm text-error" onClick={clearCart} style={{ color: 'var(--color-error)' }}>
                      Hapus Semua
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {items.map((item: CartItem) => (
                      <div
                        key={item.id}
                        className="card"
                        style={{ display: 'flex', gap: '12px', padding: '16px' }}
                      >
                        {/* Image */}
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          background: 'var(--color-bg-secondary)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Droplets size={24} style={{ color: 'var(--color-text-muted)' }} />
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', fontFamily: 'var(--font-body)' }} className="truncate">
                            {item.name}
                          </h3>
                          {item.variant_label && (
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                              Ukuran: {item.variant_label}
                            </p>
                          )}
                          <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                            {formatRupiah(item.price)}
                          </p>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {/* Quantity */}
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                            }}>
                              <button
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px' }}
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={14} />
                              </button>
                              <span style={{ width: '32px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                                {item.quantity}
                              </span>
                              <button
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px' }}
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            {/* Delete */}
                            <button
                              className="btn btn-ghost btn-icon"
                              style={{ color: 'var(--color-error)' }}
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div style={{ position: 'sticky', top: 'calc(var(--header-height) + 16px)', alignSelf: 'start' }}>
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
                      Ringkasan Belanja
                    </h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                      <span className="text-secondary">Total Harga ({items.length} produk)</span>
                      <span>{formatRupiah(getTotalPrice())}</span>
                    </div>

                    <div style={{
                      borderTop: '1px solid var(--color-border-light)',
                      paddingTop: '12px',
                      marginTop: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '16px',
                      fontWeight: 700,
                    }}>
                      <span>Total</span>
                      <span>{formatRupiah(getTotalPrice())}</span>
                    </div>

                    <Link href="/checkout" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '16px' }}>
                      Checkout
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
</>
  )
}
