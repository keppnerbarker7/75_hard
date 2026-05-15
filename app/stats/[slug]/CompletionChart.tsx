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

export default function CompletionChart({ chartData }: CompletionChartProps) {
  const DAYS_TO_SHOW = 5;
  const [currentPage, setCurrentPage] = useState(
    Math.max(0, Math.ceil(chartData.length / DAYS_TO_SHOW) - 1)
  );

  const totalPages = Math.ceil(chartData.length / DAYS_TO_SHOW);
  const startIdx = currentPage * DAYS_TO_SHOW;
  const endIdx = Math.min(startIdx + DAYS_TO_SHOW, chartData.length);
  const visibleData = chartData.slice(startIdx, endIdx);

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
              currentPage === 0
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 text-white hover:bg-zinc-700"
            }`}
          >
            ← Prev
          </button>
          <span className="text-sm text-zinc-600">
            Days {startIdx + 1}-{endIdx}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages - 1}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
              currentPage === totalPages - 1
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 text-white hover:bg-zinc-700"
            }`}
          >
            Next →
          </button>
        </div>
      </div>

      <div className="w-full">
        <svg
          viewBox="0 0 800 350"
          className="w-full h-auto"
          style={{ minHeight: "250px" }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <g key={percent}>
              <line
                x1="80"
                y1={280 - (percent * 240) / 100}
                x2="770"
                y2={280 - (percent * 240) / 100}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x="60"
                y={280 - (percent * 240) / 100 + 6}
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
            const x1 = 80 + (i / (DAYS_TO_SHOW - 1)) * 690;
            const y1 = 280 - (point.completionRate * 240) / 100;
            const x2 = 80 + ((i + 1) / (DAYS_TO_SHOW - 1)) * 690;
            const y2 = 280 - (nextPoint.completionRate * 240) / 100;

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
            const x = 80 + (i / (DAYS_TO_SHOW - 1)) * 690;
            const y = 280 - (point.completionRate * 240) / 100;
            const color = getLineColor(point.completionRate);

            return (
              <g key={i}>
                <circle cx={x} cy={y} r="7" fill={color} />
                <circle cx={x} cy={y} r="4" fill="white" />
              </g>
            );
          })}

          {/* X-axis labels */}
          {visibleData.map((point, i) => {
            const x = 80 + (i / (DAYS_TO_SHOW - 1)) * 690;
            return (
              <text
                key={i}
                x={x}
                y="320"
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

      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-zinc-600 font-medium">100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span className="text-zinc-600 font-medium">60-99%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-zinc-600 font-medium">&lt;60%</span>
        </div>
      </div>
    </div>
  );
}
