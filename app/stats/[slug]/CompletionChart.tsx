"use client";

import { useState } from "react";

type ChartDataPoint = {
  day: number;
  tasksCompleted: number;
  date: string;
};

type CompletionChartProps = {
  chartData: ChartDataPoint[];
};

type ViewMode = "5" | "10" | "all";

export default function CompletionChart({ chartData }: CompletionChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("10");

  const getDaysToShow = () => {
    if (viewMode === "all") return chartData.length;
    return parseInt(viewMode);
  };

  const daysToShow = getDaysToShow();
  const startIdx = Math.max(0, chartData.length - daysToShow);
  const visibleData = chartData.slice(startIdx);

  const getLineColor = (tasksCompleted: number) => {
    if (tasksCompleted === 5) return "#22c55e";
    if (tasksCompleted >= 3) return "#3b82f6";
    return "#ef4444";
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-zinc-900">
          Daily Task Completion
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

      <div className="w-full -my-2">
        <svg
          viewBox="0 0 800 240"
          className="w-full h-auto"
          style={{ minHeight: "180px" }}
        >
          {/* Grid lines */}
          {[0, 1, 2, 3, 4, 5].map((taskCount) => (
            <g key={taskCount}>
              <line
                x1="80"
                y1={200 - (taskCount * 180) / 5}
                x2="770"
                y2={200 - (taskCount * 180) / 5}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x="60"
                y={200 - (taskCount * 180) / 5 + 5}
                fill="#6b7280"
                fontSize="15"
                fontWeight="600"
                textAnchor="end"
              >
                {taskCount}
              </text>
            </g>
          ))}

          {/* Colored line segments */}
          {visibleData.slice(0, -1).map((point, i) => {
            const nextPoint = visibleData[i + 1];
            const x1 = 80 + (i / (visibleData.length - 1 || 1)) * 690;
            const y1 = 200 - (point.tasksCompleted * 180) / 5;
            const x2 = 80 + ((i + 1) / (visibleData.length - 1 || 1)) * 690;
            const y2 = 200 - (nextPoint.tasksCompleted * 180) / 5;

            // Use the color of the starting point for the segment
            const color = getLineColor(point.tasksCompleted);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}

          {/* Data points */}
          {visibleData.map((point, i) => {
            const x = 80 + (i / (visibleData.length - 1 || 1)) * 690;
            const y = 200 - (point.tasksCompleted * 180) / 5;
            const color = getLineColor(point.tasksCompleted);

            return (
              <g key={i}>
                <circle cx={x} cy={y} r="6" fill={color} />
                <circle cx={x} cy={y} r="3" fill="white" />
              </g>
            );
          })}

          {/* X-axis labels */}
          {visibleData
            .filter((_, i) => {
              // Show all labels for 5 days, every other for 10, every few for more
              if (visibleData.length <= 5) return true;
              if (visibleData.length <= 10) return i % 2 === 0 || i === visibleData.length - 1;
              return i % Math.ceil(visibleData.length / 8) === 0 || i === visibleData.length - 1;
            })
            .map((point) => {
              const i = visibleData.indexOf(point);
              const x = 80 + (i / (visibleData.length - 1 || 1)) * 690;
              return (
                <text
                  key={i}
                  x={x}
                  y="225"
                  fill="#6b7280"
                  fontSize="15"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  Day {point.day}
                </text>
              );
            })}
        </svg>
      </div>

      <div className="flex justify-center gap-4 mt-1 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-zinc-600">5/5 tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-zinc-600">3-4 tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-zinc-600">&lt;3 tasks</span>
        </div>
      </div>
    </div>
  );
}
