export function UCIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span className="text-green-400 font-bold text-lg">UC</span>
    </div>
  )
}
