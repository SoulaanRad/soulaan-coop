export function WealthIcon({ className = "w-6 h-6" }: { className?: string }) {
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
      {/* Coin base */}
      <circle cx="12" cy="12" r="10" className="stroke-current" />

      {/* Stylized sword (vertical line with crossguard) */}
      <line
        x1="12"
        y1="6"
        x2="12"
        y2="18"
        className="stroke-yellow-400"
        strokeWidth="2.5"
      />
      <line
        x1="9"
        y1="9"
        x2="15"
        y2="9"
        className="stroke-yellow-400"
        strokeWidth="2.5"
      />

      {/* Laurel wreath elements (simplified) */}
      <path
        d="M7,10 Q9,12 7,14"
        fill="none"
        className="stroke-yellow-400"
        strokeWidth="1.5"
      />
      <path
        d="M17,10 Q15,12 17,14"
        fill="none"
        className="stroke-yellow-400"
        strokeWidth="1.5"
      />
    </svg>
  );
}
