export default function UserLoading() {
  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Welcome card skeleton */}
      <div className="skeleton" style={{ 
        height: '100px', 
        borderRadius: 'var(--radius-xl)', 
        marginBottom: '24px' 
      }} />

      {/* Quick actions skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>

      {/* Recent orders skeleton */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div className="skeleton" style={{ height: '20px', width: '140px' }} />
          <div className="skeleton" style={{ height: '16px', width: '60px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
