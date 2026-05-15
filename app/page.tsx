import { prisma } from "@/lib/prisma";
import TaskSuccessRate from "./components/TaskSuccessRate";
import GroupSmallMultiples from "./components/GroupSmallMultiples";
import {
  buildLeaderboard,
  calculateStreakData,
  calculateTaskStats,
  getDaysPassedSinceStart,
  getPoolTotal,
} from "@/lib/challenge";
import { getTodayDateInMountainTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Get today's date in MT timezone
  const today = getTodayDateInMountainTime();

  let users;

  try {
    // Fetch all users with their check-ins
    users = await prisma.user.findMany({
      include: {
        checkIns: true,
        group: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    if (users.length === 0) {
      return (
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 max-w-md">
            <h1 className="text-2xl font-bold text-zinc-900 mb-4">No Users Found</h1>
            <p className="text-zinc-600 mb-4">The database is empty. Please run the seed script.</p>
            <a href="/api/test-db" className="text-blue-600 hover:underline">
              Test Database Connection
            </a>
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error("Dashboard error:", error);
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Database Connection Error</h1>
          <p className="text-zinc-700 mb-4">
            Could not connect to the database. Please check your environment variables.
          </p>
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="text-sm font-mono text-red-800">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
          <a
            href="/api/test-db"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Database Connection
          </a>
        </div>
      </div>
    );
  }

  const group = users[0].group;
  const groupSize = users.length;
  const daysPassed = getDaysPassedSinceStart(group.startDate, today);
  const poolTotal = getPoolTotal(users, daysPassed);

  // Calculate days remaining
  const endDate = new Date(group.endDate);
  const todayDate = new Date();
  const daysRemaining = Math.ceil(
    (endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Build leaderboard data with expected penalties for missing days
  const leaderboardData = buildLeaderboard(users, group.startDate, today);

  // Calculate perfect days and streaks for each user
  const perfectDaysData = users.map((user) => {
    const streakData = calculateStreakData(user.checkIns);
    return {
      name: user.name,
      slug: user.slug,
      perfectDays: streakData.perfectDays,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
    };
  });

  // Merge perfect days data into leaderboard
  const leaderboardWithPerfectDays = leaderboardData.map((user) => {
    const perfectData = perfectDaysData.find((p) => p.slug === user.slug);
    return {
      ...user,
      perfectDays: perfectData?.perfectDays || 0,
      currentStreak: perfectData?.currentStreak || 0,
    };
  });

  // Sort by net position (highest to lowest)
  leaderboardWithPerfectDays.sort((a, b) => b.netPosition - a.netPosition);

  // Calculate task success rates from real check-ins only (exclude auto-filled)
  const realCheckIns = users.flatMap((user) =>
    user.checkIns.filter(c => !c.isAutoFilled)
  );
  const taskStats = calculateTaskStats(realCheckIns);

  const checkedInCount = leaderboardWithPerfectDays.filter((user) => user.checkedInToday).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 py-6 md:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold text-white mb-2">
            75 Hard Challenge
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">{group.name}</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <div className="inline-flex items-baseline bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full">
              <span className="text-zinc-300 text-sm font-medium">Day: </span>
              <span className="text-white text-2xl font-bold ml-2">{daysPassed + 1} of 75</span>
            </div>
            <div className="inline-flex items-baseline bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full">
              <span className="text-zinc-300 text-sm font-medium">Pool Total: </span>
              <span className="text-white text-2xl font-bold ml-2">${poolTotal.toFixed(2)}</span>
            </div>
            <div className="inline-flex items-baseline bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full">
              <span className="text-zinc-300 text-sm font-medium">Days Remaining: </span>
              <span className="text-white text-2xl font-bold ml-2">{daysRemaining}</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-4 md:mb-6">

          {/* Today's Check-Ins */}
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="flex flex-col gap-1 mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 flex items-center gap-2">
                <span>📋</span> Today's Check-Ins
              </h2>
              <p className="text-sm text-zinc-500">
                {checkedInCount} of {groupSize} submitted today
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {leaderboardWithPerfectDays.map((user) => (
                <a
                  key={user.slug}
                  href={`/checkin/${user.slug}`}
                  className={`px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 ${
                    user.checkedInToday
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                  }`}
                >
                  {user.checkedInToday ? "✓" : "○"} {user.name}
                </a>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-700 px-4 md:px-6 py-3 md:py-4">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <span>🏆</span> Leaderboard
              </h2>
            </div>

            {/* Column Headers */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between px-3 pb-2 border-b-2 border-zinc-200">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider min-w-[2rem]">
                    Rank
                  </span>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Name
                  </span>
                </div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Net Position
                </span>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="space-y-3">
                {leaderboardWithPerfectDays.map((user, index) => (
                  <div
                    key={user.slug}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300"
                        : "bg-zinc-50 hover:bg-zinc-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-zinc-900 min-w-[2rem]">
                        {index === 0 ? "👑" : `${index + 1}`}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`/checkin/${user.slug}`}
                            className="font-bold text-zinc-900 hover:text-zinc-600 text-lg"
                          >
                            {user.name}
                          </a>
                          <a
                            href={`/stats/${user.slug}`}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-semibold transition-colors"
                          >
                            📊 stats
                          </a>
                        </div>
                        {user.currentStreak > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-orange-600 text-xl">🔥</span>
                            <span className="text-sm font-bold text-orange-600">
                              {user.currentStreak} day streak
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xl font-bold ${
                          user.netPosition >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {user.netPosition >= 0 ? "+" : ""}$
                        {user.netPosition.toFixed(2)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {user.perfectDays} perfect days
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Stats Sections */}
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          <TaskSuccessRate taskStats={taskStats} />

          {/* Group Progress Charts */}
          <GroupSmallMultiples users={users} />
        </div>
      </div>
    </div>
  );
}
