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

| Nama Database | Daftar Tabel |
|---|---|
| Tamim Parfume (Supabase/PostgreSQL) | `profiles`, `password_reset_otps`, `categories`, `products`, `product_images`, `product_variants`, `orders`, `order_items`, `order_coupons`, `addresses`, `coupons`, `promos`, `wishlist`, `reviews`, `chat_conversations`, `chat_messages`, `store_settings`, `hero_slides`, `returns` |
