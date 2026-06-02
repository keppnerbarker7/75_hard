import { prisma } from "@/lib/prisma";
import BulkDayEntry from "./BulkDayEntry";

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
  const startDate = new Date(group?.startDate || "2026-05-04");

  return (
    <div className="min-h-screen bg-zinc-100 py-6 md:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl p-4 md:p-6 mb-6 md:mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Admin Panel</h1>
              <p className="text-zinc-600 mt-1 text-sm md:text-base">
                Backfill check-ins and manage data
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm md:text-base whitespace-nowrap"
            >
              ← Dashboard
            </a>
          </div>
        </div>

        {/* Bulk Day Entry */}
        <BulkDayEntry users={users} startDate={startDate} />

        {/* Recent Check-ins */}
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm mt-6 md:mt-8">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-3 md:mb-4">
            Recent Check-Ins ({checkIns.length})
          </h2>
          <div className="space-y-2 md:space-y-3 max-h-[600px] overflow-y-auto">
            {checkIns.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">
                No check-ins yet
              </p>
            ) : (
              checkIns.slice(0, 20).map((checkIn: CheckInWithUser) => {
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
                    className="border border-zinc-200 rounded-lg p-3 md:p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-zinc-900 text-sm md:text-base">
                          {checkIn.user.name}
                        </p>
                        <p className="text-xs md:text-sm text-zinc-600">
                          {new Date(checkIn.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs md:text-sm text-zinc-600">
                          {completedTasks}/5
                        </p>
                        <p
                          className={`font-bold text-sm md:text-base ${
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
    </div>
  );
}
