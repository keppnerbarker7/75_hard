"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  slug: string;
};

type CheckIn = {
  userId: string;
  task1: boolean;
  task2: boolean;
  task3: boolean;
  task4: boolean;
  task5: boolean;
};

type BulkDayEntryProps = {
  users: User[];
  startDate: Date;
};

const TASK_LABELS = [
  "📖 Read 5 pages",
  "🏃 Outdoor workout",
  "💪 Second workout",
  "💧 1 gallon water",
  "🥗 Follow diet",
];

export default function BulkDayEntry({ users, startDate }: BulkDayEntryProps) {
  const router = useRouter();

  // Calculate initial day offset to default to today
  const calculateInitialDayOffset = () => {
    const startDateStr = new Date(startDate).toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });

    const start = new Date(startDateStr);
    const today = new Date(todayStr);
    const daysPassed = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, daysPassed);
  };

  const [currentDayOffset, setCurrentDayOffset] = useState(calculateInitialDayOffset());
  const [checkIns, setCheckIns] = useState<Record<string, CheckIn>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Calculate current date
  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + currentDayOffset);
  const currentDateStr = currentDate.toLocaleDateString("en-CA");

  // Load existing check-ins for the current day
  useEffect(() => {
    const loadCheckInsForDay = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/checkins?date=${currentDateStr}`);
        if (response.ok) {
          const data = await response.json();
          const existingCheckIns: Record<string, CheckIn> = {};

          data.checkIns.forEach((checkIn: any) => {
            existingCheckIns[checkIn.userId] = {
              userId: checkIn.userId,
              task1: checkIn.task1,
              task2: checkIn.task2,
              task3: checkIn.task3,
              task4: checkIn.task4,
              task5: checkIn.task5,
            };
          });

          setCheckIns(existingCheckIns);
        }
      } catch (error) {
        console.error("Failed to load check-ins:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCheckInsForDay();
  }, [currentDayOffset, currentDateStr]);

  const handleTaskToggle = (userId: string, taskNum: number) => {
    setCheckIns((prev) => {
      const userCheckIn = prev[userId] || {
        userId,
        task1: false,
        task2: false,
        task3: false,
        task4: false,
        task5: false,
      };

      return {
        ...prev,
        [userId]: {
          ...userCheckIn,
          [`task${taskNum}`]: !userCheckIn[`task${taskNum}` as keyof CheckIn],
        },
      };
    });
  };

  const handleSubmitDay = async () => {
    if (Object.keys(checkIns).length === 0) {
      setMessage({
        type: "error",
        text: "Please check at least one task before saving",
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const responses = await Promise.all(
        Object.values(checkIns).map(async (checkIn) => {
          const response = await fetch("/api/admin/checkin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: checkIn.userId,
              date: currentDateStr,
              tasks: {
                1: checkIn.task1,
                2: checkIn.task2,
                3: checkIn.task3,
                4: checkIn.task4,
                5: checkIn.task5,
              },
            }),
          });

          const data = await response.json();
          return { success: response.ok, data };
        })
      );

      const successCount = responses.filter((r) => r.success).length;

      setMessage({
        type: "success",
        text: `✅ Saved ${successCount} check-ins for ${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      });

      // Refresh data
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save check-ins",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextDay = () => {
    setCurrentDayOffset((prev) => prev + 1);
    setMessage(null);
  };

  const goToPrevDay = () => {
    setCurrentDayOffset((prev) => Math.max(0, prev - 1));
    setMessage(null);
  };

  const completedUsersCount = Object.keys(checkIns).length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Day Navigator */}
      <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 md:gap-4 mb-4">
          <button
            onClick={goToPrevDay}
            disabled={currentDayOffset === 0}
            className={`px-3 md:px-6 py-2 md:py-3 rounded-lg font-bold transition-all text-sm md:text-base ${
              currentDayOffset === 0
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 text-white hover:bg-zinc-700"
            }`}
          >
            <span className="hidden sm:inline">← Prev Day</span>
            <span className="sm:hidden">←</span>
          </button>

          <div className="text-center flex-1">
            <p className="text-xs md:text-sm text-zinc-600 font-medium">Day {currentDayOffset + 1}</p>
            <p className="text-lg md:text-3xl font-bold text-zinc-900 mt-1">
              <span className="hidden sm:inline">
                {currentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="sm:hidden">
                {currentDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </p>
            <p className="text-xs md:text-sm text-zinc-500 mt-1">
              {completedUsersCount}/{users.length} entered
            </p>
          </div>

          <button
            onClick={goToNextDay}
            className="px-3 md:px-6 py-2 md:py-3 rounded-lg font-bold bg-zinc-900 text-white hover:bg-zinc-700 transition-all text-sm md:text-base"
          >
            <span className="hidden sm:inline">Next Day →</span>
            <span className="sm:hidden">→</span>
          </button>
        </div>

        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-center font-medium ${
              message.type === "success"
                ? "bg-green-50 border-2 border-green-200 text-green-800"
                : "bg-red-50 border-2 border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Table Grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
            <div className="text-zinc-600 font-medium text-sm md:text-base">Loading check-ins...</div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-zinc-900 text-white">
                <th className="px-3 md:px-6 py-3 md:py-4 text-left font-bold text-sm md:text-lg sticky left-0 bg-zinc-900 z-10">Name</th>
                {TASK_LABELS.map((label, index) => (
                  <th key={label} className="px-2 md:px-4 py-3 md:py-4 text-center font-semibold text-xs md:text-base">
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{["📖", "🏃", "💪", "💧", "🥗"][index]}</span>
                  </th>
                ))}
                <th className="px-3 md:px-6 py-3 md:py-4 text-center font-bold text-sm md:text-base">$</th>
              </tr>
            </thead>
          <tbody>
            {users.map((user, userIndex) => {
              const userCheckIn = checkIns[user.id] || {
                userId: user.id,
                task1: false,
                task2: false,
                task3: false,
                task4: false,
                task5: false,
              };

              const completedTasks = [
                userCheckIn.task1,
                userCheckIn.task2,
                userCheckIn.task3,
                userCheckIn.task4,
                userCheckIn.task5,
              ].filter(Boolean).length;

              const penalty = Math.min((5 - completedTasks) * 2, 10);
              const hasAnyChecked = completedTasks > 0;

              return (
                <tr
                  key={user.id}
                  className={`border-b border-zinc-200 ${
                    hasAnyChecked ? "bg-green-50" : userIndex % 2 === 0 ? "bg-white" : "bg-zinc-50"
                  }`}
                >
                  <td className="px-3 md:px-6 py-3 md:py-4 sticky left-0 z-10 bg-inherit">
                    <p className="font-bold text-zinc-900 text-sm md:text-lg">{user.name}</p>
                    <p className="text-xs md:text-sm text-zinc-500">{completedTasks}/5</p>
                  </td>
                  {[1, 2, 3, 4, 5].map((taskNum) => {
                    const isChecked = Boolean(
                      userCheckIn[`task${taskNum}` as keyof CheckIn]
                    );
                    return (
                      <td key={taskNum} className="px-2 md:px-4 py-3 md:py-4 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTaskToggle(user.id, taskNum)}
                            disabled={isSubmitting}
                            className="hidden"
                          />
                          <div
                            className={`w-8 h-8 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${
                              isChecked
                                ? "bg-green-500 hover:bg-green-600 shadow-md"
                                : "bg-zinc-200 hover:bg-zinc-300"
                            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {isChecked && (
                              <svg
                                className="w-5 h-5 md:w-7 md:h-7 text-white"
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
                            )}
                          </div>
                        </label>
                      </td>
                    );
                  })}
                  <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                    <span
                      className={`text-lg md:text-2xl font-bold ${
                        penalty === 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ${penalty}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <div className="p-4 md:p-6 bg-zinc-50 border-t-2 border-zinc-200">
          <button
            onClick={handleSubmitDay}
            disabled={isSubmitting || completedUsersCount === 0}
            className={`w-full py-3 md:py-4 px-4 md:px-6 rounded-xl font-bold text-sm md:text-lg transition-all ${
              isSubmitting || completedUsersCount === 0
                ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.99]"
            }`}
          >
            {isSubmitting
              ? "Saving..."
              : completedUsersCount === 0
              ? "Check tasks to save"
              : `💾 Save Day ${currentDayOffset + 1} (${completedUsersCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}
