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

  const daysToShow = viewMode === "all" ? chartData.length : parseInt(viewMode, 10);
  const startIdx = Math.max(0, chartData.length - daysToShow);
  const visibleData = chartData.slice(startIdx);

  const getLineColor = (tasksCompleted: number) => {
    if (tasksCompleted === 5) return "#b4d07f";
    if (tasksCompleted >= 3) return "#f7efd9";
    return "#ff5a36";
  };

  return (
    <div className="paper-panel rounded-[2rem] p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-3xl uppercase text-[var(--sand)]">
          Daily Task Completion
        </h2>
        <div className="flex items-center gap-2 bg-white/6 rounded-lg p-1">
          {(["5", "10", "all"] as ViewMode[]).map((option) => (
            <button
              key={option}
              onClick={() => setViewMode(option)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                viewMode === option
                  ? "bg-[var(--sand)] text-zinc-950 shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--sand)]"
              }`}
            >
              {option === "all" ? "All Time" : `Last ${option}`}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full -my-2">
        <svg viewBox="0 0 800 240" className="w-full h-auto" style={{ minHeight: "180px" }}>
          {[0, 1, 2, 3, 4, 5].map((taskCount) => (
            <g key={taskCount}>
              <line
                x1="80"
                y1={200 - (taskCount * 180) / 5}
                x2="770"
                y2={200 - (taskCount * 180) / 5}
                stroke="rgba(247,239,217,0.12)"
                strokeWidth="1"
              />
              <text
                x="60"
                y={200 - (taskCount * 180) / 5 + 5}
                fill="rgba(247,239,217,0.55)"
                fontSize="15"
                fontWeight="600"
                textAnchor="end"
              >
                {taskCount}
              </text>
            </g>
          ))}

          {visibleData.slice(0, -1).map((point, i) => {
            const nextPoint = visibleData[i + 1];
            const x1 = 80 + (i / (visibleData.length - 1 || 1)) * 690;
            const y1 = 200 - (point.tasksCompleted * 180) / 5;
            const x2 = 80 + ((i + 1) / (visibleData.length - 1 || 1)) * 690;
            const y2 = 200 - (nextPoint.tasksCompleted * 180) / 5;

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={getLineColor(point.tasksCompleted)}
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}

          {visibleData.map((point, i) => {
            const x = 80 + (i / (visibleData.length - 1 || 1)) * 690;
            const y = 200 - (point.tasksCompleted * 180) / 5;
            const color = getLineColor(point.tasksCompleted);

            return (
              <g key={i}>
                <circle cx={x} cy={y} r="6" fill={color} />
                <circle cx={x} cy={y} r="3" fill="#0d0d0a" />
              </g>
            );
          })}

          {visibleData
            .filter((_, i) => {
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
                  fill="rgba(247,239,217,0.55)"
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
          <div className="w-3 h-3 rounded-full bg-[var(--olive)]"></div>
          <span className="text-[var(--muted)]">5/5 tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--sand)]"></div>
          <span className="text-[var(--muted)]">3-4 tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--accent)]"></div>
          <span className="text-[var(--muted)]">&lt;3 tasks</span>
        </div>
      </div>
    </div>
  );
}
