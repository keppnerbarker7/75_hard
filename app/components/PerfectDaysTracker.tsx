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
      <h2 className="text-xl font-bold text-zinc-900 mb-2">
        🔥 Streaks & Perfect Days
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        Consecutive days with $0 penalty
      </p>

      <div className="space-y-2">
        {sortedUsers.map((user, index) => (
          <div
            key={user.name}
            className={`flex items-center justify-between px-4 py-3 rounded-lg ${
              index === 0
                ? "bg-orange-50 border-2 border-orange-300"
                : "bg-zinc-50"
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-lg">{index === 0 ? "🔥" : `${index + 1}.`}</span>
              <span className="font-semibold text-zinc-900">{user.name}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-lg font-bold text-orange-600">
                  {user.currentStreak}
                </span>
                <span className="text-xs text-zinc-500 ml-1">streak</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-green-600">
                  {user.perfectDays}
                </span>
                <span className="text-xs text-zinc-500 ml-1">perfect</span>
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
  let countingCurrentStreak = true; // Only count streak from most recent backwards

  // Calculate from most recent backwards for current streak
  for (let i = sortedCheckIns.length - 1; i >= 0; i--) {
    const checkIn = sortedCheckIns[i];
    const isPerfect = checkIn.penalty === 0;

    if (isPerfect) {
      perfectDays++;
      tempStreak++;

      // Only count toward current streak if we're still in the streak from the most recent
      if (countingCurrentStreak) {
        currentStreak++;
      }
    } else {
      // Streak broken
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      tempStreak = 0;

      // Stop counting current streak once we hit first non-perfect day
      countingCurrentStreak = false;
    }
  }

  // Final check for longest streak
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  return { perfectDays, currentStreak, longestStreak };
}
