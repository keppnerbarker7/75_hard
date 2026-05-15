"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  id: number;
  label: string;
};

type CheckInFormProps = {
  userId: string;
  slug: string;
  tasks: Task[];
  totalPenalty: number;
  currentPosition: number;
  poolTotal: number;
  groupSize: number;
  averagePenaltyForProjection: number;
  peopleNotCheckedInToday: number;
  projectionSource: string;
};

export default function CheckInForm({
  userId,
  slug,
  tasks,
  totalPenalty,
  currentPosition,
  poolTotal,
  groupSize,
  averagePenaltyForProjection,
  peopleNotCheckedInToday,
  projectionSource,
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
          userId,
          tasks: checkedTasks,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit check-in");
      }

      // Refresh the page to show the submitted state
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  const completedCount = Object.values(checkedTasks).filter(Boolean).length;
  const missedCount = 5 - completedCount;
  const estimatedPenalty = Math.min(missedCount * 2, 10);

  // Calculate estimated new position (Option 2b)
  // The pool currently has $10 for everyone who hasn't checked in (including you)
  // Remove all those $10 assumptions, then add back realistic estimates:
  // - Your actual penalty
  // - Average penalty for everyone else who hasn't checked in yet
  const totalPeopleNotCheckedIn = peopleNotCheckedInToday + 1; // +1 for you
  const newPoolTotal = poolTotal
    - (totalPeopleNotCheckedIn * 10) // Remove all $10 assumptions
    + estimatedPenalty // Add your actual penalty
    + (peopleNotCheckedInToday * averagePenaltyForProjection); // Add expected for others

  const newShare = newPoolTotal / groupSize;
  const newTotalPenalty = totalPenalty + estimatedPenalty; // Your actual recorded penalties
  const estimatedNewPosition = newShare - newTotalPenalty;

  return (
    <form onSubmit={handleSubmit}>
      {/* Tasks */}
      <div className="space-y-4 mb-8">
        {tasks.map((task) => (
          <label
            key={task.id}
            className={`flex items-center gap-4 p-6 rounded-xl border-2 cursor-pointer transition-all ${
              checkedTasks[task.id]
                ? "bg-green-50 border-green-500 shadow-sm"
                : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="flex-shrink-0">
              <input
                type="checkbox"
                checked={checkedTasks[task.id]}
                onChange={() => handleCheckboxChange(task.id)}
                className="hidden"
                disabled={isSubmitting}
              />
              <div
                className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                  checkedTasks[task.id]
                    ? "bg-green-500 border-green-500"
                    : "bg-white border-zinc-300"
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
              className={`text-lg font-medium ${
                checkedTasks[task.id] ? "text-green-900" : "text-zinc-900"
              }`}
            >
              {task.label}
            </span>
          </label>
        ))}
      </div>

      {/* Penalty Preview */}
      <div className="bg-zinc-100 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center text-sm text-zinc-600 mb-1">
          <span>Completed: {completedCount}/5</span>
          <span>Missed: {missedCount}</span>
        </div>
        <div className="flex justify-between items-center font-bold text-lg">
          <span className="text-zinc-900">Today's Penalty:</span>
          <span
            className={estimatedPenalty === 0 ? "text-green-600" : "text-red-600"}
          >
            ${estimatedPenalty}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-zinc-300">
          <span className="text-zinc-600">Current Position:</span>
          <span className={`font-bold ${currentPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {currentPosition >= 0 ? '+' : ''}${currentPosition.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-1">
          <span className="text-zinc-600">Est. New Position:</span>
          <span className={`font-bold ${estimatedNewPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {estimatedNewPosition >= 0 ? '+' : ''}${estimatedNewPosition.toFixed(2)}
          </span>
        </div>
        <div className="text-xs text-zinc-500 mt-2 italic">
          * Estimate based on {projectionSource}: ${averagePenaltyForProjection.toFixed(2)} avg penalty
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
          isSubmitting
            ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
            : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
        }`}
      >
        {isSubmitting ? "Submitting..." : "Submit Check-In"}
      </button>
    </form>
  );
}
