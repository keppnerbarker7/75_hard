"use client";

type User = {
  name: string;
  totalPenalty: number;
  color: string;
};

type PoolContributionChartProps = {
  users: User[];
  poolTotal: number;
};

export default function PoolContributionChart({ users, poolTotal }: PoolContributionChartProps) {
  // Sort users by penalty (highest to lowest)
  const sortedUsers = [...users].sort((a, b) => b.totalPenalty - a.totalPenalty);

  // Calculate pie chart segments
  let currentAngle = -90; // Start at top (12 o'clock)
  const segments = sortedUsers.map((user) => {
    const percentage = (user.totalPenalty / poolTotal) * 100;
    const angle = (percentage / 100) * 360;

    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    // Calculate arc path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 150 + 140 * Math.cos(startRad);
    const y1 = 150 + 140 * Math.sin(startRad);
    const x2 = 150 + 140 * Math.cos(endRad);
    const y2 = 150 + 140 * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = `M 150 150 L ${x1} ${y1} A 140 140 0 ${largeArc} 1 ${x2} ${y2} Z`;

    currentAngle = endAngle;

    return {
      ...user,
      percentage,
      pathData,
    };
  });

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
        <span>💰</span> Pool Contributions
      </h2>

      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Pie Chart */}
        <div className="flex-shrink-0">
          <svg width="300" height="300" viewBox="0 0 300 300">
            {segments.map((segment, index) => (
              <g key={index}>
                <path
                  d={segment.pathData}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-opacity hover:opacity-80"
                />
              </g>
            ))}

            {/* Center circle with total */}
            <circle cx="150" cy="150" r="60" fill="white" />
            <text
              x="150"
              y="140"
              textAnchor="middle"
              fontSize="14"
              fontWeight="600"
              fill="#71717a"
            >
              Total Pool
            </text>
            <text
              x="150"
              y="165"
              textAnchor="middle"
              fontSize="24"
              fontWeight="800"
              fill="#18181b"
            >
              ${poolTotal.toFixed(0)}
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedUsers.map((user, index) => {
              const segment = segments[index];
              return (
                <div
                  key={user.name}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: user.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900 truncate">
                      {user.name}
                    </div>
                    <div className="text-sm text-zinc-600">
                      ${user.totalPenalty.toFixed(2)} • {segment.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
