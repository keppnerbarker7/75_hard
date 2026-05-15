import { prisma } from "@/lib/prisma";
import PerfectDaysTracker, {
  calculateStreakData,
} from "./components/PerfectDaysTracker";
import TaskSuccessRate, {
  calculateTaskStats,
} from "./components/TaskSuccessRate";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Get today's date in MT timezone
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });

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

  // Calculate how many days have passed since start (using MT timezone)
  const startDateStr = new Date(group.startDate).toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });
  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });

  const startDate = new Date(startDateStr);
  const todayDateForCalc = new Date(todayStr);
  const daysPassed = Math.floor(
    (todayDateForCalc.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1; // +1 to include start day

  // Calculate total pool including penalties for unrecorded days
  const recordedPenalties = users.reduce((sum, user) => {
    return sum + user.checkIns.reduce((s, c) => s + c.penalty, 0);
  }, 0);

  const totalRecordedDays = users.reduce((sum, user) => sum + user.checkIns.length, 0);
  const expectedTotalDays = daysPassed * groupSize;
  const missingDays = expectedTotalDays - totalRecordedDays;
  const unrecordedPenalties = missingDays * 10;

  const poolTotal = recordedPenalties + unrecordedPenalties;

  // Calculate days remaining
  const endDate = new Date(group.endDate);
  const todayDate = new Date();
  const daysRemaining = Math.ceil(
    (endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Build leaderboard data with expected penalties for missing days
  const leaderboardData = users.map((user) => {
    const userCheckIns = user.checkIns;

    // Sum actual recorded penalties
    const recordedPenalty = userCheckIns.reduce(
      (sum, checkIn) => sum + checkIn.penalty,
      0
    );

    // Calculate missing days and add $10 for each
    const daysRecorded = userCheckIns.length;
    const missingDays = Math.max(0, daysPassed - daysRecorded);
    const missingPenalty = missingDays * 10;

    const totalPenalty = recordedPenalty + missingPenalty;
    const share = poolTotal / groupSize;
    const netPosition = share - totalPenalty; // positive = gain, negative = owe

    // Check if they've checked in today
    const checkedInToday = userCheckIns.some(
      (checkIn) => checkIn.date === today
    );

    return {
      name: user.name,
      slug: user.slug,
      daysCompleted: daysRecorded,
      totalPenalty,
      netPosition,
      checkedInToday,
      missingDays,
    };
  });

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

  // Calculate task success rates from all check-ins
  const allCheckIns = users.flatMap((user) => user.checkIns);
  const taskStats = calculateTaskStats(allCheckIns);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            75 Hard Challenge
          </h1>
          <p className="text-zinc-300 text-lg">{group.name}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 text-center col-span-1">
            <p className="text-zinc-600 text-sm font-medium mb-2">
              Days Remaining
            </p>
            <p className="text-5xl font-bold text-zinc-900">{daysRemaining}</p>
          </div>
          <div className="bg-zinc-100 rounded-xl p-4 text-center">
            <p className="text-zinc-500 text-xs font-medium mb-1">Pool Total</p>
            <p className="text-2xl font-semibold text-zinc-700">${poolTotal}</p>
          </div>
          <div className="bg-zinc-100 rounded-xl p-4 text-center">
            <p className="text-zinc-500 text-xs font-medium mb-1">
              Each Share
            </p>
            <p className="text-2xl font-semibold text-zinc-700">
              ${(poolTotal / groupSize).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Today's Check-In Status */}
        <div className="bg-white rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">
            Today's Check-Ins
          </h2>
          <div className="flex flex-wrap gap-2">
            {leaderboardWithPerfectDays.map((user) => (
              <div
                key={user.slug}
                className={`px-4 py-2 rounded-lg font-medium ${
                  user.checkedInToday
                    ? "bg-green-100 text-green-800"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {user.checkedInToday ? "✓" : "○"} {user.name}
              </div>
            ))}
          </div>
        </div>

        {/* New Stats Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <PerfectDaysTracker users={perfectDaysData} />
          <TaskSuccessRate taskStats={taskStats} />
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="bg-zinc-900 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Leaderboard</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Perfect Days
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Penalties
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Net Position
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-200">
                {leaderboardWithPerfectDays.map((user, index) => (
                  <tr
                    key={user.slug}
                    className={index === 0 ? "bg-yellow-50" : ""}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-2xl font-bold text-zinc-900">
                        {index === 0 ? "🏆" : index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`/checkin/${user.slug}`}
                        className="text-lg font-medium text-zinc-900 hover:text-zinc-600"
                      >
                        {user.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg font-bold text-green-600">
                          {user.perfectDays}
                        </span>
                        {user.currentStreak > 0 && (
                          <span className="text-sm text-orange-600 font-medium">
                            🔥{user.currentStreak}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-red-600 font-medium">
                        ${user.totalPenalty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`font-bold text-lg ${
                          user.netPosition >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {user.netPosition >= 0 ? "+" : ""}$
                        {user.netPosition.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 text-center">
          <p className="text-zinc-400 text-sm mb-4">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-3">
            {users.map((user) => (
              <a
                key={user.slug}
                href={`/checkin/${user.slug}`}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm"
              >
                {user.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
