// ============================================================
// TAMIM PARFUME — TypeScript Type Definitions
// ============================================================

export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  short_description: string | null
  price: number
  compare_price: number | null
  stock: number
  category_id: string | null
  category?: Category
  images: ProductImage[]
  weight: number // grams
  is_active: boolean
  is_featured: boolean
  sold_count: number
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt: string | null
  is_primary: boolean
  sort_order: number
}

export interface CartItem {
  id: string
  product_id: string
  product: Product
  quantity: number
  price: number
}

export interface Address {
  id: string
  user_id: string
  label: string
  recipient_name: string
  phone: string
  province_id: string
  province: string
  city_id: string
  city: string
  district: string
  postal_code: string
  full_address: string
  is_default: boolean
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface Order {
  id: string
  user_id: string
  order_number: string
  status: OrderStatus
  subtotal: number
  shipping_cost: number
  total: number
  shipping_address: Address
  shipping_courier: string
  shipping_service: string
  shipping_tracking: string | null
  payment_method: string | null
  payment_reference: string | null
  payment_url: string | null
  notes: string | null
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_image: string | null
  quantity: number
  price: number
  subtotal: number
}

// RajaOngkir Types
export interface Province {
  province_id: string
  province: string
}

export interface City {
  city_id: string
  province_id: string
  province: string
  type: string
  city_name: string
  postal_code: string
}

export interface ShippingCost {
  service: string
  description: string
  cost: { value: number; etd: string; note: string }[]
}

export interface ShippingOption {
  courier: string
  service: string
  description: string
  cost: number
  etd: string
}

// Payment Gateway Types
export interface PaymentTransaction {
  reference: string
  merchant_ref: string
  payment_selection_type: string
  payment_method: string
  payment_name: string
  customer_name: string
  customer_email: string
  customer_phone: string
  amount: number
  fee_customer: number
  fee_merchant: number
  total_fee: number
  amount_received: number
  checkout_url: string
  status: string
  expired_time: number
  qr_string?: string
  qr_url?: string
  instructions?: PaymentInstruction[]
}

export interface PaymentInstruction {
  title: string
  steps: string[]
}

export interface PaymentChannel {
  group: string
  code: string
  name: string
  type: string
  fee_merchant: { flat: number; percent: number }
  fee_customer: { flat: number; percent: number }
  total_fee: { flat: number; percent: number }
  minimum_fee: number | null
  maximum_fee: number | null
  icon_url: string
  active: boolean
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Admin Dashboard Stats
export interface DashboardStats {
  total_revenue: number
  total_orders: number
  total_products: number
  total_users: number
  recent_orders: Order[]
  revenue_chart: { date: string; revenue: number }[]
}

// Wishlist
export interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  product?: Product
  created_at: string
}

// Coupons
export type CouponType = 'percentage' | 'fixed'

export interface Coupon {
  id: string
  code: string
  description: string | null
  type: CouponType
  value: number
  min_purchase: number
  max_discount: number | null
  usage_limit: number | null
  used_count: number
  is_active: boolean
  starts_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderCoupon {
  id: string
  order_id: string
  coupon_id: string
  coupon_code: string
  discount_amount: number
}

// Product Variants
export interface ProductVariant {
  id: string
  product_id: string
  label: string
  price: number
  compare_price: number | null
  stock: number
  weight: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Chat
export type ConversationStatus = 'open' | 'closed'

export interface ChatConversation {
  id: string
  user_id: string
  subject: string | null
  status: ConversationStatus
  last_message_at: string
  created_at: string
  updated_at: string
  user?: Profile
  last_message?: ChatMessage
  unread_count?: number
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  is_read: boolean
  created_at: string
  sender?: Profile
}
