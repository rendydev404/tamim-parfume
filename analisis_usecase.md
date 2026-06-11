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

1. `profiles`
2. `password_reset_otps`
3. `categories`
4. `products`
5. `product_images`
6. `product_variants`
7. `orders`
8. `order_items`
9. `order_coupons`
10. `addresses`
11. `coupons`
12. `promos`
13. `wishlist`
14. `reviews`
15. `chat_conversations`
16. `chat_messages`
17. `store_settings`
18. `hero_slides`
19. `returns`
