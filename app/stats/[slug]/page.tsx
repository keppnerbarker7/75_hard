import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { calculateStreakData } from "@/app/components/PerfectDaysTracker";
import { calculateTaskStats } from "@/app/components/TaskSuccessRate";

export const dynamic = "force-dynamic";

export default async function UserStatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch user with all check-ins
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

  // Fetch all users for comparison
  const allUsers = await prisma.user.findMany({
    include: {
      checkIns: true,
    },
  });

  // Calculate user's task completion rates
  const userTaskStats = calculateTaskStats(user.checkIns);

  // Calculate group average task completion
  const allCheckIns = allUsers.flatMap((u) => u.checkIns);
  const groupTaskStats = calculateTaskStats(allCheckIns);

  // Calculate streak data
  const streakData = calculateStreakData(user.checkIns);

  // Calculate total penalties
  const totalPenalties = user.checkIns.reduce(
    (sum, checkIn) => sum + checkIn.penalty,
    0
  );

  // Prepare data for completion chart
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
      completionRate: (tasksCompleted / 5) * 100,
      date: checkIn.date,
    };
  });

  // Best/worst days of week analysis
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
    const date = new Date(checkIn.date);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

    // Count completed tasks
    const tasksCompleted = [
      checkIn.task1,
      checkIn.task2,
      checkIn.task3,
      checkIn.task4,
      checkIn.task5,
    ].filter(Boolean).length;

    dayOfWeekStats[dayName].completed += tasksCompleted;
    dayOfWeekStats[dayName].total += 5; // 5 possible tasks per day
    dayOfWeekStats[dayName].penalties += checkIn.penalty;

    if (checkIn.penalty === 0) {
      dayOfWeekStats[dayName].perfectDays++;
    }
  });

  const bestDay = Object.entries(dayOfWeekStats)
    .filter(([_, stats]) => stats.total > 0)
    .sort(
      ([_, a], [__, b]) =>
        b.completed / b.total - a.completed / a.total
    )[0];

  const worstDay = Object.entries(dayOfWeekStats)
    .filter(([_, stats]) => stats.total > 0)
    .sort(
      ([_, a], [__, b]) =>
        a.completed / a.total - b.completed / b.total
    )[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 py-6 md:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/"
            className="text-zinc-400 hover:text-white text-sm mb-4 inline-block"
          >
            ← Back to Dashboard
          </a>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            {user.name}'s Stats
          </h1>
          <p className="text-zinc-400">Personal performance breakdown</p>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-zinc-400 text-xs mb-1">Current Streak</p>
            <p className="text-3xl font-bold text-orange-500">
              🔥 {streakData.currentStreak}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-zinc-400 text-xs mb-1">Perfect Days</p>
            <p className="text-3xl font-bold text-green-500">
              {streakData.perfectDays}
            </p>
          </div>
        </div>

        {/* Completion Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              Daily Task Completion
            </h2>
            <div className="w-full overflow-x-auto">
              <svg
                viewBox="0 0 800 300"
                className="w-full h-auto"
                style={{ minHeight: "200px" }}
              >
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((percent) => (
                  <g key={percent}>
                    <line
                      x1="60"
                      y1={240 - (percent * 200) / 100}
                      x2="780"
                      y2={240 - (percent * 200) / 100}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    <text
                      x="45"
                      y={240 - (percent * 200) / 100 + 5}
                      fill="#6b7280"
                      fontSize="12"
                      textAnchor="end"
                    >
                      {percent}%
                    </text>
                  </g>
                ))}

                {/* Line path */}
                <path
                  d={chartData
                    .map((point, i) => {
                      const x = 60 + (i / (chartData.length - 1 || 1)) * 720;
                      const y = 240 - (point.completionRate * 200) / 100;
                      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {chartData.map((point, i) => {
                  const x = 60 + (i / (chartData.length - 1 || 1)) * 720;
                  const y = 240 - (point.completionRate * 200) / 100;
                  const color = point.completionRate === 100 ? "#22c55e" : point.completionRate >= 60 ? "#3b82f6" : "#ef4444";

                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="5" fill={color} />
                      <circle cx={x} cy={y} r="3" fill="white" />
                    </g>
                  );
                })}

                {/* X-axis labels */}
                {chartData
                  .filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 10)) === 0 || i === chartData.length - 1)
                  .map((point, idx, arr) => {
                    const i = chartData.indexOf(point);
                    const x = 60 + (i / (chartData.length - 1 || 1)) * 720;
                    return (
                      <text
                        key={i}
                        x={x}
                        y="270"
                        fill="#6b7280"
                        fontSize="12"
                        textAnchor="middle"
                      >
                        Day {point.day}
                      </text>
                    );
                  })}
              </svg>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-zinc-600">100%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-zinc-600">60-99%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-zinc-600">&lt;60%</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your Task Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              Your Task Performance
            </h2>
            <div className="space-y-4">
              {userTaskStats.map((task) => {
                const groupTask = groupTaskStats.find(
                  (t) => t.taskName === task.taskName
                );
                const userRate = Math.round(task.completionRate * 100);
                const groupRate = groupTask
                  ? Math.round(groupTask.completionRate * 100)
                  : 0;
                const diff = userRate - groupRate;

                return (
                  <div key={task.taskName}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{task.emoji}</span>
                        <span className="font-semibold text-sm text-zinc-900">
                          {task.taskName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-zinc-900">
                          {userRate}%
                        </span>
                        {diff !== 0 && (
                          <span
                            className={`text-sm ml-2 font-semibold ${
                              diff > 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {diff}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative w-full bg-zinc-200 rounded-full h-3">
                      <div
                        className={`absolute h-3 rounded-full ${
                          userRate >= 80
                            ? "bg-green-500"
                            : userRate >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${userRate}%` }}
                      />
                      {/* Group average marker */}
                      <div
                        className="absolute top-0 h-3 w-0.5 bg-zinc-900"
                        style={{ left: `${groupRate}%` }}
                        title={`Group avg: ${groupRate}%`}
                      />
                    </div>
                    <p className="text-sm text-zinc-600 mt-1 font-medium">
                      {task.completed}/{task.total} completed · Group avg:{" "}
                      {groupRate}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day of Week Analysis */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              Day of Week Patterns
            </h2>
            <div className="space-y-3">
              {Object.entries(dayOfWeekStats)
                .filter(([_, stats]) => stats.total > 0)
                .map(([day, stats]) => {
                  const rate =
                    stats.total > 0
                      ? Math.round((stats.completed / stats.total) * 100)
                      : 0;
                  const isBest = bestDay && bestDay[0] === day;
                  const isWorst = worstDay && worstDay[0] === day;

                  return (
                    <div
                      key={day}
                      className={`p-3 rounded-lg ${
                        isBest
                          ? "bg-green-50 border-2 border-green-300"
                          : isWorst
                          ? "bg-red-50 border-2 border-red-300"
                          : "bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-zinc-900">{day}</span>
                          {isBest && (
                            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                              Best
                            </span>
                          )}
                          {isWorst && (
                            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                              Toughest
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-lg text-zinc-900">{rate}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            rate >= 80
                              ? "bg-green-500"
                              : rate >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <p className="text-sm text-zinc-600 mt-1 font-medium">
                        {stats.completed}/{stats.total} tasks completed · {stats.perfectDays} perfect days · $
                        {stats.penalties} penalties
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Recent Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg lg:col-span-2">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              Recent Check-Ins (Last 10 Days)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {user.checkIns
                .slice(-10)
                .reverse()
                .map((checkIn) => {
                  const date = new Date(checkIn.date);
                  const completedTasks = [
                    checkIn.task1,
                    checkIn.task2,
                    checkIn.task3,
                    checkIn.task4,
                    checkIn.task5,
                  ].filter(Boolean).length;

                  return (
                    <div
                      key={checkIn.id}
                      className={`p-3 rounded-lg border-2 ${
                        checkIn.penalty === 0
                          ? "border-green-300 bg-green-50"
                          : "border-red-300 bg-red-50"
                      }`}
                    >
                      <p className="text-xs text-zinc-600 mb-1">
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-2xl font-bold text-zinc-900 mb-1">
                        {completedTasks}/5
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          checkIn.penalty === 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        ${checkIn.penalty}
                      </p>
                      {checkIn.isAutoFilled && (
                        <p className="text-xs text-orange-600 mt-1">
                          Auto-filled
                        </p>
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
