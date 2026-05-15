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
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-zinc-900 mb-2">{user.name}</h1>
            <p className="text-zinc-600 text-lg">{displayDate}</p>
            {mode === "correct" && (
              <p className="text-sm text-orange-700 mt-2 font-semibold">
                Correcting an auto-filled entry. Window closes at midnight after{" "}
                {getCorrectionDeadlineLabel(targetDate)}.
              </p>
            )}
            <p className="text-sm text-zinc-500 mt-2">
              Current Position:{" "}
              <span
                className={`font-bold ${
                  currentPosition >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {currentPosition >= 0 ? "+" : ""}${currentPosition.toFixed(2)}
              </span>
            </p>
          </div>

          {existingCheckIn && !canCorrect ? (
            <div
              className={`border-2 rounded-xl p-6 ${
                mode === "correct" && existingCheckIn.isAutoFilled
                  ? "bg-orange-50 border-orange-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div className="text-center mb-6">
                <div
                  className={`inline-block p-3 rounded-full mb-4 ${
                    mode === "correct" && existingCheckIn.isAutoFilled
                      ? "bg-orange-100"
                      : "bg-green-100"
                  }`}
                >
                  <svg
                    className={`w-12 h-12 ${
                      mode === "correct" && existingCheckIn.isAutoFilled
                        ? "text-orange-600"
                        : "text-green-600"
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
                      ? "text-orange-900"
                      : "text-green-900"
                  }`}
                >
                  {mode === "correct" && existingCheckIn.isAutoFilled
                    ? "Correction Window Closed"
                    : "Already Checked In"}
                </h2>
                <p
                  className={
                    mode === "correct" && existingCheckIn.isAutoFilled
                      ? "text-orange-700"
                      : "text-green-700"
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
                          ? "bg-green-100 text-green-900"
                          : "bg-red-50 text-red-900"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center ${
                          completed ? "bg-green-600" : "bg-red-400"
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
                    ? "border-orange-200"
                    : "border-green-200"
                }`}
              >
                <p
                  className={`text-lg font-bold ${
                    mode === "correct" && existingCheckIn.isAutoFilled
                      ? "text-orange-900"
                      : "text-green-900"
                  }`}
                >
                  {mode === "correct" ? "Entry Penalty" : "Today's Penalty"}: $
                  {existingCheckIn.penalty}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    mode === "correct" && existingCheckIn.isAutoFilled
                      ? "text-orange-700"
                      : "text-green-700"
                  }`}
                >
                  Running Total: ${totalPenalty}
                </p>
              </div>
            </div>
          ) : (
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
          )}

          <div className="mt-8 text-center">
            <a
              href="/"
              className="text-zinc-600 hover:text-zinc-900 underline text-sm"
            >
              View Leaderboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
