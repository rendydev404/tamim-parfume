'use client'

import { useRef } from 'react'
import { STORE_INFO } from '@/lib/constants'
import { formatRupiah, formatDate, formatWeight } from '@/lib/utils'
import { Printer, X } from 'lucide-react'

interface OrderItem {
  product_name: string
  product_image: string | null
  quantity: number
  price: number
  subtotal: number
  variant_label?: string | null
}

interface PrintLabelProps {
  order: {
    order_number: string
    shipping_tracking: string
    shipping_courier: string
    shipping_service: string
    recipient_name: string
    recipient_phone: string
    shipping_address: string
    shipping_city: string
    shipping_province: string
    shipping_postal_code: string
    subtotal: number
    shipping_cost: number
    total: number
    created_at: string
    notes?: string | null
  }
  items: OrderItem[]
  onClose: () => void
}

export default function PrintLabel({ order, items, onClose }: PrintLabelProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  // Calculate total weight (estimate 200g per item if not available)
  const estimatedWeight = items.reduce((sum, item) => sum + item.quantity * 200, 0)

  return (
    <>
      {/* Backdrop */}
      <div
        className="print-label-backdrop"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="print-label-modal">
        {/* Modal controls (hidden on print) */}
        <div className="print-label-controls">
          <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={18} /> Cetak Resi
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrint} className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="btn btn-secondary btn-sm">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Printable Label */}
        <div className="print-label" ref={printRef}>
          {/* Header - Store & Courier */}
          <div className="print-label__header">
            <div className="print-label__store">
              <h2 className="print-label__store-name">{STORE_INFO.name}</h2>
              <p className="print-label__store-addr">
                {STORE_INFO.address}, {STORE_INFO.district}
              </p>
              <p className="print-label__store-addr">
                {STORE_INFO.city}, {STORE_INFO.province} {STORE_INFO.postal_code}
              </p>
            </div>
            <div className="print-label__courier">
              <span className="print-label__courier-name">{order.shipping_courier?.toUpperCase()}</span>
              <span className="print-label__courier-service">{order.shipping_service}</span>
            </div>
          </div>

          {/* Tracking Number */}
          <div className="print-label__tracking">
            <span className="print-label__tracking-label">NOMOR RESI</span>
            <span className="print-label__tracking-number">{order.shipping_tracking}</span>
            {/* Barcode visual (CSS stripes) */}
            <div className="print-label__barcode">
              {order.shipping_tracking.split('').map((char, i) => (
                <div
                  key={i}
                  className="print-label__barcode-bar"
                  style={{
                    width: char.charCodeAt(0) % 2 === 0 ? '2px' : '3px',
                    opacity: char.charCodeAt(0) % 3 === 0 ? 0.4 : 1,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Sender */}
          <div className="print-label__section">
            <span className="print-label__section-label">PENGIRIM</span>
            <p className="print-label__section-name">{STORE_INFO.name}</p>
            <p className="print-label__section-detail">
              {STORE_INFO.address}, {STORE_INFO.district}, {STORE_INFO.city}
            </p>
            <p className="print-label__section-detail">
              {STORE_INFO.province} {STORE_INFO.postal_code}
            </p>
            {(STORE_INFO.phone as string) !== '-' && (
              <p className="print-label__section-detail">Tel: {STORE_INFO.phone}</p>
            )}
          </div>

          {/* Recipient */}
          <div className="print-label__section print-label__section--recipient">
            <span className="print-label__section-label">PENERIMA</span>
            <p className="print-label__section-name">{order.recipient_name}</p>
            <p className="print-label__section-detail">{order.recipient_phone}</p>
            <p className="print-label__section-detail">{order.shipping_address}</p>
            <p className="print-label__section-detail">
              {order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}
            </p>
          </div>

          {/* Products */}
          <div className="print-label__products">
            <span className="print-label__section-label">ISI PAKET</span>
            <table className="print-label__products-table">
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="print-label__product-qty">{item.quantity}x</td>
                    <td className="print-label__product-name">
                      {item.product_name}
                      {item.variant_label && (
                        <span className="print-label__product-variant"> ({item.variant_label})</span>
                      )}
                    </td>
                    <td className="print-label__product-price">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="print-label__footer">
            <div className="print-label__footer-row">
              <span>Berat: ±{formatWeight(estimatedWeight)}</span>
              <span>Ongkir: {formatRupiah(order.shipping_cost)}</span>
            </div>
            <div className="print-label__footer-row">
              <span>No. Pesanan: #{order.order_number}</span>
              <span>Tanggal: {formatDate(order.created_at)}</span>
            </div>
            {order.notes && (
              <div className="print-label__notes">
                <span>Catatan: {order.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
