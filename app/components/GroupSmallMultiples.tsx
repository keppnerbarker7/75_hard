"use client";

import { useState } from "react";

type CheckIn = {
  date: string;
  task1: boolean;
  task2: boolean;
  task3: boolean;
  task4: boolean;
  task5: boolean;
  penalty: number;
};

type User = {
  name: string;
  slug: string;
  checkIns: CheckIn[];
};

type GroupSmallMultiplesProps = {
  users: User[];
  groupStartDate: Date;
};

type ViewMode = "5" | "10" | "all";

const USER_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export default function GroupSmallMultiples({ users, groupStartDate }: GroupSmallMultiplesProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("10");

  // Calculate the actual day number from a date string
  const getDayNumber = (dateStr: string): number => {
    const startDateStr = new Date(groupStartDate).toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });
    const startDate = new Date(startDateStr);
    const checkInDate = new Date(dateStr);
    const daysDiff = Math.floor(
      (checkInDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysDiff + 1; // Day 1, Day 2, etc.
  };

  // Find the maximum day number across all users
  const maxDayNumber = Math.max(
    ...users.flatMap(u => u.checkIns.map(c => getDayNumber(c.date))),
    0
  );

  const getDaysToShow = () => {
    if (viewMode === "all") return maxDayNumber;
    return Math.min(parseInt(viewMode), maxDayNumber);
  };

  const daysToShow = getDaysToShow();

  // Calculate the day range to show (last N days)
  const maxDay = maxDayNumber;
  const minDay = Math.max(1, maxDay - daysToShow + 1);

  const getLineColor = (tasksCompleted: number) => {
    if (tasksCompleted === 5) return "#22c55e";
    if (tasksCompleted >= 3) return "#3b82f6";
    return "#ef4444";
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-zinc-900">
          Progress Overview
        </h2>
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
            onClick={() => setViewMode("10")}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              viewMode === "10"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Last 10
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              viewMode === "all"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user, userIdx) => {
          // Filter check-ins to only those in the day range we want to show
          const relevantCheckIns = user.checkIns
            .map(checkIn => ({
              ...checkIn,
              dayNumber: getDayNumber(checkIn.date),
            }))
            .filter(checkIn => checkIn.dayNumber >= minDay && checkIn.dayNumber <= maxDay);

          const chartData = relevantCheckIns.map((checkIn) => {
            const tasksCompleted = [
              checkIn.task1,
              checkIn.task2,
              checkIn.task3,
              checkIn.task4,
              checkIn.task5,
            ].filter(Boolean).length;

            return {
              day: checkIn.dayNumber,
              tasksCompleted: tasksCompleted,
            };
          });

          const visibleDays = chartData.length;

          return (
            <div key={user.slug} className="bg-zinc-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-zinc-900 text-sm">{user.name}</h3>
                <div className="text-xs text-zinc-500">
                  {chartData.length} {chartData.length === 1 ? "day" : "days"}
                </div>
              </div>

              <svg
                viewBox="0 0 280 80"
                className="w-full h-auto"
                style={{ minHeight: "50px" }}
              >
                {/* Grid lines */}
                {[0, 1, 2, 3, 4, 5].map((taskCount) => (
                  <g key={taskCount}>
                    <line
                      x1="30"
                      y1={65 - (taskCount * 50) / 5}
                      x2="270"
                      y2={65 - (taskCount * 50) / 5}
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                    <text
                      x="20"
                      y={65 - (taskCount * 50) / 5 + 3}
                      fill="#9ca3af"
                      fontSize="10"
                      fontWeight="500"
                      textAnchor="end"
                    >
                      {taskCount}
                    </text>
                  </g>
                ))}

                {/* Colored line segments */}
                {chartData.length > 1 && chartData.slice(0, -1).map((point, i) => {
                  const nextPoint = chartData[i + 1];
                  // Position based on actual day numbers within the range
                  const dayRange = maxDay - minDay;
                  const x1 = dayRange === 0
                    ? 150
                    : 30 + ((point.day - minDay) / dayRange) * 240;
                  const y1 = 65 - (point.tasksCompleted * 50) / 5;
                  const x2 = dayRange === 0
                    ? 150
                    : 30 + ((nextPoint.day - minDay) / dayRange) * 240;
                  const y2 = 65 - (nextPoint.tasksCompleted * 50) / 5;

                  const color = getLineColor(point.tasksCompleted);

                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Data points */}
                {chartData.map((point, i) => {
                  // Position based on actual day number within the range
                  const dayRange = maxDay - minDay;
                  const x = dayRange === 0
                    ? 150  // Center of small chart (30 + 240/2)
                    : 30 + ((point.day - minDay) / dayRange) * 240;
                  const y = 65 - (point.tasksCompleted * 50) / 5;
                  const color = getLineColor(point.tasksCompleted);

                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="3.5" fill={color} />
                      <circle cx={x} cy={y} r="1.5" fill="white" />
                    </g>
                  );
                })}

                {/* X-axis labels - show consistent day range for all users */}
                {chartData.length > 0 && (
                  <>
                    <text
                      x="30"
                      y="75"
                      fill="#9ca3af"
                      fontSize="10"
                      fontWeight="500"
                      textAnchor="start"
                    >
                      D{minDay}
                    </text>
                    {daysToShow > 1 && (
                      <text
                        x="270"
                        y="75"
                        fill="#9ca3af"
                        fontSize="10"
                        fontWeight="500"
                        textAnchor="end"
                      >
                        D{maxDay}
                      </text>
                    )}
                  </>
                )}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
