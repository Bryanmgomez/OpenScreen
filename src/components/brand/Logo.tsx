interface LogoProps {
  size?: number
}

/** Logotipo provisional de OpenScreen (mismo diseño que resources/icons/logo.svg). */
export function Logo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="OpenScreen">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent-strong)" />
      <rect x="7" y="9" width="18" height="12" rx="2.5" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="16" cy="15" r="3" fill="var(--danger)" />
      <path d="M12 25h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
