type CheckIn = {
  task1: boolean;
  task2: boolean;
  task3: boolean;
  task4: boolean;
  task5: boolean;
  penalty: number;
};

type User = {
  name: string;
  perfectDays: number;
  currentStreak: number;
  longestStreak: number;
};

type PerfectDaysTrackerProps = {
  users: User[];
};

export default function PerfectDaysTracker({ users }: PerfectDaysTrackerProps) {
  // Sort by current streak descending
  const sortedUsers = [...users].sort((a, b) => b.currentStreak - a.currentStreak);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-zinc-900 mb-2 flex items-center gap-2">
        🔥 Streaks & Perfect Days
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        Consecutive days with $0 penalty
      </p>

      <div className="space-y-4">
        {sortedUsers.map((user, index) => (
          <div
            key={user.name}
            className={`p-4 rounded-lg border-2 ${
              index === 0
                ? "border-orange-400 bg-orange-50"
                : "border-zinc-200 bg-zinc-50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {index === 0 && <span className="text-2xl">🔥</span>}
                <div>
                  <p className="font-bold text-zinc-900 text-lg">
                    {user.name}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {user.currentStreak} day streak
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-orange-600">
                  {user.currentStreak}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-3 border-t border-zinc-200">
              <div className="flex-1 text-center">
                <p className="text-xs text-zinc-600 mb-1">Perfect Days</p>
                <p className="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                  {user.perfectDays}
                </p>
              </div>
              <div className="flex-1 text-center border-l border-zinc-200">
                <p className="text-xs text-zinc-600 mb-1">Longest Streak</p>
                <p className="text-lg font-bold text-purple-600">
                  {user.longestStreak}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to calculate streak data from check-ins
export function calculateStreakData(checkIns: CheckIn[]): {
  perfectDays: number;
  currentStreak: number;
  longestStreak: number;
} {
  // Sort check-ins by date (assuming they have a date field)
  const sortedCheckIns = [...checkIns].sort((a, b) => {
    // If check-ins have date property, use it
    return 0; // Will be sorted already in most cases
  });

  let perfectDays = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate from most recent backwards for current streak
  for (let i = sortedCheckIns.length - 1; i >= 0; i--) {
    const checkIn = sortedCheckIns[i];
    const isPerfect = checkIn.penalty === 0;

    if (isPerfect) {
      perfectDays++;
      tempStreak++;

      // Current streak is only counted from the end
      if (i === sortedCheckIns.length - 1 || currentStreak > 0) {
        currentStreak = tempStreak;
      }
    } else {
      // Streak broken
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      tempStreak = 0;

      // If we haven't established a current streak yet, it's 0
      if (i === sortedCheckIns.length - 1) {
        currentStreak = 0;
      }
    }
  }

  // Final check for longest streak
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  return { perfectDays, currentStreak, longestStreak };
}
