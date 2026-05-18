'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { formatRupiah } from '@/lib/utils'
import { generateOrderNumber, generateTrackingNumber } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MapPin, Truck, CreditCard, ChevronRight, Plus, Check, Search } from 'lucide-react'
import CouponInput from '@/components/checkout/CouponInput'
import toast from 'react-hot-toast'

interface CouponData {
  coupon_id: string
  code: string
  description: string
  type: string
  value: number
  discount_amount: number
}

interface SavedAddress {
  id: string
  label: string
  recipient_name: string
  phone: string
  province: string
  city: string
  district: string
  postal_code: string
  full_address: string
  is_default: boolean
}

interface CheckoutItem {
  id: string
  product_id?: string
  name: string
  price: number
  image: string | null
  quantity: number
  weight: number
  stock?: number
  variant_id?: string
  variant_label?: string
}

interface StreetSuggestion {
  display_name: string
  label: string
  short_label: string
  road: string
  house_number: string
  building: string
  neighbourhood: string
  village: string
  city: string
  postcode: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items: cartItems, getTotalPrice, getTotalWeight, clearCart } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1) // 1: address, 2: shipping, 3: payment
  const [loading, setLoading] = useState(false)

  // Buy now mode
  const buyNowId = searchParams.get('buy_now')
  const buyNowQty = parseInt(searchParams.get('qty') || '1')
  const buyNowVariantId = searchParams.get('variant_id')
  const [buyNowItem, setBuyNowItem] = useState<CheckoutItem | null>(null)
  const [buyNowLoading, setBuyNowLoading] = useState(!!buyNowId)
  const isBuyNow = !!buyNowId

  // Determine active items
  const items: CheckoutItem[] = isBuyNow && buyNowItem
    ? [{ ...buyNowItem }]
    : cartItems

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  // Address form
  const [address, setAddress] = useState({
    recipient_name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    postal_code: '',
    street_address: '',
    address_detail: '',
  })

  // Regional dropdown state (api.co.id for district/village)
  interface RegionItem { code: string; name: string }
  const [provinces, setProvinces] = useState<RegionItem[]>([])
  const [regencies, setRegencies] = useState<RegionItem[]>([])
  const [districts, setDistricts] = useState<RegionItem[]>([])
  const [villages, setVillages] = useState<RegionItem[]>([])
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedRegency, setSelectedRegency] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedVillage, setSelectedVillage] = useState('')
  const [regionLoading, setRegionLoading] = useState('')

  // Street autocomplete state
  const [streetSuggestions, setStreetSuggestions] = useState<StreetSuggestion[]>([])
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false)
  const [streetSearching, setStreetSearching] = useState(false)
  const streetDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const streetInputRef = useRef<HTMLDivElement>(null)

  // Shipping
  const [selectedShipping, setSelectedShipping] = useState<{
    courier: string; service: string; description?: string; cost: number; etd: string
  } | null>(null)
  const [shippingOptions, setShippingOptions] = useState<{
    courier: string; service: string; description?: string; cost: number; etd: string
  }[]>([])
  const [shippingLoading, setShippingLoading] = useState(false)
  const [destinationId, setDestinationId] = useState<number | null>(null)

  // Origin destination ID from RajaOngkir (Tegal Gundil, Bogor Utara, Kota Bogor)
  // Jl. Achmad Adnawijaya No.D2 No 5, RT.02/RW.11, Tegal Gundil, Kec. Bogor Utara, Kota Bogor, Jawa Barat 16152
  const ORIGIN_DESTINATION_ID = 8174
  const ORIGIN_VILLAGE_CODE = '76116' // Origin village code for fallback api.co.id

  // Payment
  const [selectedPayment, setSelectedPayment] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null)
  const [orderNotes, setOrderNotes] = useState('')

  // Dynamic payment channels from Tripay
  interface PaymentChannel {
    group: string
    code: string
    name: string
    type: string
    icon_url: string
    active: boolean
    fee_customer: { flat: number; percent: number }
  }
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(true)

  // Street search with debounce — filtered by selected region
  const searchStreet = useCallback((query: string) => {
    if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current)
    if (query.trim().length < 2) {
      setStreetSuggestions([])
      setShowStreetSuggestions(false)
      return
    }
    streetDebounceRef.current = setTimeout(async () => {
      setStreetSearching(true)
      try {
        // Get the selected region names for contextual filtering
        const villageName = villages.find(v => v.code === selectedVillage)?.name || ''
        const districtName = districts.find(d => d.code === selectedDistrict)?.name || ''
        const regencyName = regencies.find(r => r.code === selectedRegency)?.name || ''
        const provinceName = provinces.find(p => p.code === selectedProvince)?.name || ''

        const params = new URLSearchParams({
          q: query,
          village: villageName,
          district: districtName,
          city: regencyName,
          province: provinceName,
        })
        const res = await fetch(`/api/street-search?${params.toString()}`)
        const json = await res.json()
        setStreetSuggestions(json.data || [])
        setShowStreetSuggestions(true)
      } catch {
        setStreetSuggestions([])
      }
      setStreetSearching(false)
    }, 400)
  }, [villages, districts, regencies, provinces, selectedVillage, selectedDistrict, selectedRegency, selectedProvince])

  useEffect(() => {
    setMounted(true)
    loadSavedAddresses()
    if (buyNowId) loadBuyNowProduct()
    // Load provinces for address form (api.co.id for district/village)
    fetch('/api/regional?type=provinces')
      .then(r => r.json())
      .then(json => setProvinces(json.data || []))
      .catch(() => {})

    // Load payment channels from Tripay
    fetch('/api/payment/channels')
      .then(r => r.json())
      .then(json => {
        const channels = (json.data || []).filter((ch: PaymentChannel) => ch.active)
        setPaymentChannels(channels)
      })
      .catch(() => {})
      .finally(() => setChannelsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close street suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (streetInputRef.current && !streetInputRef.current.contains(e.target as Node)) {
        setShowStreetSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (mounted && !isBuyNow && cartItems.length === 0) {
      router.push('/cart')
    }
  }, [mounted, cartItems.length, router, isBuyNow])

  const loadBuyNowProduct = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('id, name, price, weight, images:product_images(url, is_primary)')
        .eq('id', buyNowId!)
        .single()

      if (data) {
        const imgs = (data.images as { url: string; is_primary: boolean }[]) || []
        const primaryImg = imgs.find(i => i.is_primary) || imgs[0]

        // Load variant info if variant_id is present
        let variantId: string | undefined
        let variantLabel: string | undefined
        let variantPrice = data.price
        let variantWeight = data.weight || 200

        if (buyNowVariantId) {
          const { data: variant } = await supabase
            .from('product_variants')
            .select('id, label, price, stock, weight')
            .eq('id', buyNowVariantId)
            .single()

          if (variant) {
            variantId = variant.id
            variantLabel = variant.label
            variantPrice = variant.price
            variantWeight = variant.weight || variantWeight
          }
        }

        setBuyNowItem({
          id: data.id,
          product_id: data.id,
          name: data.name,
          price: variantPrice,
          image: primaryImg?.url || null,
          quantity: buyNowQty,
          weight: variantWeight,
          variant_id: variantId,
          variant_label: variantLabel,
        })
      } else {
        toast.error('Produk tidak ditemukan')
        router.push('/')
      }
    } catch {
      toast.error('Gagal memuat produk')
      router.push('/')
    }
    setBuyNowLoading(false)
  }

  const loadSavedAddresses = async () => {
    try {
      const res = await fetch('/api/addresses')
      const json = await res.json()
      const addrs = json.data || []
      setSavedAddresses(addrs)
      // Auto-select default address
      const defaultAddr = addrs.find((a: SavedAddress) => a.is_default)
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id)
      } else if (addrs.length > 0) {
        setSelectedAddressId(addrs[0].id)
      }
    } catch { /* ignore */ }
    setAddressesLoading(false)
  }

  if (!mounted || buyNowLoading) return null
  if (!isBuyNow && cartItems.length === 0) return null
  if (isBuyNow && !buyNowItem) return null

  const subtotal = isBuyNow
    ? buyNowItem!.price * buyNowItem!.quantity
    : getTotalPrice()
  const shippingCost = selectedShipping?.cost || 0
  const discount = appliedCoupon?.discount_amount || 0
  const total = subtotal + shippingCost - discount

  // Get the active address (selected saved or manual)
  const getActiveAddress = () => {
    if (selectedAddressId && !showNewForm) {
      const saved = savedAddresses.find((a) => a.id === selectedAddressId)
      if (saved) return {
        recipient_name: saved.recipient_name,
        phone: saved.phone,
        province: saved.province,
        city: saved.city,
        district: saved.district,
        // postal_code stores village name for addresses saved via profile page
        village: saved.postal_code || '',
        postal_code: saved.postal_code || '',
        full_address: saved.full_address,
      }
    }
    // Concatenate street + detail for the manual form
    const fullAddress = address.address_detail
      ? `${address.street_address}, ${address.address_detail}`
      : address.street_address
    // Resolve village and district names from dropdown
    const villageName = villages.find(v => v.code === selectedVillage)?.name || ''
    const districtName = districts.find(d => d.code === selectedDistrict)?.name || address.district
    return { ...address, district: districtName, village: villageName, full_address: fullAddress }
  }

  // Regional data loading
  const loadProvinces = async () => {
    try {
      setRegionLoading('provinces')
      const res = await fetch('/api/regional?type=provinces')
      const json = await res.json()
      setProvinces(json.data || [])
    } catch { /* ignore */ }
    setRegionLoading('')
  }


  const loadRegencies = async (provinceCode: string) => {
    setRegencies([]); setDistricts([]); setVillages([])
    setSelectedRegency(''); setSelectedDistrict(''); setSelectedVillage('')
    try {
      setRegionLoading('regencies')
      const res = await fetch(`/api/regional?type=regencies&code=${provinceCode}`)
      const json = await res.json()
      setRegencies(json.data || [])
    } catch { /* ignore */ }
    setRegionLoading('')
  }

  const loadDistricts = async (regencyCode: string) => {
    setDistricts([]); setVillages([])
    setSelectedDistrict(''); setSelectedVillage('')
    try {
      setRegionLoading('districts')
      const res = await fetch(`/api/regional?type=districts&code=${regencyCode}`)
      const json = await res.json()
      setDistricts(json.data || [])
    } catch { /* ignore */ }
    setRegionLoading('')
  }

  const loadVillages = async (districtCode: string) => {
    setVillages([]); setSelectedVillage('')
    try {
      setRegionLoading('villages')
      const res = await fetch(`/api/regional?type=villages&code=${districtCode}`)
      const json = await res.json()
      setVillages(json.data || [])
    } catch { /* ignore */ }
    setRegionLoading('')
  }

  // Search Komerce destination ID from region name
  const searchDestinationId = async (keyword: string): Promise<number | null> => {
    try {
      const res = await fetch(`/api/shipping/destination?keyword=${encodeURIComponent(keyword)}`)
      const json = await res.json()
      if (json.data && json.data.length > 0) {
        return json.data[0].id
      }
    } catch { /* ignore */ }
    return null
  }

  // Fetch shipping costs - tries Komerce, then api.co.id, then smart calculation
  const loadShippingCosts = async (destId: number | null, villageCode?: string, provinceName?: string) => {
    setShippingLoading(true)
    setShippingOptions([])
    if (destId) setDestinationId(destId)
    const totalWeight = isBuyNow && buyNowItem
      ? buyNowItem.weight * buyNowItem.quantity
      : getTotalWeight()
    const itemValue = isBuyNow && buyNowItem
      ? buyNowItem.price * buyNowItem.quantity
      : getTotalPrice()

    const params = new URLSearchParams({ weight: (totalWeight || 1000).toString(), item_value: itemValue.toString() })
    if (destId) {
      params.set('origin', ORIGIN_DESTINATION_ID.toString())
      params.set('destination', destId.toString())
    }
    if (villageCode) {
      params.set('origin_village', ORIGIN_VILLAGE_CODE)
      params.set('destination_village', villageCode)
    }
    if (provinceName) {
      params.set('province', provinceName)
    }

    try {
      const res = await fetch(`/api/shipping-cost?${params.toString()}`)
      const json = await res.json()
      setShippingOptions(json.data || [])
    } catch {
      setShippingOptions([
        { courier: 'JNE', service: 'REG', description: 'Layanan Reguler', cost: 15000, etd: '2-3 hari' },
        { courier: 'JNE', service: 'YES', description: 'Yakin Esok Sampai', cost: 25000, etd: '1 hari' },
        { courier: 'TIKI', service: 'ECO', description: 'Economy Service', cost: 12000, etd: '3-4 hari' },
        { courier: 'TIKI', service: 'REG', description: 'Regular Service', cost: 16000, etd: '2-3 hari' },
        { courier: 'POS', service: 'Kilat Khusus', description: 'Pos Indonesia', cost: 18000, etd: '2-4 hari' },
      ])
    }
    setShippingLoading(false)
  }

  const handleSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    const provName = provinces.find(p => p.code === selectedProvince)?.name || address.province
    const regName = regencies.find(r => r.code === selectedRegency)?.name || address.city
    const distName = districts.find(d => d.code === selectedDistrict)?.name || address.district
    setAddress(prev => ({ ...prev, province: provName, city: regName, district: distName }))
    setShowStreetSuggestions(false)
    setStep(2)

    const searchKeyword = distName || regName
    const destId = await searchDestinationId(searchKeyword)
    loadShippingCosts(destId, selectedVillage, provName)
  }

  const handleSelectSavedAddress = async () => {
    if (!selectedAddressId) {
      toast.error('Pilih alamat pengiriman')
      return
    }
    setStep(2)
    setShippingLoading(true)

    const saved = savedAddresses.find(a => a.id === selectedAddressId)
    let destId = null
    if (saved) {
      const searchKeyword = saved.district || saved.city || ''
      destId = await searchDestinationId(searchKeyword)
    }
    loadShippingCosts(destId, saved?.postal_code, saved?.province)
  }

  const handleSelectShipping = (option: typeof selectedShipping) => {
    setSelectedShipping(option)
    setStep(3)
  }

  const handleCheckout = async () => {
    if (!selectedShipping || !selectedPayment) {
      toast.error('Lengkapi semua data checkout')
      return
    }

    const activeAddr = getActiveAddress()

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Silakan login terlebih dahulu')
        router.push('/login?redirect=/checkout')
        return
      }

      const orderNumber = generateOrderNumber()
      const trackingNumber = generateTrackingNumber(selectedShipping.courier)

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: 'pending_payment',
          subtotal,
          shipping_cost: shippingCost,
          discount: discount,
          total,
          recipient_name: activeAddr.recipient_name,
          recipient_phone: activeAddr.phone,
          shipping_address: activeAddr.full_address,
          shipping_province: activeAddr.province,
          shipping_city: activeAddr.city,
          shipping_district: activeAddr.district || null,
          shipping_village: activeAddr.village || null,
          shipping_postal_code: activeAddr.postal_code,
          shipping_courier: selectedShipping.courier,
          shipping_service: selectedShipping.service,
          shipping_tracking: trackingNumber,
          payment_method: selectedPayment,
          notes: orderNotes.trim() || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = items.map((item) => {
        const productId = item.product_id || item.id
        return {
          order_id: order.id,
          product_id: productId,
          product_name: item.name,
          product_image: item.image,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
          variant_id: item.variant_id || null,
          variant_label: item.variant_label || null,
        }
      })

      await supabase.from('order_items').insert(orderItems)

      // Deduct stock for each product (reserve stock at checkout)
      for (const item of items) {
        const productId = item.product_id || item.id
        const variantId = item.variant_id

        if (variantId) {
          // Deduct variant stock
          const { data: variant } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', variantId)
            .single()
          if (variant) {
            await supabase
              .from('product_variants')
              .update({ stock: Math.max(0, variant.stock - item.quantity) })
              .eq('id', variantId)
          }
        } else {
          // Deduct product stock
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', productId)
            .single()
          if (product) {
            await supabase
              .from('products')
              .update({ stock: Math.max(0, product.stock - item.quantity) })
              .eq('id', productId)
          }
        }
      }

      // Save coupon usage if applied
      if (appliedCoupon) {
        await supabase.from('order_coupons').insert({
          order_id: order.id,
          coupon_id: appliedCoupon.coupon_id,
          coupon_code: appliedCoupon.code,
          discount_amount: appliedCoupon.discount_amount,
        })
        // Increment used_count
        const { data: couponData } = await supabase.from('coupons').select('used_count').eq('id', appliedCoupon.coupon_id).single()
        if (couponData) {
          await supabase.from('coupons').update({ used_count: (couponData.used_count || 0) + 1 }).eq('id', appliedCoupon.coupon_id)
        }
      }

      // Initiate payment via API
      let paymentReference = ''
      try {
        const paymentRes = await fetch('/api/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            orderNumber,
            method: selectedPayment,
            amount: total,
            customerName: activeAddr.recipient_name,
            customerEmail: user.email,
            customerPhone: activeAddr.phone,
            items: items.map((item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          }),
        })

        if (paymentRes.ok) {
          const payment = await paymentRes.json()
          if (payment.data?.reference) {
            paymentReference = payment.data.reference
            await supabase
              .from('orders')
              .update({
                payment_reference: payment.data.reference,
                payment_url: payment.data.checkout_url,
              })
              .eq('id', order.id)
          }
        }
      } catch {
        // Payment gateway might not be configured, continue anyway
      }

      if (!isBuyNow) clearCart()
      toast.success('Pesanan berhasil dibuat!')

      // Redirect to custom payment page if reference is available
      if (paymentReference) {
        router.push(`/payment/${paymentReference}`)
      } else {
        router.push(`/orders/${order.id}`)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Gagal membuat pesanan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // Shipping options are now loaded from API (see shippingOptions state)
  // Payment channels are loaded dynamically from Tripay (see paymentChannels state)

  return (
    <>
<main className="page-content">
        <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px', maxWidth: '720px' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Checkout</h1>

          {/* Steps indicator */}
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '24px',
            fontSize: '13px',
          }}>
            {['Alamat', 'Pengiriman', 'Pembayaran'].map((label, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px',
                  background: step > i ? 'var(--color-primary)' : step === i + 1 ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                  color: step >= i + 1 ? 'var(--color-secondary)' : 'var(--color-text-muted)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: step === i + 1 ? 600 : 400,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Step 1: Address */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <MapPin size={20} />
                <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Alamat Pengiriman</h2>
              </div>

              {/* Saved Addresses */}
              {addressesLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : savedAddresses.length > 0 && !showNewForm ? (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className="card"
                        style={{
                          padding: '16px', textAlign: 'left', cursor: 'pointer', width: '100%',
                          border: selectedAddressId === addr.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          background: selectedAddressId === addr.id ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
                          fontFamily: 'inherit', display: 'block', position: 'relative',
                        }}
                      >
                        {selectedAddressId === addr.id && (
                          <span style={{
                            position: 'absolute', top: '12px', right: '12px',
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: 'var(--color-primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={14} />
                          </span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600,
                            background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                          }}>{addr.label}</span>
                          {addr.is_default && (
                            <span style={{
                              padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600,
                              background: 'var(--color-primary)', color: '#fff',
                            }}>Utama</span>
                          )}
                        </div>
                        <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{addr.recipient_name}</p>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{addr.phone}</p>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                          {addr.full_address}, {addr.district && `${addr.district}, `}{addr.city}, {addr.province}{addr.postal_code && ` ${addr.postal_code}`}
                        </p>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowNewForm(true)}
                    style={{
                      width: '100%', padding: '12px', border: '1px dashed var(--color-border)',
                      borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Plus size={16} /> Gunakan Alamat Baru
                  </button>

                  <button className="btn btn-primary btn-full btn-lg" onClick={handleSelectSavedAddress}>
                    Pilih Pengiriman <ChevronRight size={18} />
                  </button>
                </div>
              ) : (
                /* Manual address form (for new or when no saved addresses) */
                <form onSubmit={handleSubmitAddress} className="card" style={{ padding: '24px' }}>
                  {savedAddresses.length > 0 && (
                    <button type="button" onClick={() => setShowNewForm(false)}
                      style={{ fontSize: '13px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px', fontFamily: 'inherit' }}>
                      ← Kembali ke alamat tersimpan
                    </button>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="input-group">
                      <label className="input-label">Nama Penerima</label>
                      <input className="input" required value={address.recipient_name}
                        onChange={(e) => setAddress({...address, recipient_name: e.target.value})}
                        placeholder="Nama lengkap penerima" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">No. Telepon</label>
                      <input className="input" required value={address.phone}
                        onChange={(e) => setAddress({...address, phone: e.target.value})}
                        placeholder="08xx-xxxx-xxxx" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="input-group">
                        <label className="input-label">Provinsi</label>
                        <select className="input" required value={selectedProvince}
                          onChange={(e) => {
                            setSelectedProvince(e.target.value)
                            if (e.target.value) loadRegencies(e.target.value)
                          }}
                          disabled={regionLoading === 'provinces'}
                        >
                          <option value="">{regionLoading === 'provinces' ? 'Memuat...' : 'Pilih Provinsi'}</option>
                          {provinces.map((p) => (
                            <option key={p.code} value={p.code}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Kota/Kabupaten</label>
                        <select className="input" required value={selectedRegency}
                          onChange={(e) => {
                            setSelectedRegency(e.target.value)
                            if (e.target.value) loadDistricts(e.target.value)
                          }}
                          disabled={!selectedProvince || regionLoading === 'regencies'}
                        >
                          <option value="">{regionLoading === 'regencies' ? 'Memuat...' : 'Pilih Kota'}</option>
                          {regencies.map((r) => (
                            <option key={r.code} value={r.code}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="input-group">
                        <label className="input-label">Kecamatan</label>
                        <select className="input" required value={selectedDistrict}
                          onChange={(e) => {
                            setSelectedDistrict(e.target.value)
                            if (e.target.value) loadVillages(e.target.value)
                          }}
                          disabled={!selectedRegency || regionLoading === 'districts'}
                        >
                          <option value="">{regionLoading === 'districts' ? 'Memuat...' : 'Pilih Kecamatan'}</option>
                          {districts.map((d) => (
                            <option key={d.code} value={d.code}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Kelurahan/Desa</label>
                        <select className="input" required value={selectedVillage}
                          onChange={(e) => setSelectedVillage(e.target.value)}
                          disabled={!selectedDistrict || regionLoading === 'villages'}
                        >
                          <option value="">{regionLoading === 'villages' ? 'Memuat...' : 'Pilih Kelurahan'}</option>
                          {villages.map((v) => (
                            <option key={v.code} value={v.code}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="input-group" ref={streetInputRef} style={{ position: 'relative' }}>
                      <label className="input-label">Nama Jalan, Gedung & No. Rumah</label>
                      {!selectedVillage && (
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0 0 4px 0' }}>Pilih kelurahan/desa terlebih dahulu untuk pencarian jalan</p>
                      )}
                      <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                          color: 'var(--color-text-muted)', pointerEvents: 'none',
                        }} />
                        <input
                          className="input"
                          required
                          value={address.street_address}
                          onChange={(e) => {
                            setAddress({...address, street_address: e.target.value})
                            if (selectedVillage) searchStreet(e.target.value)
                          }}
                          onFocus={() => {
                            if (streetSuggestions.length > 0) setShowStreetSuggestions(true)
                          }}
                          placeholder={selectedVillage ? 'Cari nama jalan, gedung, atau ketik manual...' : 'Pilih kelurahan/desa dulu...'}
                          autoComplete="off"
                          style={{ paddingLeft: '36px', opacity: !selectedVillage ? 0.6 : 1 }}
                        />
                        {streetSearching && (
                          <Loader2 size={16} className="animate-spin" style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--color-text-muted)',
                          }} />
                        )}
                      </div>
                      {/* Suggestions dropdown */}
                      {showStreetSuggestions && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          maxHeight: '240px', overflowY: 'auto', marginTop: '4px',
                        }}>
                          {streetSuggestions.length > 0 ? streetSuggestions.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setAddress({...address, street_address: s.short_label || s.label})
                                setShowStreetSuggestions(false)
                              }}
                              style={{
                                width: '100%', textAlign: 'left', padding: '10px 14px',
                                border: 'none', borderBottom: i < streetSuggestions.length - 1 ? '1px solid var(--color-border-light, var(--color-border))' : 'none',
                                background: 'transparent', cursor: 'pointer', fontSize: '13px',
                                fontFamily: 'inherit', lineHeight: 1.4,
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <MapPin size={14} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
                                <span>
                                  <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                    {s.short_label || s.label.split(',')[0]}
                                  </span>
                                  <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                                    {s.label}
                                  </span>
                                </span>
                              </span>
                            </button>
                          )) : !streetSearching && address.street_address.trim().length >= 2 ? (
                            <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                              <p style={{ margin: '0 0 4px 0' }}>Nama jalan ini belum terdaftar di database peta.</p>
                              <p style={{ margin: '0 0 6px 0', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                Silakan ketik manual nama jalan Anda.
                              </p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                Contoh: Jl. Coneang RT 01/02 No. 15
                              </p>
                            </div>
                          ) : streetSearching ? (
                            <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                              <p style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Loader2 size={14} className="animate-spin" /> Mencari dari beberapa sumber data...
                              </p>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <div className="input-group">
                      <label className="input-label">Detail Alamat <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opsional)</span></label>
                      <input
                        className="input"
                        value={address.address_detail}
                        onChange={(e) => setAddress({...address, address_detail: e.target.value})}
                        placeholder="Lantai, blok, patokan, RT/RW, dll."
                      />
                    </div>

                  </div>

                  <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '20px' }}>
                    Pilih Pengiriman <ChevronRight size={18} />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Truck size={20} />
                <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Pilih Pengiriman</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shippingLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                    <Loader2 size={28} className="animate-spin" />
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Menghitung ongkos kirim dari JNE, TIKI, POS...</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', opacity: 0.7 }}>Powered by RajaOngkir</p>
                  </div>
                ) : shippingOptions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    Tidak ada opsi pengiriman tersedia
                  </div>
                ) : (
                  (() => {
                    const grouped: Record<string, typeof shippingOptions> = {}
                    for (const opt of shippingOptions) {
                      if (!grouped[opt.courier]) grouped[opt.courier] = []
                      grouped[opt.courier].push(opt)
                    }
                    // Brand colors for each courier
                    const courierColors: Record<string, string> = {
                      JNE: '#e11d48', TIKI: '#2563eb', POS: '#f59e0b', JNT: '#e11d48',
                      SICEPAT: '#ea580c', ANTERAJA: '#16a34a', NINJA: '#dc2626',
                      LION: '#ef4444', IDEXPRESS: '#7c3aed',
                    }
                    return Object.entries(grouped).map(([courier, opts]) => (
                      <div key={courier} style={{ marginBottom: '8px' }}>
                        <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: courierColors[courier] || '#6b7280' }}>
                          {courier} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '11px' }}>— {opts.length} layanan</span>
                        </p>
                        {opts.map((opt, i) => (
                          <button key={`${courier}-${i}`} onClick={() => handleSelectShipping(opt)}
                            className="card"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '6px' }}
                          >
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{opt.service}</p>
                              {opt.description && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{opt.description}</p>}
                              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Estimasi: {opt.etd}</p>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap', color: 'var(--color-primary)' }}>{formatRupiah(opt.cost)}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  })()
                )}
              </div>

              <button className="btn btn-secondary btn-full" style={{ marginTop: '16px' }} onClick={() => setStep(1)}>
                Kembali
              </button>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div>
              <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <CreditCard size={20} />
                  <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Metode Pembayaran</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {channelsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  ) : paymentChannels.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px', fontSize: '14px' }}>
                      Tidak ada metode pembayaran tersedia
                    </p>
                  ) : (
                    paymentChannels.map((channel) => (
                      <button
                        key={channel.code}
                        onClick={() => setSelectedPayment(channel.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px 16px',
                          border: selectedPayment === channel.code
                            ? '2px solid var(--color-primary)'
                            : '1.5px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          background: selectedPayment === channel.code
                            ? 'var(--color-bg-secondary)'
                            : 'var(--color-bg)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                          width: '100%',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <img
                          src={channel.icon_url}
                          alt={channel.name}
                          style={{ width: '36px', height: '24px', objectFit: 'contain' }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 500, fontSize: '14px', display: 'block' }}>{channel.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{channel.group}</span>
                        </div>
                        {selectedPayment === channel.code && (
                          <span style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: 'var(--color-primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Order Notes */}
              <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                  <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Catatan Pesanan</h2>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>(opsional)</span>
                </div>
                <textarea
                  className="input"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Contoh: Parfum untuk hadiah, tolong bungkus rapi. Atau: Kirim sore hari saja."
                  style={{ minHeight: '80px', resize: 'vertical', fontSize: '14px' }}
                  maxLength={500}
                />
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', textAlign: 'right' }}>
                  {orderNotes.length}/500
                </p>
              </div>

              {/* Order summary */}
              <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
                  Ringkasan Pesanan
                </h3>

                {items.map((item) => {
                  const variantLabel = item.variant_label ? ` (${item.variant_label})` : ''
                  return (
                    <div key={item.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                      marginBottom: '8px',
                    }}>
                      <span className="text-secondary">{item.name}{variantLabel} × {item.quantity}</span>
                      <span>{formatRupiah(item.price * item.quantity)}</span>
                    </div>
                  )
                })}

                {/* Coupon */}
                <div style={{ borderTop: '1px solid var(--color-border-light)', marginTop: '12px', paddingTop: '12px' }}>
                  <CouponInput
                    subtotal={subtotal}
                    appliedCoupon={appliedCoupon}
                    onApply={(coupon) => setAppliedCoupon(coupon)}
                    onRemove={() => setAppliedCoupon(null)}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--color-border-light)', marginTop: '12px', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                    <span className="text-secondary">Subtotal</span>
                    <span>{formatRupiah(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                    <span className="text-secondary">Ongkos Kirim ({selectedShipping?.courier} {selectedShipping?.service})</span>
                    <span>{formatRupiah(shippingCost)}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px', color: 'var(--color-success)' }}>
                      <span>Diskon ({appliedCoupon?.code})</span>
                      <span>- {formatRupiah(discount)}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '18px',
                    fontWeight: 700,
                    borderTop: '1px solid var(--color-border-light)',
                    paddingTop: '12px',
                    marginTop: '8px',
                  }}>
                    <span>Total</span>
                    <span>{formatRupiah(total)}</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary btn-full btn-lg"
                onClick={handleCheckout}
                disabled={!selectedPayment || loading}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                ) : (
                  `Bayar ${formatRupiah(total)}`
                )}
              </button>

              <button className="btn btn-secondary btn-full" style={{ marginTop: '8px' }} onClick={() => setStep(2)}>
                Kembali
              </button>
            </div>
          )}
        </div>
      </main>
</>
  )
}
