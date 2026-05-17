import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInWrapper from "./CheckInWrapper";

const WEEKDAY_TASKS = [
  { id: 1, label: "Read at least 5 pages (physical book)" },
  { id: 2, label: "Outdoor workout — 45 min" },
  { id: 3, label: "Second workout — 45 min" },
  { id: 4, label: "Drink 1 gallon of water" },
  { id: 5, label: "Follow your chosen diet" },
];

const SUNDAY_TASKS = [
  { id: 1, label: "Read at least 5 pages (physical book)" },
  { id: 2, label: "Walk (outdoor activity) — 45 min" },
  { id: 4, label: "Drink 1 gallon of water" },
  { id: 5, label: "Follow your chosen diet" },
];

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Find the user
  const user = await prisma.user.findUnique({
    where: { slug },
    include: { group: true },
  });

  if (!user) {
    notFound();
  }

  // Get today's date in YYYY-MM-DD format (MT timezone)
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });

  // Get yesterday's date in YYYY-MM-DD format (MT timezone)
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });

  // Check if today is Sunday (MT timezone)
  const todayMT = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Denver" }));
  const isSunday = todayMT.getDay() === 0;
  const TASKS = isSunday ? SUNDAY_TASKS : WEEKDAY_TASKS;

  // Check yesterday's day of week
  const yesterdayMT = new Date(yesterdayDate.toLocaleString("en-US", { timeZone: "America/Denver" }));
  const yesterdayWasSunday = yesterdayMT.getDay() === 0;
  const YESTERDAY_TASKS = yesterdayWasSunday ? SUNDAY_TASKS : WEEKDAY_TASKS;

  // Check if user has already checked in today
  const existingCheckIn = await prisma.checkIn.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
  });

  // Check yesterday's check-in to see if it's correctable
  const yesterdayCheckIn = await prisma.checkIn.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: yesterday,
      },
    },
  });

  // Always allow updating yesterday (for people finishing tasks after midnight or who couldn't check in)
  const canCorrectYesterday = true;

  // Calculate total penalties to date
  const allCheckIns = await prisma.checkIn.findMany({
    where: { userId: user.id },
  });

  const totalPenalty = allCheckIns.reduce(
    (sum, checkIn) => sum + checkIn.penalty,
    0
  );

  // Calculate pool and position info
  const allUsers = await prisma.user.findMany({
    include: { checkIns: true },
  });

  const groupSize = allUsers.length;

  // Calculate how many days have passed since start (using MT timezone)
  const startDateStr = new Date(user.group.startDate).toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });
  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });

  const startDate = new Date(startDateStr);
  const todayDate = new Date(todayStr);

  // Days passed EXCLUDING today (only count complete days)
  // Today isn't over yet, so don't penalize for it
  const daysPassed = Math.floor(
    (todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate user's missing days (for current position on leaderboard)
  const userDaysRecorded = allCheckIns.length;
  const userMissingDays = Math.max(0, daysPassed - userDaysRecorded);
  const userMissingPenalty = userMissingDays * 10;

  // Calculate total pool including penalties for unrecorded days
  const recordedPenalties = allUsers.reduce((sum, u) => {
    return sum + u.checkIns.reduce((s, c) => s + c.penalty, 0);
  }, 0);

  const totalRecordedDays = allUsers.reduce((sum, u) => sum + u.checkIns.length, 0);
  const expectedTotalDays = daysPassed * groupSize;
  const missingDays = expectedTotalDays - totalRecordedDays;
  const unrecordedPenalties = missingDays * 10;

  const poolTotal = recordedPenalties + unrecordedPenalties;

  // Calculate user's current position (what's on the dashboard right now)
  // poolTotal now correctly excludes today since we removed the +1 from daysPassed
  const currentShare = poolTotal / groupSize;
  const currentPosition = currentShare - totalPenalty;

  // Calculate group average completion rate (same as Task Success Rates on dashboard)
  const realCheckIns = allUsers.flatMap(u => u.checkIns.filter(c => !c.isAutoFilled));

  let groupAvgCompletionRate = 0.8; // Default to 80%
  if (realCheckIns.length > 0) {
    // Calculate average across all 5 tasks
    const taskCompletions = [1, 2, 3, 4, 5].map(taskNum => {
      const taskKey = `task${taskNum}` as 'task1' | 'task2' | 'task3' | 'task4' | 'task5';
      const completed = realCheckIns.filter(c => c[taskKey]).length;
      return completed / realCheckIns.length;
    });
    groupAvgCompletionRate = taskCompletions.reduce((sum, rate) => sum + rate, 0) / 5;
  }

  // Convert completion rate to average penalty
  // If they complete 80% of tasks, they miss 20% = 1 task = $2
  const avgTasksMissed = (1 - groupAvgCompletionRate) * 5;
  const groupAvgPenalty = Math.min(avgTasksMissed * 2, 10);

  // Count how many people haven't checked in today (excluding current user)
  const peopleNotCheckedInToday = allUsers.filter(u =>
    u.id !== user.id && !u.checkIns.some(c => c.date === today && !c.isAutoFilled)
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-zinc-900 mb-2">
              {user.name}
            </h1>
            <p className="text-zinc-600 text-lg">
              {new Date(today).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="text-sm text-zinc-500 mt-2">
              Current Position: <span className={`font-bold ${currentPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentPosition >= 0 ? '+' : ''}${currentPosition.toFixed(2)}
              </span>
            </p>
          </div>

          {/* Check-in Wrapper with day toggle */}
          <CheckInWrapper
            userId={user.id}
            slug={slug}
            todayDate={today}
            yesterdayDate={yesterday}
            todayTasks={TASKS}
            yesterdayTasks={YESTERDAY_TASKS}
            isTodaySunday={isSunday}
            isYesterdaySunday={yesterdayWasSunday}
            todayCheckIn={existingCheckIn}
            yesterdayCheckIn={yesterdayCheckIn}
            canCorrectYesterday={canCorrectYesterday}
            totalPenalty={totalPenalty}
            currentPosition={currentPosition}
            poolTotal={poolTotal}
            groupSize={groupSize}
            groupAvgCompletionRate={groupAvgCompletionRate}
            groupAvgPenalty={groupAvgPenalty}
          />

          {/* Footer Link */}
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
