/** The icon set from design/prototype.html. No icon font, no emoji. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const Back = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path d="M15 5l-7 7 7 7" {...stroke} strokeWidth={2.2} />
  </svg>
);

export const Close = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" {...stroke} strokeWidth={2.2} />
  </svg>
);

export const Plus = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
    <path d="M12 5v14M5 12h14" {...stroke} strokeWidth={2.6} />
  </svg>
);

export const Send = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path d="M12 19V6M6 12l6-6 6 6" {...stroke} strokeWidth={2.4} />
  </svg>
);

export const Mic = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
    <rect x="9" y="3" width="6" height="11" rx="3" {...stroke} strokeWidth={2} />
    <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" {...stroke} strokeWidth={2} />
  </svg>
);

export const Check = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7" {...stroke} strokeWidth={2.6} />
  </svg>
);

export const ChevronDown = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
    <path d="M6 9l6 6 6-6" {...stroke} strokeWidth={2.6} />
  </svg>
);

export const Doc = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
    <path d="M6 3h8l4 4v14H6z" {...stroke} strokeWidth={2} />
    <path d="M9 12h6M9 16h4" {...stroke} strokeWidth={2} />
  </svg>
);

/* ---- tab bar ---- */

export const TabNew = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="9" {...stroke} strokeWidth={2} />
    <path d="M12 8v8M8 12h8" {...stroke} strokeWidth={2.2} />
  </svg>
);

export const TabClasses = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <rect x="3" y="4.5" width="18" height="15" rx="3" {...stroke} strokeWidth={2} />
    <path d="M3 9.5h18M8 4.5v15" {...stroke} strokeWidth={2} />
  </svg>
);

export const TabMoves = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="4.6" r="2.2" {...stroke} strokeWidth={2} />
    <path
      d="M6.5 10.2l5.5-1.2 5.5 1.2M12 9v5.6m0 0l-3 6.4m3-6.4l3 6.4"
      {...stroke}
      strokeWidth={2}
    />
  </svg>
);

export const TabAsk = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M20.5 12a8.5 8.5 0 11-3.6-6.9" {...stroke} strokeWidth={2} />
    <path
      d="M9.6 9.2a2.5 2.5 0 013.9-1.6c1.3.9 1 2.4-.2 3.2-.8.5-1.3 1-1.3 2M12 16.6v.7"
      {...stroke}
      strokeWidth={2}
    />
  </svg>
);
