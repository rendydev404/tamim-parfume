# Use Case & Database Tamim Parfume

## Diagram Use Case

```mermaid
flowchart LR
    Pelanggan((Pelanggan))
    Admin((Admin))

    subgraph Sistem[Sistem E-commerce Tamim Parfume]
        UC1([Lihat & cari produk])
        UC2([Kelola akun & alamat])
        UC3([Keranjang & wishlist])
        UC4([Checkout & bayar])
        UC5([Pesanan & retur])
        UC6([Ulasan & chat])

        UC7([Kelola produk])
        UC8([Kelola pesanan])
        UC9([Kelola retur])
        UC10([Promo & kupon])
        UC11([Kelola user & chat])
        UC12([Atur toko])
    end

    Pelanggan --> UC1
    Pelanggan --> UC2
    Pelanggan --> UC3
    Pelanggan --> UC4
    Pelanggan --> UC5
    Pelanggan --> UC6

    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12

    UC4 -.->|integrasi| Midtrans([Midtrans])
    UC5 -.->|integrasi| Biteship([Biteship/RajaOngkir])
    UC6 -.->|integrasi| Telegram([Telegram])
```

## Daftar Tabel Database

Sistem ini menggunakan database **Supabase (PostgreSQL)** dengan rincian Primary Key (PK) dan Foreign Key (FK) sebagai berikut:

| Nama Tabel | Primary Key (PK) | Foreign Key (FK) |
|---|---|---|
| `profiles` | `id` | - |
| `password_reset_otps` | `id` | `user_id` -> `profiles.id` |
| `categories` | `id` | - |
| `products` | `id` | `category_id` -> `categories.id` |
| `product_images` | `id` | `product_id` -> `products.id` |
| `product_variants` | `id` | `product_id` -> `products.id` |
| `addresses` | `id` | `user_id` -> `profiles.id` |
| `coupons` | `id` | - |
| `promos` | `id` | - |
| `orders` | `id` | `user_id` -> `profiles.id`<br>`address_id` -> `addresses.id` |
| `order_items` | `id` | `order_id` -> `orders.id`<br>`product_id` -> `products.id`<br>`variant_id` -> `product_variants.id` |
| `order_coupons` | `id` | `order_id` -> `orders.id`<br>`coupon_id` -> `coupons.id` |
| `wishlist` | `id` | `user_id` -> `profiles.id`<br>`product_id` -> `products.id` |
| `reviews` | `id` | `user_id` -> `profiles.id`<br>`product_id` -> `products.id`<br>`order_item_id` -> `order_items.id` |
| `chat_conversations` | `id` | `user_id` -> `profiles.id` |
| `chat_messages` | `id` | `conversation_id` -> `chat_conversations.id` |
| `store_settings` | `id` | - |
| `hero_slides` | `id` | - |
| `returns` | `id` | `order_id` -> `orders.id`<br>`user_id` -> `profiles.id` |
