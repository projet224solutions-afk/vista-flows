/**
 * SKELETON ULTRA-OPTIMISÉ
 * CSS inline pour éviter parsing Tailwind et affichage instantané
 */

import { memo } from 'react';

// Animation shimmer en CSS pure
const shimmerStyle = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

// Style de base pour les éléments skeleton
const baseSkeletonStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, hsl(210 40% 96.1%) 25%, hsl(210 40% 90%) 50%, hsl(210 40% 96.1%) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite linear',
  borderRadius: '8px',
};

// Injecter les keyframes une seule fois
if (typeof document !== 'undefined') {
  const styleId = 'instant-skeleton-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerStyle;
    document.head.appendChild(style);
  }
}

/**
 * Skeleton pour le Dashboard Vendeur (4 cartes stats + contenu)
 */
export const VendorDashboardSkeleton = memo(() => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '24px', 
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto'
  }}>
    {/* Header skeleton */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ ...baseSkeletonStyle, width: '200px', height: '32px' }} />
      <div style={{ ...baseSkeletonStyle, width: '120px', height: '40px' }} />
    </div>

    {/* Stats cards skeleton - 4 cartes */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '16px' 
    }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          ...baseSkeletonStyle,
          height: '120px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ ...baseSkeletonStyle, width: '60%', height: '16px', background: 'rgba(255,255,255,0.3)' }} />
          <div style={{ ...baseSkeletonStyle, width: '40%', height: '28px', background: 'rgba(255,255,255,0.3)' }} />
        </div>
      ))}
    </div>

    {/* Content grid skeleton */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
      gap: '24px' 
    }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          ...baseSkeletonStyle,
          height: '280px',
        }} />
      ))}
    </div>
  </div>
));

VendorDashboardSkeleton.displayName = 'VendorDashboardSkeleton';

/**
 * Skeleton générique pour une carte
 */
export const CardSkeleton = memo(({ height = 200 }: { height?: number }) => (
  <div style={{
    ...baseSkeletonStyle,
    height: `${height}px`,
    width: '100%',
  }} />
));

CardSkeleton.displayName = 'CardSkeleton';

/**
 * Skeleton pour une liste d'éléments
 */
export const ListSkeleton = memo(({ count = 5 }: { count?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{
        ...baseSkeletonStyle,
        height: '60px',
      }} />
    ))}
  </div>
));

ListSkeleton.displayName = 'ListSkeleton';

/**
 * Skeleton pour le header de page
 */
export const PageHeaderSkeleton = memo(() => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: '24px'
  }}>
    <div>
      <div style={{ ...baseSkeletonStyle, width: '250px', height: '32px', marginBottom: '8px' }} />
      <div style={{ ...baseSkeletonStyle, width: '180px', height: '18px' }} />
    </div>
    <div style={{ ...baseSkeletonStyle, width: '140px', height: '40px' }} />
  </div>
));

PageHeaderSkeleton.displayName = 'PageHeaderSkeleton';

/**
 * Skeleton pour les stats inline
 */
export const StatsSkeleton = memo(() => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(4, 1fr)', 
    gap: '16px',
    marginBottom: '24px'
  }}>
    {[1, 2, 3, 4].map(i => (
      <div key={i} style={{
        ...baseSkeletonStyle,
        height: '100px',
      }} />
    ))}
  </div>
));

StatsSkeleton.displayName = 'StatsSkeleton';

export default VendorDashboardSkeleton;
