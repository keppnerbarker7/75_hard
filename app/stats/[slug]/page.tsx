import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CompletionChart from "./CompletionChart";
import { calculateStreakData, calculateTaskStats } from "@/lib/challenge";
import { formatDisplayDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function UserStatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await prisma.user.findUnique({
    where: { slug },
    include: {
      checkIns: {
        orderBy: { date: "asc" },
      },
      group: true,
    },
  });

  if (!user) {
    notFound();
  }

  const allUsers = await prisma.user.findMany({
    include: {
      checkIns: true,
    },
  });

  const userTaskStats = calculateTaskStats(
    user.checkIns.filter((checkIn) => !checkIn.isAutoFilled)
  );
  const allCheckIns = allUsers.flatMap((groupUser) =>
    groupUser.checkIns.filter((checkIn) => !checkIn.isAutoFilled)
  );
  const groupTaskStats = calculateTaskStats(allCheckIns);
  const streakData = calculateStreakData(user.checkIns);
  const totalPenalties = user.checkIns.reduce((sum, checkIn) => sum + checkIn.penalty, 0);

  const chartData = user.checkIns.map((checkIn, index) => {
    const tasksCompleted = [
      checkIn.task1,
      checkIn.task2,
      checkIn.task3,
      checkIn.task4,
      checkIn.task5,
    ].filter(Boolean).length;

    return {
      day: index + 1,
      tasksCompleted,
      date: checkIn.date,
    };
  });

  const dayOfWeekStats: Record<
    string,
    { completed: number; total: number; penalties: number; perfectDays: number }
  > = {
    Sunday: { completed: 0, total: 0, penalties: 0, perfectDays: 0 },
    Monday: { completed: 0, total: 0, penalties: 0, perfectDays: 0 },
    Tuesday: { completed: 0, total: 0, penalties: 0, perfectDays: 0 },
    Wednesday: { completed: 0, total: 0, penalties: 0, perfectDays: 0 },
    Thursday: { completed: 0, total: 0, penalties: 0, perfectDays: 0 },
    Friday: { completed: 0, total: 0, penalties: 0, perfectDays: 0 },
    Saturday: { completed: 0, total: 0, penalties: 0, perfectDays: 0 },
  };

  user.checkIns.forEach((checkIn) => {
    const dayName = formatDisplayDate(checkIn.date, { weekday: "long" });
    const tasksCompleted = [
      checkIn.task1,
      checkIn.task2,
      checkIn.task3,
      checkIn.task4,
      checkIn.task5,
    ].filter(Boolean).length;

    dayOfWeekStats[dayName].completed += tasksCompleted;
    dayOfWeekStats[dayName].total += 5;
    dayOfWeekStats[dayName].penalties += checkIn.penalty;

    if (checkIn.penalty === 0) {
      dayOfWeekStats[dayName].perfectDays += 1;
    }
  });

  const bestDay = Object.entries(dayOfWeekStats)
    .filter(([_, stats]) => stats.total > 0)
    .sort(([_, a], [__, b]) => b.completed / b.total - a.completed / a.total)[0];

  const worstDay = Object.entries(dayOfWeekStats)
    .filter(([_, stats]) => stats.total > 0)
    .sort(([_, a], [__, b]) => a.completed / a.total - b.completed / b.total)[0];

  const recentCheckIns = user.checkIns.slice(-5).reverse();
  const strongestTask = userTaskStats[0];
  const weakestTask = userTaskStats[userTaskStats.length - 1];

  return (
    <div className="min-h-screen py-6 md:py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <a
            href="/"
            className="text-[var(--muted)] hover:text-[var(--sand)] text-sm mb-4 inline-block"
          >
            ← Back to Dashboard
          </a>
          <div className="paper-panel rounded-[2rem] overflow-hidden">
            <div className="relative px-6 py-6 md:px-8 md:py-8 bg-[linear-gradient(135deg,rgba(255,90,54,0.12),transparent_55%,rgba(180,208,127,0.05))]">
              <p className="section-kicker text-[var(--accent)] mb-3">Personal Breakdown</p>
              <h1 className="font-display text-5xl md:text-6xl uppercase leading-none text-[var(--sand)]">
                {user.name}
              </h1>
              <p className="text-[var(--muted)] mt-3 max-w-2xl">
                A cleaner read on where this challenge is breaking open for you, where you are holding the line, and what your recent entries actually say.
              </p>
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="score-card rounded-2xl px-4 py-4">
                  <p className="section-kicker text-[var(--muted)] mb-2">Current Streak</p>
                  <p className="metric-value text-4xl text-[var(--olive)]">{streakData.currentStreak}</p>
                </div>
                <div className="score-card rounded-2xl px-4 py-4">
                  <p className="section-kicker text-[var(--muted)] mb-2">Perfect Days</p>
                  <p className="metric-value text-4xl text-[var(--sand)]">{streakData.perfectDays}</p>
                </div>
                <div className="score-card rounded-2xl px-4 py-4">
                  <p className="section-kicker text-[var(--muted)] mb-2">Total Penalties</p>
                  <p className="metric-value text-4xl text-[var(--accent)]">${totalPenalties}</p>
                </div>
                <div className="score-card rounded-2xl px-4 py-4">
                  <p className="section-kicker text-[var(--muted)] mb-2">Entries Logged</p>
                  <p className="metric-value text-4xl text-[var(--sand)]">{user.checkIns.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-6">
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="section-kicker text-[var(--accent)] mb-2">Takeaway</p>
            <h2 className="font-display text-3xl uppercase text-[var(--sand)] mb-4">
              Performance Read
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[rgba(180,208,127,0.22)] bg-[rgba(180,208,127,0.08)] p-4">
                <p className="section-kicker text-[var(--olive)] mb-2">Strongest Task</p>
                <p className="text-lg font-semibold text-[var(--sand)]">
                  {strongestTask?.emoji} {strongestTask?.taskName ?? "N/A"}
                </p>
                <p className="text-sm text-[var(--muted)] mt-2">
                  {strongestTask ? `${Math.round(strongestTask.completionRate * 100)}% hit rate` : "No data yet"}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(255,90,54,0.22)] bg-[rgba(255,90,54,0.08)] p-4">
                <p className="section-kicker text-[var(--accent)] mb-2">Weakest Task</p>
                <p className="text-lg font-semibold text-[var(--sand)]">
                  {weakestTask?.emoji} {weakestTask?.taskName ?? "N/A"}
                </p>
                <p className="text-sm text-[var(--muted)] mt-2">
                  {weakestTask ? `${Math.round(weakestTask.completionRate * 100)}% hit rate` : "No data yet"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <p className="section-kicker text-[var(--muted)] mb-2">Best Day</p>
                <p className="text-lg font-semibold text-[var(--sand)]">
                  {bestDay?.[0] ?? "N/A"}
                </p>
                <p className="text-sm text-[var(--muted)] mt-2">
                  {bestDay ? `${Math.round((bestDay[1].completed / bestDay[1].total) * 100)}% completion` : "Not enough entries"}
                </p>
              </div>
            </div>
          </div>

          <div className="paper-panel rounded-[2rem] p-6">
            <p className="section-kicker text-[var(--accent)] mb-2">Recent State</p>
            <h2 className="font-display text-3xl uppercase text-[var(--sand)] mb-3">
              Last 5 Entries
            </h2>
            <div className="space-y-3">
              {recentCheckIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className={`rounded-[1.3rem] border p-4 ${
                    checkIn.penalty === 0
                      ? "border-[rgba(180,208,127,0.3)] bg-[rgba(180,208,127,0.07)]"
                      : "border-[rgba(255,90,54,0.3)] bg-[rgba(255,90,54,0.07)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[var(--sand)]">
                      {formatDisplayDate(checkIn.date, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className={`font-display text-2xl ${checkIn.penalty === 0 ? "text-[var(--olive)]" : "text-[var(--accent)]"}`}>
                      ${checkIn.penalty}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-2">
                    {[
                      checkIn.task1,
                      checkIn.task2,
                      checkIn.task3,
                      checkIn.task4,
                      checkIn.task5,
                    ].filter(Boolean).length}
                    /5 tasks completed
                    {checkIn.isAutoFilled ? " · auto-filled" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {chartData.length > 0 && <CompletionChart chartData={chartData} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="paper-panel rounded-[2rem] p-6 shadow-lg">
            <h2 className="font-display text-3xl uppercase text-[var(--sand)] mb-4">
              Your Task Performance
            </h2>
            <div className="space-y-4">
              {userTaskStats.map((task) => {
                const groupTask = groupTaskStats.find((groupEntry) => groupEntry.taskName === task.taskName);
                const userRate = Math.round(task.completionRate * 100);
                const groupRate = groupTask ? Math.round(groupTask.completionRate * 100) : 0;
                const diff = userRate - groupRate;

                return (
                  <div key={task.taskName}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{task.emoji}</span>
                        <span className="font-semibold text-sm text-[var(--sand)]">
                          {task.taskName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-[var(--sand)]">{userRate}%</span>
                        {diff !== 0 && (
                          <span
                            className={`text-sm ml-2 font-semibold ${
                              diff > 0 ? "text-[var(--olive)]" : "text-[var(--accent)]"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {diff}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative w-full bg-white/6 rounded-full h-3">
                      <div
                        className={`absolute h-3 rounded-full ${
                          userRate >= 80
                            ? "bg-[var(--olive)]"
                            : userRate >= 60
                            ? "bg-[#ffd166]"
                            : "bg-[var(--accent)]"
                        }`}
                        style={{ width: `${userRate}%` }}
                      />
                      <div
                        className="absolute top-0 h-3 w-0.5 bg-[var(--sand)]"
                        style={{ left: `${groupRate}%` }}
                        title={`Group avg: ${groupRate}%`}
                      />
                    </div>
                    <p className="text-sm text-[var(--muted)] mt-1 font-medium">
                      {task.completed}/{task.total} completed · Group avg: {groupRate}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="paper-panel rounded-[2rem] p-6 shadow-lg">
            <h2 className="font-display text-3xl uppercase text-[var(--sand)] mb-4">
              Day of Week Patterns
            </h2>
            <div className="space-y-3">
              {Object.entries(dayOfWeekStats)
                .filter(([_, stats]) => stats.total > 0)
                .map(([day, stats]) => {
                  const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                  const isBest = bestDay && bestDay[0] === day;
                  const isWorst = worstDay && worstDay[0] === day;

                  return (
                    <div
                      key={day}
                      className={`p-3 rounded-lg ${
                        isBest
                          ? "bg-[rgba(180,208,127,0.08)] border border-[rgba(180,208,127,0.3)]"
                          : isWorst
                          ? "bg-[rgba(255,90,54,0.08)] border border-[rgba(255,90,54,0.3)]"
                          : "bg-white/4 border border-white/8"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[var(--sand)]">{day}</span>
                          {isBest && (
                            <span className="text-xs bg-[var(--olive)] text-zinc-950 px-2 py-0.5 rounded-full">
                              Best
                            </span>
                          )}
                          {isWorst && (
                            <span className="text-xs bg-[var(--accent)] text-white px-2 py-0.5 rounded-full">
                              Toughest
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-lg text-[var(--sand)]">{rate}%</span>
                      </div>
                      <div className="w-full bg-white/6 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            rate >= 80
                              ? "bg-[var(--olive)]"
                              : rate >= 60
                              ? "bg-[#ffd166]"
                              : "bg-[var(--accent)]"
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <p className="text-sm text-[var(--muted)] mt-1 font-medium">
                        {stats.completed}/{stats.total} tasks completed · {stats.perfectDays} perfect days · ${stats.penalties} penalties
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="paper-panel rounded-[2rem] p-6 shadow-lg lg:col-span-2">
            <h2 className="font-display text-3xl uppercase text-[var(--sand)] mb-4">
              Recent Check-Ins (Last 5 Days)
            </h2>
            <div className="space-y-4">
              {recentCheckIns.map((checkIn) => {
                const taskNames = [
                  { name: "📖 Read 5 pages", completed: checkIn.task1 },
                  { name: "🏃 Outdoor workout", completed: checkIn.task2 },
                  { name: "💪 Second workout", completed: checkIn.task3 },
                  { name: "💧 1 gallon water", completed: checkIn.task4 },
                  { name: "🥗 Follow diet", completed: checkIn.task5 },
                ];

                return (
                  <div
                    key={checkIn.id}
                    className={`p-4 rounded-xl border ${
                      checkIn.penalty === 0
                        ? "border-[rgba(180,208,127,0.3)] bg-[rgba(180,208,127,0.07)]"
                        : "border-[rgba(255,90,54,0.3)] bg-[rgba(255,90,54,0.07)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-[var(--sand)]">
                        {formatDisplayDate(checkIn.date, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          checkIn.penalty === 0 ? "text-[var(--olive)]" : "text-[var(--accent)]"
                        }`}
                      >
                        ${checkIn.penalty}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {taskNames.map((task, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 text-sm ${
                            task.completed ? "text-[var(--olive)]" : "text-[var(--muted)]"
                          }`}
                        >
                          <span className="text-base">{task.completed ? "✓" : "✗"}</span>
                          <span>{task.name}</span>
                        </div>
                      ))}
                    </div>
                    {checkIn.isAutoFilled && (
                      <p className="text-xs text-[var(--accent)] mt-2 italic">Auto-filled</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
