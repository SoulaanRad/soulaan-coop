export function CommunityIcon({
  className = "w-6 h-6",
}: {
  className?: string;
}) {
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
      {/* Central circle representing unity */}
      <circle cx="12" cy="12" r="3" className="fill-slate-700 stroke-current" />

      {/* Laurel wreath elements (circular pattern) */}
      <path
        d="M12,5 Q15,8 12,11 Q9,8 12,5"
        fill="none"
        className="stroke-yellow-400"
        strokeWidth="1.5"
      />
      <path
        d="M12,13 Q15,16 12,19 Q9,16 12,13"
        fill="none"
        className="stroke-yellow-400"
        strokeWidth="1.5"
      />
      <path
        d="M5,12 Q8,15 11,12 Q8,9 5,12"
        fill="none"
        className="stroke-yellow-400"
        strokeWidth="1.5"
      />
      <path
        d="M13,12 Q16,15 19,12 Q16,9 13,12"
        fill="none"
        className="stroke-yellow-400"
        strokeWidth="1.5"
      />
    </svg>
  );
}
