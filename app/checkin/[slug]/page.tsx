import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInForm from "./CheckInForm";
import {
  TASKS,
  buildLeaderboard,
  calculateTaskStats,
  getDaysPassedSinceStart,
  getPoolTotal,
} from "@/lib/challenge";
import {
  formatDisplayDate,
  getCorrectionDeadlineLabel,
  getTodayDateInMountainTime,
  isCorrectionWindowOpen,
} from "@/lib/dates";

export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; mode?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const user = await prisma.user.findUnique({
    where: { slug },
    include: { group: true },
  });

  if (!user) {
    notFound();
  }

  const today = getTodayDateInMountainTime();
  const requestedDate =
    resolvedSearchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(resolvedSearchParams.date)
      ? resolvedSearchParams.date
      : today;
  const mode = resolvedSearchParams.mode === "correct" ? "correct" : "today";
  const targetDate = mode === "correct" ? requestedDate : today;

  const existingCheckIn = await prisma.checkIn.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: targetDate,
      },
    },
  });

  const allCheckIns = await prisma.checkIn.findMany({
    where: { userId: user.id },
  });

  const totalPenalty = allCheckIns.reduce((sum, checkIn) => sum + checkIn.penalty, 0);

  const allUsers = await prisma.user.findMany({
    include: { checkIns: true },
  });

  const leaderboard = buildLeaderboard(allUsers, user.group.startDate, today);
  const daysPassed = getDaysPassedSinceStart(user.group.startDate, today);
  const poolTotal = getPoolTotal(allUsers, daysPassed);
  const groupSize = allUsers.length;
  const currentPosition =
    leaderboard.find((entry) => entry.slug === user.slug)?.netPosition ?? 0;

  const realCheckIns = allUsers.flatMap((groupUser) =>
    groupUser.checkIns.filter((checkIn) => !checkIn.isAutoFilled)
  );
  const taskStats = calculateTaskStats(realCheckIns);
  const groupAvgCompletionRate =
    taskStats.length > 0
      ? taskStats.reduce((sum, task) => sum + task.completionRate, 0) / taskStats.length
      : 0.8;

  const avgTasksMissed = (1 - groupAvgCompletionRate) * 5;
  const groupAvgPenalty = Math.min(avgTasksMissed * 2, 10);
  const canCorrect =
    mode === "correct" &&
    Boolean(existingCheckIn?.isAutoFilled) &&
    isCorrectionWindowOpen(targetDate);
  const displayDate = formatDisplayDate(targetDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-3xl">
        <div className="paper-panel rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="px-6 py-6 md:px-8 md:py-8 border-b border-[var(--stroke)] bg-[linear-gradient(135deg,rgba(255,90,54,0.14),transparent_55%,rgba(180,208,127,0.05))]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="section-kicker text-[var(--accent)] mb-3">
                  {mode === "correct" ? "Correction Window" : "Daily Check-In"}
                </p>
                <h1 className="font-display text-5xl md:text-6xl uppercase leading-none text-[var(--sand)]">
                  {user.name}
                </h1>
                <p className="text-[var(--muted)] text-base md:text-lg mt-3">{displayDate}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:min-w-[20rem]">
                <div className="score-card rounded-2xl px-4 py-4">
                  <p className="section-kicker text-[var(--muted)] mb-2">Position</p>
                  <p className={`metric-value text-3xl ${currentPosition >= 0 ? "text-[var(--olive)]" : "text-[var(--accent)]"}`}>
                    {currentPosition >= 0 ? "+" : ""}${currentPosition.toFixed(0)}
                  </p>
                </div>
                <div className="score-card rounded-2xl px-4 py-4">
                  <p className="section-kicker text-[var(--muted)] mb-2">Pool</p>
                  <p className="metric-value text-3xl text-[var(--sand)]">${poolTotal.toFixed(0)}</p>
                </div>
              </div>
            </div>
            {mode === "correct" && (
              <p className="text-sm text-orange-700 mt-4 font-semibold">
                Correcting an auto-filled entry. Window closes at midnight after{" "}
                {getCorrectionDeadlineLabel(targetDate)}.
              </p>
            )}
          </div>

          {existingCheckIn && !canCorrect ? (
            <div
              className={`m-6 border rounded-[1.5rem] p-6 score-card ${
                mode === "correct" && existingCheckIn.isAutoFilled
                  ? "border-[rgba(255,90,54,0.35)]"
                  : "border-[rgba(180,208,127,0.35)]"
              }`}
            >
              <div className="text-center mb-6">
                <div
                className={`inline-flex p-3 rounded-full mb-4 ${
                    mode === "correct" && existingCheckIn.isAutoFilled
                      ? "bg-[rgba(255,90,54,0.16)]"
                      : "bg-[rgba(180,208,127,0.16)]"
                  }`}
                >
                  <svg
                    className={`w-12 h-12 ${
                      mode === "correct" && existingCheckIn.isAutoFilled
                        ? "text-[var(--accent)]"
                        : "text-[var(--olive)]"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2
                  className={`text-2xl font-bold mb-2 ${
                    mode === "correct" && existingCheckIn.isAutoFilled
                      ? "text-[var(--sand)]"
                      : "text-[var(--sand)]"
                  }`}
                >
                  {mode === "correct" && existingCheckIn.isAutoFilled
                    ? "Correction Window Closed"
                    : "Already Checked In"}
                </h2>
                <p
                  className={
                    mode === "correct" && existingCheckIn.isAutoFilled
                      ? "text-[var(--muted)]"
                      : "text-[var(--muted)]"
                  }
                >
                  {mode === "correct" && existingCheckIn.isAutoFilled
                    ? "This entry can no longer be corrected."
                    : `You completed this check-in at ${new Date(
                        existingCheckIn.submittedAt
                      ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "America/Denver",
                      })} MT`}
                </p>
              </div>

              <div className="space-y-3">
                {TASKS.map((task) => {
                  const completed = Boolean(
                    existingCheckIn[`task${task.id}` as keyof typeof existingCheckIn]
                  );
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-4 rounded-lg ${
                        completed
                          ? "bg-[rgba(180,208,127,0.08)] text-[var(--sand)]"
                          : "bg-[rgba(255,90,54,0.08)] text-[var(--sand)]"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center ${
                          completed ? "bg-[var(--olive)] text-zinc-950" : "bg-[var(--accent)]"
                        }`}
                      >
                        {completed ? (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium">{task.label}</span>
                    </div>
                  );
                })}
              </div>

              <div
                className={`mt-6 pt-6 border-t text-center ${
                  mode === "correct" && existingCheckIn.isAutoFilled
                    ? "border-[rgba(255,90,54,0.18)]"
                    : "border-[rgba(180,208,127,0.18)]"
                }`}
              >
                <p
                  className={`text-lg font-bold ${
                    existingCheckIn.penalty === 0 ? "text-[var(--olive)]" : "text-[var(--accent)]"
                  }`}
                >
                  {mode === "correct" ? "Entry Penalty" : "Today's Penalty"}: $
                  {existingCheckIn.penalty}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    mode === "correct" && existingCheckIn.isAutoFilled
                      ? "text-[var(--muted)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  Running Total: ${totalPenalty}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-6 py-6 md:px-8 md:py-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
                <CheckInForm
                  slug={slug}
                  tasks={TASKS}
                  totalPenalty={totalPenalty}
                  currentPosition={currentPosition}
                  poolTotal={poolTotal}
                  groupSize={groupSize}
                  groupAvgCompletionRate={groupAvgCompletionRate}
                  groupAvgPenalty={groupAvgPenalty}
                  targetDate={targetDate}
                  mode={mode}
                  existingPenalty={existingCheckIn?.penalty ?? 0}
                />
                <aside className="space-y-4">
                  <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,#ff5a36,#c73513)] text-white p-5">
                    <p className="section-kicker text-white/55 mb-2">Tonight&apos;s Rule</p>
                    <p className="font-display text-3xl uppercase leading-none">
                      One missed task costs $2
                    </p>
                    <p className="text-sm text-white/80 mt-3">
                      Five misses caps at $10. The pool gets split at the end of the challenge.
                    </p>
                  </div>
                  <div className="score-card rounded-[1.5rem] p-5">
                    <p className="section-kicker text-[var(--accent)] mb-2">Momentum</p>
                    <p className="text-sm text-[var(--muted)]">
                      Group completion is averaging {Math.round(groupAvgCompletionRate * 100)}%. A clean entry tonight helps both your net position and your streak.
                    </p>
                  </div>
                </aside>
              </div>
            </div>
          )}

          <div className="px-6 pb-6 md:px-8 md:pb-8 text-center">
            <a
              href="/"
              className="text-[var(--muted)] hover:text-[var(--sand)] underline text-sm"
            >
              View Leaderboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
