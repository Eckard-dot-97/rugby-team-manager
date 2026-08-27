type BrandMarkProps = {
  subtitle?: string;
  size?: number;
};

/**
 * Shared "Team Sheet" logo mark — gold rugby ball + wordmark, used in the
 * topbar across all pages. Matches the design mockups (login, signup,
 * dashboard, household, coach dashboard).
 */
export default function BrandMark({ subtitle, size = 30 }: BrandMarkProps) {
  return (
    <span className="brand display brand-mark">
      <svg
        className="brand-mark-icon"
        width={size}
        height={size}
        viewBox="0 0 56 56"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="28" cy="28" r="28" fill="url(#brandGold)" />
        <defs>
          <linearGradient id="brandGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e8bd6e" />
            <stop offset="1" stopColor="#c68f34" />
          </linearGradient>
        </defs>
        <ellipse cx="28" cy="28" rx="17" ry="12" fill="#123023" />
        <line x1="15" y1="28" x2="41" y2="28" stroke="#e8bd6e" strokeWidth="2" />
        <line x1="20" y1="21" x2="20" y2="35" stroke="#e8bd6e" strokeWidth="1.6" />
        <line x1="28" y1="19" x2="28" y2="37" stroke="#e8bd6e" strokeWidth="1.6" />
        <line x1="36" y1="21" x2="36" y2="35" stroke="#e8bd6e" strokeWidth="1.6" />
      </svg>
      <span>
        Team Sheet
        {subtitle && <span className="brand-mark-subtitle"> — {subtitle}</span>}
      </span>
    </span>
  );
}
