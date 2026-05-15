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

export default function GroupSmallMultiples({ users }: GroupSmallMultiplesProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("10");

  const getDaysToShow = () => {
    const maxDays = Math.max(...users.map(u => u.checkIns.length));
    if (viewMode === "all") return maxDays;
    return parseInt(viewMode);
  };

  const daysToShow = getDaysToShow();
  const maxDays = Math.max(...users.map(u => u.checkIns.length));
  const startIdx = Math.max(0, maxDays - daysToShow);

  const getLineColor = (completionRate: number) => {
    if (completionRate === 100) return "#22c55e";
    if (completionRate >= 60) return "#3b82f6";
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
          const recentCheckIns = user.checkIns.slice(startIdx);

          const chartData = recentCheckIns.map((checkIn, index) => {
            const tasksCompleted = [
              checkIn.task1,
              checkIn.task2,
              checkIn.task3,
              checkIn.task4,
              checkIn.task5,
            ].filter(Boolean).length;

            return {
              day: startIdx + index + 1,
              completionRate: (tasksCompleted / 5) * 100,
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
                {[0, 50, 100].map((percent) => (
                  <g key={percent}>
                    <line
                      x1="30"
                      y1={65 - (percent * 50) / 100}
                      x2="270"
                      y2={65 - (percent * 50) / 100}
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                    <text
                      x="20"
                      y={65 - (percent * 50) / 100 + 3}
                      fill="#9ca3af"
                      fontSize="10"
                      fontWeight="500"
                      textAnchor="end"
                    >
                      {percent}
                    </text>
                  </g>
                ))}

                {/* Colored line segments */}
                {chartData.slice(0, -1).map((point, i) => {
                  const nextPoint = chartData[i + 1];
                  const x1 = 30 + (i / (visibleDays - 1 || 1)) * 240;
                  const y1 = 65 - (point.completionRate * 50) / 100;
                  const x2 = 30 + ((i + 1) / (visibleDays - 1 || 1)) * 240;
                  const y2 = 65 - (nextPoint.completionRate * 50) / 100;

                  const color = getLineColor(point.completionRate);

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
                  const x = 30 + (i / (visibleDays - 1 || 1)) * 240;
                  const y = 65 - (point.completionRate * 50) / 100;
                  const color = getLineColor(point.completionRate);

                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="3.5" fill={color} />
                      <circle cx={x} cy={y} r="1.5" fill="white" />
                    </g>
                  );
                })}

                {/* X-axis labels - only show first and last day */}
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
                      D{chartData[0].day}
                    </text>
                    {chartData.length > 1 && (
                      <text
                        x="270"
                        y="75"
                        fill="#9ca3af"
                        fontSize="10"
                        fontWeight="500"
                        textAnchor="end"
                      >
                        D{chartData[chartData.length - 1].day}
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
