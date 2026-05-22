// ============================================================
// TAMIM PARFUME — App Constants
// ============================================================

export const APP_NAME = 'TAMIM PARFUME'
export const APP_DESCRIPTION = 'Toko parfum premium dengan koleksi terlengkap dan harga terbaik'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Pagination
export const PRODUCTS_PER_PAGE = 12
export const ORDERS_PER_PAGE = 10

// Product categories
export const PRODUCT_CATEGORIES = [
  { id: 'men', name: 'Pria', slug: 'pria' },
  { id: 'women', name: 'Wanita', slug: 'wanita' },
  { id: 'unisex', name: 'Unisex', slug: 'unisex' },
  { id: 'arabian', name: 'Arabian', slug: 'arabian' },
  { id: 'designer', name: 'Designer', slug: 'designer' },
  { id: 'niche', name: 'Niche', slug: 'niche' },
] as const

// Sort options
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
  { value: 'popular', label: 'Terpopuler' },
  { value: 'name_asc', label: 'A - Z' },
] as const

// Order status labels & colors
export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Menunggu Pembayaran', color: '#f59e0b' },
  paid: { label: 'Dibayar', color: '#3b82f6' },
  processing: { label: 'Diproses', color: '#8b5cf6' },
  shipped: { label: 'Dikirim', color: '#06b6d4' },
  delivered: { label: 'Selesai', color: '#10b981' },
  cancelled: { label: 'Dibatalkan', color: '#ef4444' },
  refunded: { label: 'Dikembalikan (Refund)', color: '#6b7280' },
  return_requested: { label: 'Ajuan Retur', color: '#f97316' },
  return_approved: { label: 'Retur Disetujui', color: '#8b5cf6' },
  return_rejected: { label: 'Retur Ditolak', color: '#ef4444' },
  returned: { label: 'Barang Diretur', color: '#6b7280' },
}

// Shipping couriers
export const COURIERS = [
  { code: 'jne', name: 'JNE' },
  { code: 'pos', name: 'POS Indonesia' },
  { code: 'tiki', name: 'TIKI' },
] as const

// Store info (origin for shipping)
export const STORE_INFO = {
  name: 'TAMIM PARFUME',
  address: 'Jl. Achmad Adnawijaya No.5, RT.05/RW.11, Tegal Gundil',
  district: 'Bogor Utara',
  city: 'Bogor',
  province: 'Jawa Barat',
  postal_code: '16152',
  phone: '08129000123',
  lat: -6.5822558,
  lng: 106.813082,
} as const

// Image config
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
