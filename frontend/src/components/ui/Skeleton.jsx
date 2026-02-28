export function Skeleton({ width, height = 16, radius = 6, style = {} }) {
  return (
    <div className="skeleton" style={{ width: width || '100%', height, borderRadius: radius, ...style }} />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card skeleton-card">
      <Skeleton width="40%" height={14} style={{ marginBottom: 16 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={12} style={{ marginBottom: 10 }} />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Skeleton width={80} height={12} />
        <Skeleton width={38} height={38} radius={8} />
      </div>
      <Skeleton width={120} height={24} style={{ marginBottom: 6 }} />
      <Skeleton width={60} height={10} />
    </div>
  );
}

export function SkeletonTxItem() {
  return (
    <div className="tx-item">
      <Skeleton width={38} height={38} radius={8} />
      <div style={{ flex: 1 }}>
        <Skeleton width="70%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={10} />
      </div>
      <Skeleton width={80} height={16} />
    </div>
  );
}

export function SkeletonTableRow({ cols = 6 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><Skeleton width={i === 0 ? '80%' : '60%'} height={14} /></td>
      ))}
    </tr>
  );
}
