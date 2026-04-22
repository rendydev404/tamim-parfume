import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'

function getMonthName(m: number) {
  return ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][m]
}

export async function GET() {
  const supabase = await createClient()
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  // Fetch data
  const { data: orders } = await supabase
    .from('orders')
    .select('total, status, created_at, shipping_cost, subtotal')
    .in('status', ['paid', 'processing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })

  const { data: allOrders } = await supabase
    .from('orders')
    .select('total, status, created_at')

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, product_name, quantity, price, subtotal')

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')

  // Calculations
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
  const totalOrders = orders?.length || 0
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const totalShipping = orders?.reduce((sum, o) => sum + (o.shipping_cost || 0), 0) || 0
  const netRevenue = totalRevenue - totalShipping

  const totalAllOrders = allOrders?.length || 0
  const paidOrders = allOrders?.filter(o => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status)).length || 0
  const cancelledOrders = allOrders?.filter(o => o.status === 'cancelled').length || 0
  const conversionRate = totalAllOrders > 0 ? Math.round((paidOrders / totalAllOrders) * 100) : 0

  // Status breakdown
  const statusBreakdown: Record<string, { count: number; revenue: number; label: string; color: string }> = {}
  orders?.forEach(o => {
    if (!statusBreakdown[o.status]) {
      const info = ORDER_STATUS[o.status] || { label: o.status, color: '#999' }
      statusBreakdown[o.status] = { count: 0, revenue: 0, label: info.label, color: info.color }
    }
    statusBreakdown[o.status].count++
    statusBreakdown[o.status].revenue += o.total
  })

  // Monthly data
  const monthlyData: { month: string; revenue: number; orders: number; avg: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const m = new Date(thisYear, thisMonth - i, 1)
    const month = m.getMonth()
    const year = m.getFullYear()
    const monthOrders = orders?.filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth() === month && d.getFullYear() === year
    }) || []
    const revenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    if (revenue > 0 || monthOrders.length > 0) {
      monthlyData.push({
        month: `${getMonthName(month)} ${year}`,
        revenue,
        orders: monthOrders.length,
        avg: monthOrders.length > 0 ? Math.round(revenue / monthOrders.length) : 0,
      })
    }
  }

  // Top products
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
  orderItems?.forEach(item => {
    const key = item.product_id
    if (!productSales[key]) productSales[key] = { name: item.product_name, qty: 0, revenue: 0 }
    productSales[key].qty += item.quantity
    productSales[key].revenue += item.subtotal
  })
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  const printDate = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const printTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  // Build status rows
  const statusRows = Object.entries(statusBreakdown).map(([, data]) => {
    const pct = totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0
    return `<tr>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${data.color};margin-right:6px"></span>${data.label}</td>
      <td style="text-align:center">${data.count}</td>
      <td style="text-align:right;font-weight:700">${formatRupiah(data.revenue)}</td>
      <td style="text-align:right">${pct}%</td>
      <td><div style="height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${data.color};border-radius:4px"></div></div></td>
    </tr>`
  }).join('')

  // Build monthly rows
  const maxMonthRev = Math.max(...monthlyData.map(d => d.revenue), 1)
  const monthlyRows = monthlyData.map(d => {
    const pct = (d.revenue / maxMonthRev) * 100
    return `<tr>
      <td style="font-weight:700">${d.month}</td>
      <td style="text-align:center">${d.orders}</td>
      <td style="text-align:right;color:#888">${formatRupiah(d.avg)}</td>
      <td style="text-align:right;font-weight:700">${formatRupiah(d.revenue)}</td>
      <td><div style="height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#3b82f6;border-radius:4px"></div></div></td>
    </tr>`
  }).join('')

  // Build product rows
  const maxProdRev = topProducts.length > 0 ? topProducts[0].revenue : 1
  const productRows = topProducts.map((p, i) => {
    const pct = (p.revenue / maxProdRev) * 100
    const bg = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#e5e5e5'
    const color = i < 3 ? '#fff' : '#888'
    return `<tr>
      <td><span style="display:inline-flex;width:18px;height:18px;border-radius:4px;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${color};background:${bg};flex-shrink:0">${i + 1}</span></td>
      <td>${p.name}</td>
      <td style="text-align:center">${p.qty}</td>
      <td style="text-align:right;font-weight:700">${formatRupiah(p.revenue)}</td>
      <td><div style="height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#ec4899;border-radius:4px"></div></div></td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Penjualan — TAMIM PARFUME</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a; font-size: 11px; line-height: 1.5;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media screen {
      body { background: #e5e5e5; }
      .page { max-width: 210mm; margin: 24px auto; background: #fff; padding: 20mm 16mm; box-shadow: 0 2px 20px rgba(0,0,0,0.12); border-radius: 4px; }
    }
    @media print {
      .no-print { display: none !important; }
      .page { padding: 0; }
    }
    h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; }
    .subtitle { font-size: 13px; color: #666; margin-top: 2px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2.5px solid #000; margin-bottom: 20px; }
    .meta { text-align: right; font-size: 10px; color: #666; }
    .section { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 22px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
    .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 8px; }
    .stat { border: 1.5px solid #e5e5e5; border-radius: 8px; padding: 12px 14px; text-align: center; }
    .stat .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
    .stat .val { font-size: 17px; font-weight: 800; }
    .stat .desc { font-size: 9px; color: #aaa; margin-top: 2px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
    .row.total { font-weight: 700; font-size: 13px; border-top: 2px solid #000; padding-top: 8px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th { background: #f5f5f5; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border-bottom: 1.5px solid #ddd; }
    td { padding: 7px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .total-row { background: #f5f5f5; }
    .total-row td { font-weight: 700; border-top: 1.5px solid #ddd; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 9px; color: #999; }
    .actions { position: fixed; bottom: 24px; right: 24px; display: flex; gap: 8px; z-index: 100; }
    .actions button { padding: 12px 24px; border-radius: 10px; border: none; font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .btn-pdf { background: #000; color: #fff; }
    .btn-pdf:hover { background: #222; }
    .btn-close { background: #fff; color: #333; border: 1px solid #ddd !important; }
    .btn-close:hover { background: #f5f5f5; }
  </style>
</head>
<body>

<div class="actions no-print">
  <button class="btn-close" onclick="window.close()">✕ Tutup</button>
  <button class="btn-pdf" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
</div>

<div class="page">
  <!-- HEADER -->
  <div class="header">
    <div>
      <h1>TAMIM PARFUME</h1>
      <div class="subtitle">Laporan Penjualan</div>
    </div>
    <div class="meta">
      <div>Dicetak: ${printDate}</div>
      <div>Pukul: ${printTime} WIB</div>
      <div style="margin-top:4px;font-weight:700;color:#000">Periode: Seluruh Data</div>
    </div>
  </div>

  <!-- RINGKASAN -->
  <div class="section">Ringkasan Penjualan</div>
  <div class="stats">
    <div class="stat">
      <div class="label">Total Pendapatan</div>
      <div class="val">${formatRupiah(totalRevenue)}</div>
    </div>
    <div class="stat">
      <div class="label">Total Pesanan</div>
      <div class="val">${totalOrders}</div>
      <div class="desc">${cancelledOrders} dibatalkan</div>
    </div>
    <div class="stat">
      <div class="label">Rata-rata Pesanan</div>
      <div class="val">${formatRupiah(avgOrderValue)}</div>
    </div>
    <div class="stat">
      <div class="label">Konversi</div>
      <div class="val">${conversionRate}%</div>
      <div class="desc">${paidOrders} / ${totalAllOrders}</div>
    </div>
  </div>

  <!-- RINCIAN KEUANGAN -->
  <div class="section">Rincian Keuangan</div>
  <div class="two-col">
    <div>
      <div class="row"><span>Subtotal Produk</span><span>${formatRupiah(netRevenue)}</span></div>
      <div class="row"><span>Total Ongkos Kirim</span><span>${formatRupiah(totalShipping)}</span></div>
      <div class="row total"><span>Total Pendapatan</span><span>${formatRupiah(totalRevenue)}</span></div>
      <div class="row" style="margin-top:4px"><span>Pendapatan Bersih (exc. ongkir)</span><span style="font-weight:700">${formatRupiah(netRevenue)}</span></div>
    </div>
    <div>
      <div class="row"><span>Total Pelanggan</span><span style="font-weight:700">${totalUsers || 0}</span></div>
      <div class="row"><span>Total Semua Pesanan</span><span style="font-weight:700">${totalAllOrders}</span></div>
      <div class="row"><span>Pesanan Berhasil</span><span style="font-weight:700">${paidOrders}</span></div>
      <div class="row"><span>Pesanan Dibatalkan</span><span style="font-weight:700">${cancelledOrders}</span></div>
    </div>
  </div>

  <!-- STATUS PESANAN -->
  <div class="section">Distribusi Status Pesanan</div>
  <table>
    <thead><tr>
      <th>Status</th><th style="text-align:center">Jumlah</th><th style="text-align:right">Pendapatan</th><th style="text-align:right">%</th><th style="width:120px">Grafik</th>
    </tr></thead>
    <tbody>${statusRows}</tbody>
  </table>

  <!-- PENDAPATAN BULANAN -->
  <div class="section">Pendapatan Bulanan</div>
  ${monthlyData.length > 0 ? `
  <table>
    <thead><tr>
      <th>Bulan</th><th style="text-align:center">Pesanan</th><th style="text-align:right">Rata-rata</th><th style="text-align:right">Pendapatan</th><th style="width:130px">Grafik</th>
    </tr></thead>
    <tbody>
      ${monthlyRows}
      <tr class="total-row">
        <td>TOTAL</td>
        <td style="text-align:center">${monthlyData.reduce((s, d) => s + d.orders, 0)}</td>
        <td style="text-align:right">${formatRupiah(avgOrderValue)}</td>
        <td style="text-align:right;font-size:12px">${formatRupiah(totalRevenue)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>` : '<p style="text-align:center;color:#999;padding:16px">Belum ada data</p>'}

  <!-- PRODUK TERLARIS -->
  <div class="section">Produk Terlaris</div>
  ${topProducts.length > 0 ? `
  <table>
    <thead><tr>
      <th style="width:30px">#</th><th>Nama Produk</th><th style="text-align:center">Terjual</th><th style="text-align:right">Pendapatan</th><th style="width:120px">Grafik</th>
    </tr></thead>
    <tbody>${productRows}</tbody>
  </table>` : '<p style="text-align:center;color:#999;padding:16px">Belum ada data</p>'}

  <!-- FOOTER -->
  <div class="footer">
    <span>TAMIM PARFUME — Laporan dicetak otomatis dari sistem</span>
    <span>${printDate}, ${printTime} WIB</span>
  </div>
</div>

<script>
  // Auto-trigger print after page loads
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 600);
  });
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
