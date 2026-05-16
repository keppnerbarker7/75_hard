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

type GroupHeatmapProps = {
  users: User[];
};

export default function GroupHeatmap({ users }: GroupHeatmapProps) {
  if (users.length === 0) return null;

  // Get the last 10 days of data
  const maxDays = Math.max(...users.map(u => u.checkIns.length), 0);
  if (maxDays === 0) return null;

  const startIdx = Math.max(0, maxDays - 10);

  // Determine which days to show (aligned across all users)
  const startDay = Math.max(1, maxDays - 9);
  const endDay = maxDays;
  const visibleDays = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);

  const getColorForRate = (completionRate: number) => {
    if (completionRate === 100) return "bg-green-500";
    if (completionRate >= 80) return "bg-green-400";
    if (completionRate >= 60) return "bg-blue-400";
    if (completionRate >= 40) return "bg-yellow-400";
    if (completionRate >= 20) return "bg-orange-400";
    return "bg-red-500";
  };

  const getTextForTasks = (completed: number) => {
    return `${completed}/5`;
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg">
      <h2 className="text-lg font-bold text-zinc-900 mb-3">
        Group Heatmap (Last 10 Days)
      </h2>

      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header row with day numbers */}
          <div className="flex mb-2">
            <div className="w-24 flex-shrink-0"></div>
            {visibleDays.map((dayNum) => (
              <div
                key={dayNum}
                className="flex-1 min-w-[50px] text-center text-xs font-semibold text-zinc-600"
              >
                D{dayNum}
              </div>
            ))}
          </div>

          {/* User rows */}
          {users.map((user) => {
            return (
              <div key={user.slug} className="flex items-center gap-2 mb-2">
                <div className="w-24 flex-shrink-0 text-sm font-semibold text-zinc-900 truncate">
                  {user.name}
                </div>

                {visibleDays.map((dayNum) => {
                  const checkInIdx = dayNum - 1; // day 1 is at index 0
                  const checkIn = user.checkIns[checkInIdx];

                  if (!checkIn) {
                    // User doesn't have data for this day
                    return (
                      <div
                        key={dayNum}
                        className="flex-1 min-w-[50px] h-12 bg-gray-200 rounded-lg flex items-center justify-center opacity-50"
                        title={`Day ${dayNum}: No data`}
                      >
                        <span className="text-xs font-bold text-gray-400">-</span>
                      </div>
                    );
                  }

                  const tasksCompleted = [
                    checkIn.task1,
                    checkIn.task2,
                    checkIn.task3,
                    checkIn.task4,
                    checkIn.task5,
                  ].filter(Boolean).length;

                  const completionRate = (tasksCompleted / 5) * 100;
                  const colorClass = getColorForRate(completionRate);

                  return (
                    <div
                      key={dayNum}
                      className={`flex-1 min-w-[50px] h-12 ${colorClass} rounded-lg flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-sm`}
                      title={`Day ${dayNum}: ${tasksCompleted}/5 tasks (${completionRate}%)`}
                    >
                      <span className="text-xs font-bold text-white drop-shadow-md">
                        {getTextForTasks(tasksCompleted)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-zinc-600">100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-400"></div>
          <span className="text-zinc-600">80-99%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-400"></div>
          <span className="text-zinc-600">60-79%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-400"></div>
          <span className="text-zinc-600">40-59%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-400"></div>
          <span className="text-zinc-600">20-39%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-zinc-600">&lt;20%</span>
        </div>
      </div>
    </div>
  );
}
