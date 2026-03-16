export default function HealthScore({ healthScore }) {
  if (!healthScore) return null;

  const { score, level, factors } = healthScore;

  const colorMap = {
    healthy: { ring: '#22c55e', bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
    'at-risk': { ring: '#f59e0b', bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
    critical: { ring: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  };

  const colors = colorMap[level] || colorMap['at-risk'];
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Sprint Health</h3>
      <div className="flex items-center gap-6">
        {/* Circular score */}
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="40" fill="none" stroke={colors.ring} strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round" transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{score}</span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
        </div>

        {/* Factors */}
        <div className="flex-1 space-y-2">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colors.badge}`}>
            {level}
          </span>
          {(factors || []).map((f) => (
            <div key={f.name}>
              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                <span>{f.name}</span>
                <span>{f.score}/{f.max}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${(f.score / f.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
