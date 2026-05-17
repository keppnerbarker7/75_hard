"use client";

import { useState } from "react";

type CheckIn = {
  id: string;
  date: string;
  task1: boolean;
  task2: boolean;
  task3: boolean;
  task4: boolean;
  task5: boolean;
  penalty: number;
  isAutoFilled: boolean;
};

type RecentCheckInsProps = {
  checkIns: CheckIn[];
};

type ViewMode = "5" | "all";

export default function RecentCheckIns({ checkIns }: RecentCheckInsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("5");

  const getCheckInsToShow = () => {
    if (viewMode === "all") return checkIns;
    return checkIns.slice(-5);
  };

  const checkInsToShow = getCheckInsToShow();

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-zinc-900">Recent Check-Ins</h2>
        <div className="flex items-center gap-2 bg-zinc-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("5")}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              viewMode === "5"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Last 5
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              viewMode === "all"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            All Days
          </button>
        </div>
      </div>

      <div className={`space-y-2 ${viewMode === "all" ? "max-h-[600px] overflow-y-auto pr-2" : ""}`}>
        {checkInsToShow
          .slice()
          .reverse()
          .map((checkIn) => {
            const date = new Date(checkIn.date);
            const isSunday = date.getDay() === 0;

            // On Sundays, show Walk instead of two workouts
            const tasks = isSunday
              ? [
                  { emoji: "📖", completed: checkIn.task1, name: "Read" },
                  { emoji: "🚶", completed: checkIn.task2, name: "Walk" },
                  { emoji: "💧", completed: checkIn.task4, name: "Water" },
                  { emoji: "🥗", completed: checkIn.task5, name: "Diet" },
                ]
              : [
                  { emoji: "📖", completed: checkIn.task1, name: "Read" },
                  { emoji: "🏃", completed: checkIn.task2, name: "Workout 1" },
                  { emoji: "💪", completed: checkIn.task3, name: "Workout 2" },
                  { emoji: "💧", completed: checkIn.task4, name: "Water" },
                  { emoji: "🥗", completed: checkIn.task5, name: "Diet" },
                ];

            return (
              <div
                key={checkIn.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                  checkIn.penalty === 0
                    ? "border-green-300 bg-green-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xs font-semibold text-zinc-600 w-16">
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
                          task.completed
                            ? "bg-green-600 text-white"
                            : "bg-zinc-300 text-zinc-500 opacity-40"
                        }`}
                        title={task.name}
                      >
                        <span className="text-sm">{task.emoji}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {checkIn.isAutoFilled && (
                    <span className="text-xs text-orange-600 font-semibold">
                      Auto
                    </span>
                  )}
                  <span
                    className={`text-lg font-bold ${
                      checkIn.penalty === 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    ${checkIn.penalty}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
