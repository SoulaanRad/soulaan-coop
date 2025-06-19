export function GovernanceIcon({ className = "w-6 h-6" }: { className?: string }) {
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
      {/* Shield outline */}
      <path d="M12,3 L20,7 C20,12 17,17 12,21 C7,17 4,12 4,7 L12,3" className="stroke-current fill-none" />

      {/* Stylized sword (vertical line with crossguard) */}
      <line x1="12" y1="8" x2="12" y2="16" className="stroke-yellow-400" strokeWidth="2" />
      <line x1="9" y1="10" x2="15" y2="10" className="stroke-yellow-400" strokeWidth="2" />

      {/* Base of sword */}
      <circle cx="12" cy="17" r="1" className="fill-yellow-400 stroke-none" />
    </svg>
  )
}
