export function CloudPenLogo({
  className,
  title = '云笔',
}: {
  className?: string
  title?: string
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <title>{title}</title>
      <path
        d="M8.2 12.6c-.3-.55-.45-1.15-.45-1.82 0-2.08 1.76-3.78 3.95-3.78.78 0 1.52.22 2.16.6.62-1.2 1.9-2 3.4-2 2.14 0 3.87 1.63 3.87 3.64 0 1.95-1.64 3.53-3.7 3.63H9.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.3 19.3 16.9 11.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M15.9 12.7l1.3 1.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M7.6 21.2l1.9-.55.55-1.9-2.45 2.45Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  )
}

