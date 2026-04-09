import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, User, MapPin, ChevronRight } from 'lucide-react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Welcome */}
      <div style={{
        background: 'var(--color-primary)',
        color: 'var(--color-secondary)',
        padding: '24px',
        borderRadius: 'var(--radius-xl)',
        marginBottom: '24px',
      }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Selamat datang,</p>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--color-secondary)' }}>
          {profile?.full_name || user.email}
        </h1>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <Link href="/orders" className="card" style={{ textAlign: 'center', padding: '16px', textDecoration: 'none' }}>
          <Package size={24} style={{ margin: '0 auto 8px', color: 'var(--color-text-secondary)' }} />
          <p style={{ fontSize: '12px', fontWeight: 600 }}>Pesanan</p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{totalOrders || 0}</p>
        </Link>
        <Link href="/profile" className="card" style={{ textAlign: 'center', padding: '16px', textDecoration: 'none' }}>
          <User size={24} style={{ margin: '0 auto 8px', color: 'var(--color-text-secondary)' }} />
          <p style={{ fontSize: '12px', fontWeight: 600 }}>Profil</p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Edit</p>
        </Link>
        <Link href="/profile" className="card" style={{ textAlign: 'center', padding: '16px', textDecoration: 'none' }}>
          <MapPin size={24} style={{ margin: '0 auto 8px', color: 'var(--color-text-secondary)' }} />
          <p style={{ fontSize: '12px', fontWeight: 600 }}>Alamat</p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Kelola</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div style={{ marginBottom: '24px' }}>
        <div className="section__header">
          <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Pesanan Terbaru</h2>
          <Link href="/orders" className="section__link">
            Semua <ChevronRight size={14} />
          </Link>
        </div>

        {recentOrders && recentOrders.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentOrders.map((order) => {
              const status = ORDER_STATUS[order.status] || { label: order.status, color: '#999' }
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="card"
                  style={{ padding: '16px', textDecoration: 'none', display: 'block' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>#{order.order_number}</span>
                    <span className="badge" style={{ background: `${status.color}20`, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {formatDate(order.created_at)}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>
                      {formatRupiah(order.total)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '40px 24px' }}>
            <Package size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: '12px' }} />
            <p className="empty-state__title">Belum ada pesanan</p>
            <Link href="/products" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
              Mulai Belanja
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
