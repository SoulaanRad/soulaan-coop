export function CommunityInvestmentIcon({ className = "w-6 h-6" }: { className?: string }) {
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
      {/* Building/store */}
      <rect x="4" y="8" width="16" height="12" rx="1" className="stroke-current" />
      <path d="M4,8 L12,4 L20,8" className="stroke-current" />

      {/* Dollar sign in center */}
      <path d="M12,10 L12,16 M10,12 L14,12 M10,14 L14,14" className="stroke-green-400" strokeWidth="2" />

      {/* Community dots around */}
      <circle cx="7" cy="15" r="1" className="fill-blue-400 stroke-none" />
      <circle cx="17" cy="15" r="1" className="fill-blue-400 stroke-none" />
      <circle cx="12" cy="18" r="1" className="fill-blue-400 stroke-none" />
    </svg>
  )
}
