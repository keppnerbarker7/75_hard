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
  const pendingCount = groupSize - checkedInCount;
  const completionPercent = groupSize > 0 ? Math.round((checkedInCount / groupSize) * 100) : 0;
  const leader = leaderboardWithPerfectDays[0];

  return (
    <div className="min-h-screen py-6 md:py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <section className="paper-panel rounded-[2rem] overflow-hidden mb-6 md:mb-8">
          <div className="relative px-5 py-6 md:px-8 md:py-8 lg:px-10">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(182,72,33,0.10),transparent_50%,rgba(53,86,72,0.10))]" />
            <div className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_0.95fr] gap-6 items-start">
              <div>
                <p className="section-kicker text-[var(--accent)] mb-3">Accountability Board</p>
                <h1 className="font-display text-5xl md:text-7xl uppercase leading-none text-zinc-950">
                  75 Hard
                </h1>
                <p className="mt-3 text-sm md:text-base text-zinc-700 max-w-xl">
                  Public pressure, automatic scoring, and a live payout board for the group.
                </p>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-[var(--stroke)] bg-white/70 px-4 py-4">
                    <p className="section-kicker text-zinc-500 mb-2">Challenge Day</p>
                    <p className="metric-value text-4xl text-zinc-950">{daysPassed + 1}</p>
                    <p className="text-xs text-zinc-500 mt-1">of 75</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--stroke)] bg-white/70 px-4 py-4">
                    <p className="section-kicker text-zinc-500 mb-2">Pool Total</p>
                    <p className="metric-value text-4xl text-[var(--accent)]">${poolTotal.toFixed(0)}</p>
                    <p className="text-xs text-zinc-500 mt-1">live penalty pool</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--stroke)] bg-white/70 px-4 py-4">
                    <p className="section-kicker text-zinc-500 mb-2">Checked In</p>
                    <p className="metric-value text-4xl text-[var(--olive)]">{checkedInCount}</p>
                    <p className="text-xs text-zinc-500 mt-1">{pendingCount} still pending</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--stroke)] bg-white/70 px-4 py-4">
                    <p className="section-kicker text-zinc-500 mb-2">Days Left</p>
                    <p className="metric-value text-4xl text-zinc-950">{daysRemaining}</p>
                    <p className="text-xs text-zinc-500 mt-1">{group.name}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-zinc-950 text-white p-5 md:p-6 shadow-[0_24px_60px_rgba(16,12,8,0.28)]">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="section-kicker text-white/55 mb-2">Tonight&apos;s Pressure</p>
                    <p className="font-display text-4xl uppercase leading-none">{completionPercent}%</p>
                    <p className="text-sm text-white/70 mt-2">
                      submissions recorded before midnight Mountain Time
                    </p>
                  </div>
                  <div className="rounded-full border border-white/15 px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Current Leader</p>
                    <p className="font-semibold">{leader?.name ?? "TBD"}</p>
                  </div>
                </div>

                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#f4d5b1,#b64821)] transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4">
                    <p className="section-kicker text-white/45 mb-2">Top Position</p>
                    <p className="metric-value text-3xl text-[#f4d5b1]">
                      {leader ? `${leader.netPosition >= 0 ? "+" : ""}$${leader.netPosition.toFixed(0)}` : "--"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4">
                    <p className="section-kicker text-white/45 mb-2">Longest Fire</p>
                    <p className="metric-value text-3xl text-white">
                      {Math.max(...leaderboardWithPerfectDays.map((user) => user.currentStreak), 0)}
                    </p>
                    <p className="text-xs text-white/50 mt-1">day active streak</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="paper-panel rounded-[2rem] overflow-hidden shadow-lg">
            <div className="px-5 pt-5 pb-3 md:px-6 md:pt-6">
              <p className="section-kicker text-[var(--accent)] mb-2">Standings</p>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl md:text-4xl uppercase text-zinc-950">
                    Leaderboard
                  </h2>
                  <p className="text-sm text-zinc-600 mt-1">
                    Net position reflects your share of the final pool minus your own penalties.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 md:px-6 md:pb-6">
              <div className="space-y-3">
                {leaderboardWithPerfectDays.map((user, index) => (
                  <div
                    key={user.slug}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.4rem] border px-4 py-4 transition-all ${
                      index === 0
                        ? "bg-[linear-gradient(135deg,rgba(244,213,177,0.55),rgba(255,248,238,0.9))] border-[#d8a56a]"
                        : "bg-white/70 border-[var(--stroke)] hover:bg-white"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white font-display text-2xl">
                      {index === 0 ? "1" : index + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/checkin/${user.slug}`}
                          className="font-semibold text-zinc-950 hover:text-[var(--accent)] text-lg"
                        >
                          {user.name}
                        </a>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                            user.checkedInToday
                              ? "bg-[#dff1e7] text-[var(--olive)]"
                              : "bg-[#f3e0d4] text-[var(--accent)]"
                          }`}
                        >
                          {user.checkedInToday ? "submitted" : "pending"}
                        </span>
                        <a
                          href={`/stats/${user.slug}`}
                          className="px-2.5 py-1 text-[11px] bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full font-semibold uppercase tracking-[0.16em] transition-colors"
                        >
                          stats
                        </a>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                        <span>{user.perfectDays} perfect days</span>
                        <span>{user.currentStreak} day streak</span>
                        <span>{user.daysRecorded} logged days</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`metric-value text-3xl ${
                          user.netPosition >= 0 ? "text-[var(--olive)]" : "text-[var(--accent)]"
                        }`}
                      >
                        {user.netPosition >= 0 ? "+" : ""}${user.netPosition.toFixed(0)}
                      </div>
                      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500 mt-1">
                        net position
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="paper-panel rounded-[2rem] p-5 md:p-6">
              <p className="section-kicker text-[var(--accent)] mb-2">Submission Watch</p>
              <h2 className="font-display text-3xl uppercase text-zinc-950 mb-3">
                Tonight&apos;s Check-Ins
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl bg-[#e3f1ea] border border-[#c7e2d4] px-4 py-4">
                  <p className="section-kicker text-[var(--olive)] mb-2">Submitted</p>
                  <p className="metric-value text-4xl text-[var(--olive)]">{checkedInCount}</p>
                </div>
                <div className="rounded-2xl bg-[#f7e7dd] border border-[#ecd0bf] px-4 py-4">
                  <p className="section-kicker text-[var(--accent)] mb-2">Pending</p>
                  <p className="metric-value text-4xl text-[var(--accent)]">{pendingCount}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {leaderboardWithPerfectDays.map((user) => (
                  <a
                    key={user.slug}
                    href={`/checkin/${user.slug}`}
                    className={`px-3 py-2 rounded-xl font-medium transition-all ${
                      user.checkedInToday
                        ? "bg-[#294a3d] text-white shadow-md"
                        : "bg-white/70 text-zinc-800 border border-[var(--stroke)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {user.checkedInToday ? "✓" : "○"} {user.name}
                  </a>
                ))}
              </div>
            </div>

            <TaskSuccessRate taskStats={taskStats} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6">
          <GroupSmallMultiples users={users} />
        </div>
      </div>
    </div>
  );
}
