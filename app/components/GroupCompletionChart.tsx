"use client";

type CheckIn = {
  date: string;
  task1: boolean;
  task2: boolean;
  task3: boolean;
  task4: boolean;
  task5: boolean;
  penalty: number;
};

type User = {
  name: string;
  slug: string;
  checkIns: CheckIn[];
};

type GroupCompletionChartProps = {
  users: User[];
};

const USER_COLORS = [
  { line: "#3b82f6", light: "#93c5fd" }, // blue
  { line: "#10b981", light: "#6ee7b7" }, // green
  { line: "#f59e0b", light: "#fcd34d" }, // amber
  { line: "#ef4444", light: "#fca5a5" }, // red
  { line: "#8b5cf6", light: "#c4b5fd" }, // purple
  { line: "#ec4899", light: "#f9a8d4" }, // pink
];

export default function GroupCompletionChart({ users }: GroupCompletionChartProps) {
  if (users.length === 0) return null;

  // Find the maximum day number across all users
  const maxDays = Math.max(...users.map(u => u.checkIns.length), 0);
  if (maxDays === 0) return null;

  // Determine which days to show (last 10)
  const startDay = Math.max(1, maxDays - 9); // Show days [startDay, maxDays]
  const endDay = maxDays;
  const visibleDays = endDay - startDay + 1;

  // Prepare data for each user
  const userChartData = users.map((user, userIdx) => {
    const data = [];

    // For each day in the visible range, find the corresponding check-in
    for (let day = startDay; day <= endDay; day++) {
      const checkInIdx = day - 1; // day 1 is at index 0

      if (checkInIdx < user.checkIns.length) {
        const checkIn = user.checkIns[checkInIdx];
        const tasksCompleted = [
          checkIn.task1,
          checkIn.task2,
          checkIn.task3,
          checkIn.task4,
          checkIn.task5,
        ].filter(Boolean).length;

        data.push({
          day: day,
          completionRate: (tasksCompleted / 5) * 100,
        });
      }
    }

    return {
      name: user.name,
      color: USER_COLORS[userIdx % USER_COLORS.length],
      data,
    };
  });

  if (userChartData.every(u => u.data.length === 0)) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg">
      <h2 className="text-lg font-bold text-zinc-900 mb-3">
        Group Progress (Last 10 Days)
      </h2>

      <div className="w-full -my-2">
        <svg
          viewBox="0 0 800 240"
          className="w-full h-auto"
          style={{ minHeight: "180px" }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <g key={percent}>
              <line
                x1="80"
                y1={200 - (percent * 180) / 100}
                x2="770"
                y2={200 - (percent * 180) / 100}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x="60"
                y={200 - (percent * 180) / 100 + 5}
                fill="#6b7280"
                fontSize="15"
                fontWeight="600"
                textAnchor="end"
              >
                {percent}%
              </text>
            </g>
          ))}

          {/* Lines for each user */}
          {userChartData.map((userData, userIdx) => (
            <g key={userIdx}>
              {/* Line path - only draw if more than 1 point */}
              {userData.data.length > 1 && visibleDays > 1 && (
                <path
                  d={userData.data
                    .map((point, i) => {
                      // Position based on absolute day number
                      const dayOffset = point.day - startDay;
                      const x = 80 + (dayOffset / (visibleDays - 1)) * 690;
                      const y = 200 - (point.completionRate * 180) / 100;
                      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke={userData.color.line}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
              )}

              {/* Data points */}
              {userData.data.map((point, i) => {
                // Position based on absolute day number
                const dayOffset = point.day - startDay;
                const x = visibleDays === 1
                  ? 425  // Center of chart (80 + 690/2)
                  : 80 + (dayOffset / (visibleDays - 1)) * 690;
                const y = 200 - (point.completionRate * 180) / 100;

                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill={userData.color.line} />
                    <circle cx={x} cy={y} r="2" fill="white" />
                  </g>
                );
              })}
            </g>
          ))}

          {/* X-axis labels */}
          {Array.from({ length: visibleDays }, (_, i) => startDay + i)
            .filter((day, i) => {
              if (visibleDays <= 5) return true;
              if (visibleDays <= 10) return i % 2 === 0 || i === visibleDays - 1;
              return i % Math.ceil(visibleDays / 8) === 0 || i === visibleDays - 1;
            })
            .map((day, _, filteredDays) => {
              const dayOffset = day - startDay;
              const x = visibleDays === 1
                ? 425  // Center of chart
                : 80 + (dayOffset / (visibleDays - 1)) * 690;
              return (
                <text
                  key={day}
                  x={x}
                  y="225"
                  fill="#6b7280"
                  fontSize="15"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  Day {day}
                </text>
              );
            })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
        {userChartData.map((userData, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: userData.color.line }}
            ></div>
            <span className="text-xs text-zinc-600 font-medium">{userData.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
