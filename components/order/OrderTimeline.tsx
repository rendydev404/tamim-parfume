'use client'

import { ORDER_STATUS } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import { Check, Package, Truck, CreditCard, Clock, XCircle, RotateCcw, CheckCircle2 } from 'lucide-react'

interface OrderTimelineProps {
  status: string
  createdAt: string
  paidAt?: string | null
  shippingTracking?: string | null
}

const TIMELINE_STEPS = [
  {
    key: 'pending_payment',
    label: 'Menunggu Pembayaran',
    icon: Clock,
  },
  {
    key: 'paid',
    label: 'Pembayaran Diterima',
    icon: CreditCard,
  },
  {
    key: 'processing',
    label: 'Pesanan Diproses',
    icon: Package,
  },
  {
    key: 'shipped',
    label: 'Dalam Pengiriman',
    icon: Truck,
  },
  {
    key: 'delivered',
    label: 'Pesanan Selesai',
    icon: CheckCircle2,
  },
]

const STATUS_ORDER = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered']

export default function OrderTimeline({ status, createdAt, paidAt, shippingTracking }: OrderTimelineProps) {
  const isCancelled = status === 'cancelled'
  const isRefunded = status === 'refunded'
  const currentIndex = STATUS_ORDER.indexOf(status)

  if (isCancelled) {
    return (
      <div className="order-timeline order-timeline--cancelled">
        <div className="order-timeline__cancelled">
          <XCircle size={40} style={{ color: 'var(--color-danger)' }} />
          <p className="order-timeline__cancelled-title">Pesanan Dibatalkan</p>
          <p className="order-timeline__cancelled-date">{formatDateTime(createdAt)}</p>
        </div>
      </div>
    )
  }

  if (isRefunded) {
    return (
      <div className="order-timeline order-timeline--refunded">
        <div className="order-timeline__cancelled">
          <RotateCcw size={40} style={{ color: '#6b7280' }} />
          <p className="order-timeline__cancelled-title">Dana Dikembalikan</p>
          <p className="order-timeline__cancelled-date">{formatDateTime(createdAt)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="order-timeline">
      {TIMELINE_STEPS.map((step, index) => {
        const Icon = step.icon
        const isCompleted = index <= currentIndex
        const isActive = index === currentIndex

        return (
          <div
            key={step.key}
            className={`order-timeline__step ${isCompleted ? 'order-timeline__step--completed' : ''} ${isActive ? 'order-timeline__step--active' : ''}`}
          >
            <div className="order-timeline__step-indicator">
              <div className="order-timeline__step-circle">
                {isCompleted ? <Check size={14} /> : <Icon size={14} />}
              </div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div className={`order-timeline__step-line ${index < currentIndex ? 'order-timeline__step-line--completed' : ''}`} />
              )}
            </div>
            <div className="order-timeline__step-content">
              <p className="order-timeline__step-label">{step.label}</p>
              {step.key === 'pending_payment' && createdAt && (
                <p className="order-timeline__step-date">{formatDateTime(createdAt)}</p>
              )}
              {step.key === 'paid' && paidAt && (
                <p className="order-timeline__step-date">{formatDateTime(paidAt)}</p>
              )}
              {step.key === 'shipped' && shippingTracking && isCompleted && (
                <p className="order-timeline__step-tracking">
                  Resi: <strong>{shippingTracking}</strong>
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
