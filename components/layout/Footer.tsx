import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <h3 className="footer__title">TAMIM PARFUME</h3>
            <p className="footer__link" style={{ cursor: 'default' }}>
              Toko parfum premium dengan koleksi terlengkap dan harga terbaik.
            </p>
          </div>
          <div>
            <h4 className="footer__title">Kategori</h4>
            <Link href="/products?category=pria" className="footer__link">Parfum Pria</Link>
            <Link href="/products?category=wanita" className="footer__link">Parfum Wanita</Link>
            <Link href="/products?category=unisex" className="footer__link">Parfum Unisex</Link>
            <Link href="/products?category=arabian" className="footer__link">Parfum Arabian</Link>
          </div>
          <div>
            <h4 className="footer__title">Informasi</h4>
            <Link href="/about" className="footer__link">Tentang Kami</Link>
            <Link href="/hubungi-kami" className="footer__link">Hubungi Kami</Link>
            <Link href="/faq" className="footer__link">FAQ</Link>
            <Link href="/privacy" className="footer__link">Kebijakan Privasi</Link>
            <Link href="/terms" className="footer__link">Syarat & Ketentuan</Link>
            <Link href="/return-policy" className="footer__link">Kebijakan Pengembalian</Link>
          </div>
          <div>
            <h4 className="footer__title">Hubungi Kami</h4>
            <p className="footer__link" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={14} /> cs@tamimparfume.com
            </p>
            <p className="footer__link" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={14} /> +62 812-3456-7890
            </p>
            <p className="footer__link" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={14} /> Bogor, Indonesia
            </p>
          </div>
        </div>
        <div className="footer__bottom">
          © {new Date().getFullYear()} TAMIM PARFUME. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
