import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="page-content">
        {children}
      </main>
      <MobileNav />
    </>
  )
}
