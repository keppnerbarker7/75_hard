import { prisma } from "@/lib/prisma";
import AdminForm from "./AdminForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Fetch all users
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      group: true,
    },
  });

  // Fetch all check-ins
  const checkIns = await prisma.checkIn.findMany({
    include: {
      user: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  type CheckInWithUser = typeof checkIns[number];

  const group = users[0]?.group;

  // Calculate the date range for days 1-10 (May 4 - May 13, 2026)
  const startDate = new Date(group?.startDate || "2026-05-04");
  const backfillDates: string[] = [];

  for (let i = 0; i < 10; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    backfillDates.push(
      date.toLocaleDateString("en-CA", { timeZone: "America/Denver" })
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">Admin Panel</h1>
              <p className="text-zinc-600 mt-1">
                Backfill check-ins and manage data
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              ← Dashboard
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Check-in Form */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              Add Check-In
            </h2>
            <AdminForm users={users} backfillDates={backfillDates} />
          </div>

          {/* Existing Check-ins */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              Recent Check-Ins ({checkIns.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {checkIns.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">
                  No check-ins yet
                </p>
              ) : (
                checkIns.map((checkIn: CheckInWithUser) => {
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
                      className="border border-zinc-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-zinc-900">
                            {checkIn.user.name}
                          </p>
                          <p className="text-sm text-zinc-600">
                            {new Date(checkIn.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-zinc-600">
                            {completedTasks}/5 tasks
                          </p>
                          <p
                            className={`font-bold ${
                              checkIn.penalty === 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ${checkIn.penalty}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[
                          checkIn.task1,
                          checkIn.task2,
                          checkIn.task3,
                          checkIn.task4,
                          checkIn.task5,
                        ].map((completed, i) => (
                          <div
                            key={i}
                            className={`flex-1 h-2 rounded ${
                              completed ? "bg-green-500" : "bg-zinc-200"
                            }`}
                          />
                        ))}
                      </div>
                      {checkIn.isAutoFilled && (
                        <p className="text-xs text-orange-600 mt-2">
                          Auto-filled
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Backfill Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
          <h3 className="font-bold text-blue-900 mb-2">
            📅 Days 1-10 Backfill Dates
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            Use these dates for backfilling the first 10 days:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {backfillDates.map((date, index) => (
              <div
                key={date}
                className="bg-white rounded px-3 py-2 text-center border border-blue-200"
              >
                <p className="text-xs text-blue-600 font-medium">Day {index + 1}</p>
                <p className="text-sm font-bold text-blue-900">
                  {new Date(date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
