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
      <main className="page-content">
        <div className="container" style={{ paddingTop: '24px' }}>
          <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
        </div>
      </main>
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
            <div>
              {/* Responsive Cart CSS Stylesheet */}
              <style>{`
                /* Layout and Grid */
                .cart-layout {
                  display: grid;
                  grid-template-columns: 1fr;
                  gap: 24px;
                  align-items: start;
                }

                @media (min-width: 1024px) {
                  .cart-layout {
                    grid-template-columns: 1fr 380px !important;
                    gap: 32px !important;
                  }
                }

                /* Card Styling */
                .cart-item-card {
                  position: relative;
                  display: flex;
                  gap: 16px;
                  padding: 20px;
                  background: var(--color-bg);
                  border: 1px solid var(--color-border-light);
                  border-radius: var(--radius-lg);
                  transition: all var(--transition-base);
                  box-shadow: var(--shadow-sm);
                }

                .cart-item-card:hover {
                  box-shadow: var(--shadow-md);
                  border-color: var(--color-border);
                }

                /* Image Wrapper */
                .cart-item-image-wrapper {
                  width: 100px;
                  height: 100px;
                  border-radius: var(--radius-md);
                  overflow: hidden;
                  background: var(--color-bg-secondary);
                  flex-shrink: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 1px solid var(--color-border-light);
                }

                .cart-item-image {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }

                /* Info Pane */
                .cart-item-info {
                  flex: 1;
                  min-width: 0;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                }

                .cart-item-header {
                  padding-right: 36px; /* Space for top-right absolute delete button */
                }

                .cart-item-title {
                  font-size: 14px;
                  font-weight: 600;
                  line-height: 1.4;
                  margin-bottom: 4px;
                  color: var(--color-text);
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }

                .cart-item-variant {
                  font-size: 12px;
                  color: var(--color-text-muted);
                  margin-bottom: 4px;
                }

                .cart-item-price {
                  font-size: 15px;
                  font-weight: 700;
                  color: var(--color-primary);
                  margin-bottom: 8px;
                }

                /* Quantity & Action Panel */
                .cart-item-bottom-bar {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  margin-top: 8px;
                }

                .cart-item-qty-control {
                  display: inline-flex;
                  align-items: center;
                  border: 1px solid var(--color-border);
                  border-radius: var(--radius-sm);
                  background: var(--color-bg);
                  overflow: hidden;
                }

                .cart-item-qty-btn {
                  width: 32px;
                  height: 32px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: transparent;
                  border: none;
                  cursor: pointer;
                  color: var(--color-text);
                  transition: background-color var(--transition-fast);
                }

                .cart-item-qty-btn:hover:not(:disabled) {
                  background-color: var(--color-bg-secondary);
                }

                .cart-item-qty-btn:disabled {
                  opacity: 0.3;
                  cursor: not-allowed;
                }

                .cart-item-qty-value {
                  width: 32px;
                  text-align: center;
                  font-size: 13px;
                  font-weight: 600;
                }

                /* Absolute delete button */
                .cart-item-remove-btn {
                  position: absolute;
                  top: 16px;
                  right: 16px;
                  width: 32px;
                  height: 32px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: var(--radius-sm);
                  background: transparent;
                  border: none;
                  cursor: pointer;
                  color: var(--color-text-muted);
                  transition: all var(--transition-fast);
                }

                .cart-item-remove-btn:hover {
                  color: var(--color-error);
                  background-color: #fee2e2;
                }

                /* Sticky summary positioning */
                .cart-summary-sticky {
                  position: sticky;
                  top: calc(var(--header-height) + 24px);
                  align-self: start;
                  width: 100%;
                }

                .cart-summary-card {
                  padding: 24px;
                  background: var(--color-bg);
                  border: 1px solid var(--color-border-light);
                  border-radius: var(--radius-lg);
                  box-shadow: var(--shadow-sm);
                }

                /* Custom Checkout Button */
                .cart-checkout-btn {
                  display: flex !important;
                  width: 100%;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  padding: 16px 24px;
                  font-size: 15px;
                  font-weight: 700;
                  border-radius: var(--radius-md);
                  background-color: var(--color-primary) !important;
                  color: var(--color-secondary) !important;
                  transition: all var(--transition-fast) !important;
                  margin-top: 16px;
                  border: none;
                  cursor: pointer;
                  box-sizing: border-box;
                }

                .cart-checkout-btn:hover {
                  background-color: var(--color-primary-hover) !important;
                }

                /* Mobile responsive override */
                @media (max-width: 576px) {
                  .cart-item-card {
                    padding: 16px 12px;
                    gap: 12px;
                  }
                  
                  .cart-item-image-wrapper {
                    width: 80px;
                    height: 80px;
                  }
                  
                  .cart-item-remove-btn {
                    top: 12px;
                    right: 12px;
                  }
                  
                  .cart-item-header {
                    padding-right: 28px;
                  }
                  
                  .cart-item-title {
                    font-size: 13px;
                    margin-bottom: 2px;
                  }
                  
                  .cart-item-price {
                    font-size: 14px;
                    margin-bottom: 4px;
                  }
                  
                  .cart-item-bottom-bar {
                    margin-top: 4px;
                  }
                }
              `}</style>

              <div className="cart-layout">
                {/* Cart Items List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                      {items.length} produk
                    </span>
                    <button className="btn btn-ghost btn-sm text-error" onClick={clearCart} style={{ color: 'var(--color-error)' }}>
                      Hapus Semua
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {items.map((item: CartItem) => (
                      <div key={item.id} className="cart-item-card">
                        {/* Remove Button (Absolute Position) */}
                        <button
                          className="cart-item-remove-btn"
                          title="Hapus produk"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>

                        {/* Product Image */}
                        <div className="cart-item-image-wrapper">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="cart-item-image" />
                          ) : (
                            <Droplets size={24} style={{ color: 'var(--color-text-muted)' }} />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="cart-item-info">
                          <div className="cart-item-header">
                            <h3 className="cart-item-title" title={item.name}>
                              {item.name}
                            </h3>
                            {item.variant_label && (
                              <p className="cart-item-variant">
                                Ukuran: {item.variant_label}
                              </p>
                            )}
                          </div>

                          <div className="cart-item-bottom-bar">
                            <p className="cart-item-price">
                              {formatRupiah(item.price)}
                            </p>

                            {/* Quantity Controls */}
                            <div className="cart-item-qty-control">
                              <button
                                className="cart-item-qty-btn"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={14} />
                              </button>
                              <span className="cart-item-qty-value">
                                {item.quantity}
                              </span>
                              <button
                                className="cart-item-qty-btn"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary Section */}
                <div className="cart-summary-sticky">
                  <div className="cart-summary-card">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
                      Ringkasan Belanja
                    </h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Total Harga ({items.length} produk)</span>
                      <span style={{ fontWeight: 500 }}>{formatRupiah(getTotalPrice())}</span>
                    </div>

                    <div style={{
                      borderTop: '1px solid var(--color-border-light)',
                      paddingTop: '16px',
                      marginTop: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '16px',
                      fontWeight: 700,
                    }}>
                      <span>Total</span>
                      <span style={{ color: 'var(--color-primary)' }}>{formatRupiah(getTotalPrice())}</span>
                    </div>

                    <Link href="/checkout" className="cart-checkout-btn">
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
