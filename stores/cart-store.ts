// ============================================================
// TAMIM PARFUME — Cart Store (Zustand)
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string            // composite key: productId or productId_variantId
  product_id: string
  name: string
  price: number
  image: string | null
  quantity: number
  stock: number
  weight: number
  variant_id?: string
  variant_label?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  getTotalWeight: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id)
          if (existing) {
            const newQty = Math.min(
              existing.quantity + quantity,
              item.stock
            )
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: newQty } : i
              ),
            }
          }
          return {
            items: [...state.items, { ...item, quantity: Math.min(quantity, item.stock) }],
          }
        })
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }))
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getTotalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getTotalWeight: () =>
        get().items.reduce((sum, i) => sum + i.weight * i.quantity, 0),
    }),
    {
      name: 'tamim-cart', // localStorage key
    }
  )
)
