export function PaymentIcon({ className = "w-6 h-6" }: { className?: string }) {
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
      {/* Card outline */}
      <rect x="3" y="5" width="18" height="14" rx="2" className="stroke-current" />

      {/* Card stripe */}
      <line x1="3" y1="10" x2="21" y2="10" className="stroke-current" />

      {/* Stylized laurel elements */}
      <path d="M7,15 Q10,16 13,15" fill="none" className="stroke-yellow-400" strokeWidth="1.5" />
      <path d="M11,15 Q14,16 17,15" fill="none" className="stroke-yellow-400" strokeWidth="1.5" />
    </svg>
  )
}
