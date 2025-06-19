export function SCIcon({ className = "w-6 h-6" }: { className?: string }) {
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
      {/* Voting ballot box */}
      <rect x="3" y="4" width="18" height="16" rx="2" className="stroke-current" />
      <line x1="3" y1="9" x2="21" y2="9" className="stroke-current" />

      {/* Ballot/vote symbol */}
      <path d="M8,13 L10,15 L16,11" fill="none" className="stroke-blue-400" strokeWidth="2.5" />

      {/* Coin elements */}
      <circle cx="18" cy="6" r="2" className="fill-blue-400 stroke-none" />
      <text x="18" y="7" textAnchor="middle" className="fill-white text-xs font-bold">
        S
      </text>
    </svg>
  )
}
