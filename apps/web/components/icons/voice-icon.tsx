export function VoiceIcon({ className = "w-6 h-6" }: { className?: string }) {
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
      {/* Megaphone */}
      <path d="M3,11 L3,13 L6,13 L12,16 L12,8 L6,11 Z" className="stroke-current fill-slate-700" />
      <path d="M15.54,8.46 A5,5 0 0 1 15.54,15.54" className="stroke-current" />
      <path d="M18.07,5.93 A10,10 0 0 1 18.07,18.07" className="stroke-current" />

      {/* Sound waves with community colors */}
      <path d="M15.54,8.46 A5,5 0 0 1 15.54,15.54" className="stroke-blue-400" strokeWidth="1.5" />
      <path d="M18.07,5.93 A10,10 0 0 1 18.07,18.07" className="stroke-green-400" strokeWidth="1.5" />
    </svg>
  )
}
