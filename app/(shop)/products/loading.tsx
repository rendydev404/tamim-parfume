export default function ProductsLoading() {
  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Page header skeleton */}
      <div style={{ marginBottom: '24px' }}>
        <div className="skeleton" style={{ height: '28px', width: '200px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '14px', width: '120px' }} />
      </div>

      {/* Filter bar skeleton */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '36px', width: '80px', borderRadius: 'var(--radius-full)', flexShrink: 0 }} />
        ))}
      </div>

      {/* Product grid skeleton */}
      <div className="product-grid">
        {Array.from({ length: 6 }).map((_, i) => (
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
