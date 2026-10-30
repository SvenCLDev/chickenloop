'use client';

const FEATURE_TOOLTIP =
  'More Visibility - Featured jobs appear at the top of search results and are seeded multiple times into job listings';

function SparkleStar({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 1.2l1.35 3.55L13 6.1l-3.2 2.05.95 3.65L8 9.9l-2.75 1.9.95-3.65L3 6.1l3.65-1.35L8 1.2z" />
      <path
        d="M13.2 1.5l.45 1.15 1.15.45-1.15.45-.45 1.15-.45-1.15-1.15-.45 1.15-.45.45-1.15z"
        opacity="0.85"
      />
    </svg>
  );
}

export type FeatureJobButtonProps = {
  mode: 'feature' | 'extend';
  onClick: () => void;
  className?: string;
};

/**
 * Gold CTA for featuring / extending a job — visually distinct from standard dashboard buttons.
 */
export default function FeatureJobButton({
  mode,
  onClick,
  className = '',
}: FeatureJobButtonProps) {
  const isExtend = mode === 'extend';
  const label = isExtend ? 'Extend featured' : 'Feature · Top of search';

  const base =
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-1';

  const styles = isExtend
    ? 'border border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100 hover:border-amber-500'
    : 'border border-amber-500 bg-amber-400 text-amber-950 hover:bg-amber-500';

  return (
    <button
      type="button"
      onClick={onClick}
      title={FEATURE_TOOLTIP}
      aria-label={
        isExtend
          ? 'Extend featured period — featured jobs stay at the top of search'
          : 'Feature this job — appear at the top of search results'
      }
      className={`${base} ${styles} ${className}`.trim()}
    >
      <SparkleStar />
      <span>{label}</span>
    </button>
  );
}
