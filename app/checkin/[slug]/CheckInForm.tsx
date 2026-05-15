"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  id: number;
  label: string;
};

type CheckInFormProps = {
  slug: string;
  tasks: readonly Task[];
  totalPenalty: number;
  currentPosition: number;
  poolTotal: number;
  groupSize: number;
  groupAvgCompletionRate: number;
  groupAvgPenalty: number;
  targetDate: string;
  mode: "today" | "correct";
  existingPenalty: number;
};

export default function CheckInForm({
  slug,
  tasks,
  totalPenalty,
  currentPosition,
  poolTotal,
  groupSize,
  groupAvgCompletionRate,
  groupAvgPenalty,
  targetDate,
  mode,
  existingPenalty,
}: CheckInFormProps) {
  const router = useRouter();
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckboxChange = (taskId: number) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          date: targetDate,
          mode,
          tasks: checkedTasks,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit check-in");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  const completedCount = Object.values(checkedTasks).filter(Boolean).length;
  const missedCount = 5 - completedCount;
  const estimatedPenalty = Math.min(missedCount * 2, 10);
  const othersExpectedPenalties = (groupSize - 1) * groupAvgPenalty;
  const newPoolTotal =
    mode === "correct"
      ? poolTotal - existingPenalty + estimatedPenalty
      : poolTotal + estimatedPenalty + othersExpectedPenalties;
  const newShare = newPoolTotal / groupSize;
  const newTotalPenalty =
    mode === "correct"
      ? totalPenalty - existingPenalty + estimatedPenalty
      : totalPenalty + estimatedPenalty;
  const estimatedNewPosition = newShare - newTotalPenalty;

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 mb-8">
        {tasks.map((task) => (
          <label
            key={task.id}
            className={`group flex items-center gap-4 p-5 md:p-6 rounded-[1.5rem] border cursor-pointer transition-all ${
              checkedTasks[task.id]
                ? "bg-[#e5f3eb] border-[#79a98f] shadow-[0_10px_30px_rgba(53,86,72,0.12)]"
                : "bg-white/75 border-[var(--stroke)] hover:border-[var(--accent)]"
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white font-display text-2xl">
              {task.id}
            </div>
            <div className="flex-shrink-0">
              <input
                type="checkbox"
                checked={checkedTasks[task.id]}
                onChange={() => handleCheckboxChange(task.id)}
                className="hidden"
                disabled={isSubmitting}
              />
              <div
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
                  checkedTasks[task.id]
                    ? "bg-[var(--olive)] border-[var(--olive)]"
                    : "bg-white border-zinc-300 group-hover:border-[var(--accent)]"
                }`}
              >
                {checkedTasks[task.id] && (
                  <svg
                    className="w-6 h-6 text-white"
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
            </div>
            <span
              className={`text-base font-medium ${
                checkedTasks[task.id] ? "text-green-900" : "text-zinc-900"
              }`}
            >
              {task.label}
            </span>
            <span
              className={`ml-auto rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                checkedTasks[task.id]
                  ? "bg-[#cfe5d8] text-[var(--olive)]"
                  : "bg-[#f1e8da] text-[var(--accent-dark)]"
              }`}
            >
              {checkedTasks[task.id] ? "done" : "open"}
            </span>
          </label>
        ))}
      </div>

      <div className="rounded-[1.5rem] bg-zinc-950 text-white p-5 mb-6 shadow-[0_20px_50px_rgba(18,15,11,0.22)]">
        <div className="flex justify-between items-center text-sm text-white/60 mb-1">
          <span>Completed: {completedCount}/5</span>
          <span>Missed: {missedCount}</span>
        </div>
        <div className="flex justify-between items-center font-bold text-lg">
          <span className="text-white">
            {mode === "correct" ? "Corrected Penalty:" : "Today's Penalty:"}
          </span>
          <span
            className={estimatedPenalty === 0 ? "text-[#b9f0d1]" : "text-[#f4d5b1]"}
          >
            ${estimatedPenalty}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-white/10">
          <span className="text-white/60">Current Position:</span>
          <span
            className={`font-bold ${
              currentPosition >= 0 ? "text-[#b9f0d1]" : "text-[#f4d5b1]"
            }`}
          >
            {currentPosition >= 0 ? "+" : ""}${currentPosition.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-1">
          <span className="text-white/60">Est. New Position:</span>
          <span
            className={`font-bold ${
              estimatedNewPosition >= 0 ? "text-[#b9f0d1]" : "text-[#f4d5b1]"
            }`}
          >
            {estimatedNewPosition >= 0 ? "+" : ""}$
            {estimatedNewPosition.toFixed(2)}
          </span>
        </div>
        <div className="text-xs text-white/45 mt-3 italic">
          * Estimate only shows your impact. Group avg:{" "}
          {Math.round(groupAvgCompletionRate * 100)}% completion ($
          {groupAvgPenalty.toFixed(2)} penalty)
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-4 px-6 rounded-[1.4rem] font-display uppercase tracking-[0.06em] text-xl transition-all ${
          isSubmitting
            ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
            : mode === "correct"
            ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] active:scale-[0.98]"
            : "bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]"
        }`}
      >
        {isSubmitting
          ? mode === "correct"
            ? "Updating..."
            : "Submitting..."
          : mode === "correct"
          ? "Save Correction"
          : "Submit Check-In"}
      </button>
    </form>
  );
}
