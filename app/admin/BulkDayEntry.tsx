"use client";

import { useState } from "react";
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
  "📖 Read",
  "🏃 Outdoor",
  "💪 Indoor",
  "💧 Water",
  "🥗 Diet",
];

export default function BulkDayEntry({ users, startDate }: BulkDayEntryProps) {
  const router = useRouter();
  const [currentDayOffset, setCurrentDayOffset] = useState(0);
  const [checkIns, setCheckIns] = useState<Record<string, CheckIn>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Calculate current date
  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + currentDayOffset);
  const currentDateStr = currentDate.toLocaleDateString("en-CA");

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
        text: `Successfully saved ${successCount} check-ins for ${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      });

      // Clear check-ins for next day
      setCheckIns({});

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
    setCheckIns({});
    setMessage(null);
  };

  const goToPrevDay = () => {
    setCurrentDayOffset((prev) => Math.max(0, prev - 1));
    setCheckIns({});
    setMessage(null);
  };

  const completedCount = Object.keys(checkIns).length;

  return (
    <div className="space-y-6">
      {/* Day Navigator */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevDay}
            disabled={currentDayOffset === 0}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentDayOffset === 0
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-800 text-white hover:bg-zinc-700"
            }`}
          >
            ← Previous Day
          </button>

          <div className="text-center">
            <p className="text-sm text-zinc-600">Day {currentDayOffset + 1}</p>
            <p className="text-2xl font-bold text-zinc-900">
              {currentDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <button
            onClick={goToNextDay}
            className="px-4 py-2 rounded-lg font-medium bg-zinc-800 text-white hover:bg-zinc-700"
          >
            Next Day →
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 px-4 py-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Bulk Entry Grid */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-900">
            Check-Ins for All Users
          </h2>
          <div className="text-sm text-zinc-600">
            {completedCount} of {users.length} entered
          </div>
        </div>

        <div className="space-y-4">
          {users.map((user) => {
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

            return (
              <div
                key={user.id}
                className={`border-2 rounded-lg p-4 transition-colors ${
                  completedTasks > 0
                    ? "border-green-200 bg-green-50"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-zinc-900 text-lg">
                    {user.name}
                  </h3>
                  <div className="text-right">
                    <p className="text-sm text-zinc-600">
                      {completedTasks}/5 tasks
                    </p>
                    <p
                      className={`font-bold text-lg ${
                        penalty === 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ${penalty}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((taskNum) => {
                    const isChecked = Boolean(
                      userCheckIn[`task${taskNum}` as keyof CheckIn]
                    );
                    return (
                      <label
                        key={taskNum}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isChecked
                            ? "border-green-500 bg-green-100"
                            : "border-zinc-300 bg-white hover:border-zinc-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTaskToggle(user.id, taskNum)}
                          className="hidden"
                          disabled={isSubmitting}
                        />
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                            isChecked ? "bg-green-500" : "bg-zinc-200"
                          }`}
                        >
                          {isChecked && (
                            <svg
                              className="w-5 h-5 text-white"
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
                        <span
                          className={`text-xs font-medium ${
                            isChecked ? "text-green-900" : "text-zinc-600"
                          }`}
                        >
                          {TASK_LABELS[taskNum - 1]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmitDay}
          disabled={isSubmitting || completedCount === 0}
          className={`w-full mt-6 py-4 px-6 rounded-xl font-bold text-lg transition-all ${
            isSubmitting || completedCount === 0
              ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
              : "bg-zinc-900 text-white hover:bg-zinc-800"
          }`}
        >
          {isSubmitting
            ? "Saving..."
            : `Save Day ${currentDayOffset + 1} (${completedCount} check-ins)`}
        </button>
      </div>
    </div>
  );
}
