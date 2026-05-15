"use client";

import { useState } from "react";

type ChartDataPoint = {
  day: number;
  completionRate: number;
  date: string;
};

type CompletionChartProps = {
  chartData: ChartDataPoint[];
};

type ViewMode = "5" | "10" | "all";

export default function CompletionChart({ chartData }: CompletionChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("5");

  const getDaysToShow = () => {
    if (viewMode === "all") return chartData.length;
    return parseInt(viewMode);
  };

  const daysToShow = getDaysToShow();
  const startIdx = Math.max(0, chartData.length - daysToShow);
  const visibleData = chartData.slice(startIdx);

  const getLineColor = (completionRate: number) => {
    if (completionRate === 100) return "#22c55e";
    if (completionRate >= 60) return "#3b82f6";
    return "#ef4444";
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-zinc-900">
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

      <div className="w-full">
        <svg
          viewBox="0 0 800 280"
          className="w-full h-auto"
          style={{ minHeight: "220px" }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <g key={percent}>
              <line
                x1="80"
                y1={230 - (percent * 200) / 100}
                x2="770"
                y2={230 - (percent * 200) / 100}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x="60"
                y={230 - (percent * 200) / 100 + 6}
                fill="#6b7280"
                fontSize="16"
                fontWeight="600"
                textAnchor="end"
              >
                {percent}%
              </text>
            </g>
          ))}

          {/* Colored line segments */}
          {visibleData.slice(0, -1).map((point, i) => {
            const nextPoint = visibleData[i + 1];
            const x1 = 80 + (i / (visibleData.length - 1 || 1)) * 690;
            const y1 = 230 - (point.completionRate * 200) / 100;
            const x2 = 80 + ((i + 1) / (visibleData.length - 1 || 1)) * 690;
            const y2 = 230 - (nextPoint.completionRate * 200) / 100;

            // Use the color of the starting point for the segment
            const color = getLineColor(point.completionRate);

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
            const y = 230 - (point.completionRate * 200) / 100;
            const color = getLineColor(point.completionRate);

            return (
              <g key={i}>
                <circle cx={x} cy={y} r="7" fill={color} />
                <circle cx={x} cy={y} r="4" fill="white" />
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
                  y="260"
                  fill="#6b7280"
                  fontSize="16"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  Day {point.day}
                </text>
              );
            })}
        </svg>
      </div>

      <div className="flex justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-zinc-600">100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-zinc-600">60-99%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-zinc-600">&lt;60%</span>
        </div>
      </div>
    </div>
  );
}
