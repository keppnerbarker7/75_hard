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
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,90,54,0.12),transparent_50%,rgba(180,208,127,0.06))]" />
            <div className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_0.95fr] gap-6 items-start">
              <div>
                <p className="section-kicker text-[var(--accent)] mb-3">Accountability Board</p>
                <h1 className="font-display text-5xl md:text-7xl uppercase leading-none text-[var(--sand)]">
                  75 Hard
                </h1>
                <p className="mt-3 text-sm md:text-base text-[var(--muted)] max-w-xl">
                  Brutally simple scoreboard for a group challenge. Check in fast, miss tasks publicly, let the math stay honest.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm md:text-base text-[var(--muted)]">
                  <span>
                    <span className="text-[var(--sand)] font-semibold">Day {daysPassed + 1}</span> of 75
                  </span>
                  <span>{daysRemaining} days left</span>
                  <span>{checkedInCount} checked in</span>
                  <span className="text-[var(--accent)]">Pool ${poolTotal.toFixed(0)}</span>
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,#ff5a36,#c73513)] text-white p-5 md:p-6 shadow-[0_24px_60px_rgba(255,90,54,0.2)]">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="section-kicker text-white/65 mb-2">Tonight&apos;s Pressure</p>
                    <p className="font-display text-5xl uppercase leading-none">{completionPercent}%</p>
                    <p className="text-sm text-white/80 mt-2">
                      submissions recorded before midnight Mountain Time
                    </p>
                  </div>
                  <div className="rounded-full border border-white/20 bg-black/10 px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Current Leader</p>
                    <p className="font-semibold">{leader?.name ?? "TBD"}</p>
                  </div>
                </div>

                <div className="h-3 rounded-full bg-black/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#fff4d7,#10100d)] transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
                  <div>
                    <p className="section-kicker text-white/55 mb-1">Best Position</p>
                    <p className="metric-value text-3xl text-white">
                      {leader ? `${leader.netPosition >= 0 ? "+" : ""}$${leader.netPosition.toFixed(0)}` : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="section-kicker text-white/55 mb-1">Longest Streak</p>
                    <p className="metric-value text-3xl text-[#fff4d7]">
                      {Math.max(...leaderboardWithPerfectDays.map((user) => user.currentStreak), 0)}
                    </p>
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
                  <h2 className="font-display text-3xl md:text-4xl uppercase text-[var(--sand)]">
                    Leaderboard
                  </h2>
                  <p className="text-sm text-[var(--muted)] mt-1">
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
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.2rem] border px-3 py-3 transition-all ${
                      index === 0
                        ? "bg-[linear-gradient(135deg,rgba(255,90,54,0.18),rgba(247,239,217,0.06))] border-[rgba(255,90,54,0.55)]"
                        : "bg-[rgba(255,255,255,0.02)] border-[var(--stroke)] hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-display text-xl ${index===0 ? "bg-[var(--accent)] text-white" : "bg-[var(--sand)] text-zinc-950"}`}>
                      {index === 0 ? "1" : index + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/checkin/${user.slug}`}
                          className="font-semibold text-[var(--sand)] hover:text-[var(--accent)] text-base md:text-lg"
                        >
                          {user.name}
                        </a>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                            user.checkedInToday
                              ? "bg-[rgba(180,208,127,0.16)] text-[var(--olive)]"
                              : "bg-[rgba(255,90,54,0.14)] text-[var(--accent)]"
                          }`}
                        >
                          {user.checkedInToday ? "submitted" : "pending"}
                        </span>
                        <a
                          href={`/stats/${user.slug}`}
                          className="px-2 py-0.5 text-[10px] bg-white/8 text-[var(--sand)] hover:bg-white/14 rounded-full font-semibold uppercase tracking-[0.16em] transition-colors"
                        >
                          stats
                        </a>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-[var(--muted)]">
                        <span>{user.currentStreak} day streak</span>
                        <span>{user.perfectDays} perfect</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`metric-value text-2xl md:text-3xl ${
                          user.netPosition >= 0 ? "text-[var(--olive)]" : "text-[var(--accent)]"
                        }`}
                      >
                        {user.netPosition >= 0 ? "+" : ""}${user.netPosition.toFixed(0)}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] mt-0.5">
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
              <h2 className="font-display text-3xl uppercase text-[var(--sand)] mb-3">
                Tonight&apos;s Check-Ins
              </h2>
              <p className="mb-4 text-sm text-[var(--muted)]">
                <span className="text-[var(--olive)] font-semibold">{checkedInCount} submitted</span>
                {" · "}
                <span className="text-[var(--accent)] font-semibold">{pendingCount} pending</span>
                {" · "}midnight Mountain Time closes the day
              </p>
              <div className="flex flex-wrap gap-2">
                {leaderboardWithPerfectDays.map((user) => (
                  <a
                    key={user.slug}
                  href={`/checkin/${user.slug}`}
                  className={`px-3 py-2 rounded-xl font-medium transition-all ${
                    user.checkedInToday
                        ? "bg-[var(--olive)] text-zinc-950 shadow-md"
                        : "bg-white/4 text-[var(--sand)] border border-[var(--stroke)] hover:border-[var(--accent)]"
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
