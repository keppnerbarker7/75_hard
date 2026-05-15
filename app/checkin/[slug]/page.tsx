import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInForm from "./CheckInForm";

const TASKS = [
  { id: 1, label: "Read at least 5 pages (physical book)" },
  { id: 2, label: "Outdoor workout — 45 min" },
  { id: 3, label: "Second workout — 45 min" },
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

  // Check if user has already checked in today
  const existingCheckIn = await prisma.checkIn.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
  });

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
  const daysPassed = Math.floor(
    (todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1; // +1 to include start day

  // Calculate total pool including penalties for unrecorded days
  const recordedPenalties = allUsers.reduce((sum, u) => {
    return sum + u.checkIns.reduce((s, c) => s + c.penalty, 0);
  }, 0);

  const totalRecordedDays = allUsers.reduce((sum, u) => sum + u.checkIns.length, 0);
  const expectedTotalDays = daysPassed * groupSize;
  const missingDays = expectedTotalDays - totalRecordedDays;
  const unrecordedPenalties = missingDays * 10;

  const poolTotal = recordedPenalties + unrecordedPenalties;

  // Calculate user's current position
  const share = poolTotal / groupSize;
  const currentPosition = share - totalPenalty;

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

          {existingCheckIn ? (
            /* Already Submitted State */
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
                  <svg
                    className="w-12 h-12 text-green-600"
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
                <h2 className="text-2xl font-bold text-green-900 mb-2">
                  Already Checked In
                </h2>
                <p className="text-green-700">
                  You completed your check-in today at{" "}
                  {new Date(existingCheckIn.submittedAt).toLocaleTimeString(
                    "en-US",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/Denver",
                    }
                  )}{" "}
                  MT
                </p>
              </div>

              {/* Show what was completed */}
              <div className="space-y-3">
                {TASKS.map((task) => {
                  const completed =
                    existingCheckIn[
                      `task${task.id}` as keyof typeof existingCheckIn
                    ];
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

              <div className="mt-6 pt-6 border-t border-green-200 text-center">
                <p className="text-lg font-bold text-green-900">
                  Today's Penalty: ${existingCheckIn.penalty}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Running Total: ${totalPenalty}
                </p>
              </div>
            </div>
          ) : (
            /* Check-in Form */
            <CheckInForm
              userId={user.id}
              slug={slug}
              tasks={TASKS}
              totalPenalty={totalPenalty}
              currentPosition={currentPosition}
              share={share}
            />
          )}

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
