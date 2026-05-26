export default function ShopLoading() {
  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Hero skeleton */}
      <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-xl)', marginBottom: '24px' }} />

      {/* Section title skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="skeleton" style={{ width: '160px', height: '24px' }} />
        <div className="skeleton" style={{ width: '80px', height: '16px' }} />
      </div>

      {/* Product grid skeleton */}
      <div className="product-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ overflow: 'hidden' }}>
            <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--radius-lg)' }} />
            <div style={{ padding: '12px 0' }}>
              <div className="skeleton" style={{ height: '12px', width: '60%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '14px', width: '80%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '16px', width: '50%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
