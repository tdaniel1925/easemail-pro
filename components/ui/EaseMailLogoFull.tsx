export default function EaseMailLogoFull({ className = "h-12" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Envelope Icon */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto scale-125 -rotate-45"
      >
        {/* Email envelope */}
        <rect
          x="15"
          y="30"
          width="70"
          height="45"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />

        {/* Envelope flap */}
        <path
          d="M 15 30 L 50 55 L 85 30"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {/* EaseMail Text */}
      <span className="text-2xl font-bold text-foreground whitespace-nowrap">
        EaseMail
      </span>
    </div>
  );
}
