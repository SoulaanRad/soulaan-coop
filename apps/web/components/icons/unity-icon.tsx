export function UnityIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Three figures in a circle (representing community) */}
      <circle cx="12" cy="8" r="2" className="stroke-current" />
      <circle cx="7" cy="14" r="2" className="stroke-current" />
      <circle cx="17" cy="14" r="2" className="stroke-current" />

      {/* Connecting lines */}
      <line x1="12" y1="10" x2="7" y2="12" className="stroke-current" />
      <line x1="12" y1="10" x2="17" y2="12" className="stroke-current" />

      {/* Laurel wreath elements (simplified) */}
      <path d="M5,18 Q12,20 19,18" fill="none" className="stroke-yellow-400" strokeWidth="1.5" />
    </svg>
  )
}
