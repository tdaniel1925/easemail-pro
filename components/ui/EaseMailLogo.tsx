export default function EaseMailLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Email envelope background */}
      <rect
        x="10"
        y="25"
        width="80"
        height="50"
        rx="6"
        fill="url(#gradient)"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Email flap (creates the M shape) */}
      <path
        d="M 10 25 L 50 55 L 90 25"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Inner M lines for depth */}
      <path
        d="M 20 35 L 50 55 L 80 35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />
      
      {/* Gradient definition */}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

