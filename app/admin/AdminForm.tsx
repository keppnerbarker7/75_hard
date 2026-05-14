"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  slug: string;
};

type AdminFormProps = {
  users: User[];
  backfillDates: string[];
};

const TASKS = [
  { id: 1, label: "📖 Read 5 pages" },
  { id: 2, label: "🏃 Outdoor workout" },
  { id: 3, label: "💪 Second workout" },
  { id: 4, label: "💧 1 gallon water" },
  { id: 5, label: "🥗 Diet" },
];

export default function AdminForm({ users, backfillDates }: AdminFormProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [tasks, setTasks] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleTaskToggle = (taskId: number) => {
    setTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedUserId || !selectedDate) {
      setMessage({ type: "error", text: "Please select a user and date" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
          date: selectedDate,
          tasks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create check-in");
      }

      setMessage({
        type: "success",
        text: `Check-in added! Penalty: $${data.checkIn.penalty}`,
      });

      // Reset form
      setTasks({
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
      });

      // Refresh the page to show the new check-in
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = Object.values(tasks).filter(Boolean).length;
  const penalty = Math.min((5 - completedCount) * 2, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* User Selection */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          User
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          disabled={isSubmitting}
        >
          <option value="">Select a user...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Date
        </label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          disabled={isSubmitting}
        >
          <option value="">Select a date...</option>
          <optgroup label="Days 1-10 (Backfill)">
            {backfillDates.map((date, index) => (
              <option key={date} value={date}>
                Day {index + 1} -{" "}
                {new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </option>
            ))}
          </optgroup>
          <optgroup label="Other Date">
            <option value="custom">Custom date...</option>
          </optgroup>
        </select>
      </div>

      {/* Custom Date Input */}
      {selectedDate === "custom" && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Custom Date (YYYY-MM-DD)
          </label>
          <input
            type="date"
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Task Checkboxes */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Completed Tasks
        </label>
        <div className="space-y-2">
          {TASKS.map((task) => (
            <label
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                tasks[task.id]
                  ? "bg-green-50 border-green-500"
                  : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <input
                type="checkbox"
                checked={tasks[task.id]}
                onChange={() => handleTaskToggle(task.id)}
                disabled={isSubmitting}
                className="w-5 h-5 rounded border-zinc-300 text-green-600 focus:ring-2 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-zinc-900">
                {task.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Penalty Preview */}
      <div className="bg-zinc-100 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-600">
            Completed: {completedCount}/5
          </span>
          <span
            className={`font-bold text-lg ${
              penalty === 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            Penalty: ${penalty}
          </span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !selectedUserId || !selectedDate}
        className={`w-full py-3 px-6 rounded-lg font-bold transition-all ${
          isSubmitting || !selectedUserId || !selectedDate
            ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
            : "bg-zinc-900 text-white hover:bg-zinc-800"
        }`}
      >
        {isSubmitting ? "Adding..." : "Add Check-In"}
      </button>
    </form>
  );
}
