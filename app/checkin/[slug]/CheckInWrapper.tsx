"use client";

import { useState } from "react";
import CheckInForm from "./CheckInForm";

type Task = {
  id: number;
  label: string;
};

type CheckInData = {
  task1: boolean;
  task2: boolean;
  task3: boolean;
  task4: boolean;
  task5: boolean;
  penalty: number;
  isAutoFilled: boolean;
  submittedAt: Date;
} | null;

type CheckInWrapperProps = {
  userId: string;
  slug: string;
  todayDate: string;
  yesterdayDate: string;
  todayTasks: Task[];
  yesterdayTasks: Task[];
  isTodaySunday: boolean;
  isYesterdaySunday: boolean;
  todayCheckIn: CheckInData;
  yesterdayCheckIn: CheckInData;
  canCorrectYesterday: boolean;
  totalPenalty: number;
  currentPosition: number;
  poolTotal: number;
  groupSize: number;
  groupAvgCompletionRate: number;
  groupAvgPenalty: number;
};

export default function CheckInWrapper({
  userId,
  slug,
  todayDate,
  yesterdayDate,
  todayTasks,
  yesterdayTasks,
  isTodaySunday,
  isYesterdaySunday,
  todayCheckIn,
  yesterdayCheckIn,
  canCorrectYesterday,
  totalPenalty,
  currentPosition,
  poolTotal,
  groupSize,
  groupAvgCompletionRate,
  groupAvgPenalty,
}: CheckInWrapperProps) {
  const [selectedDay, setSelectedDay] = useState<"today" | "yesterday">("today");

  const isViewingToday = selectedDay === "today";
  const currentDate = isViewingToday ? todayDate : yesterdayDate;
  const currentTasks = isViewingToday ? todayTasks : yesterdayTasks;
  const currentIsSunday = isViewingToday ? isTodaySunday : isYesterdaySunday;
  const currentCheckIn = isViewingToday ? todayCheckIn : yesterdayCheckIn;
  const isCorrectingAutoFill = !isViewingToday && yesterdayCheckIn?.isAutoFilled;

  return (
    <>
      {/* Day Toggle */}
      {canCorrectYesterday && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 mb-1">Correction Window Active</p>
              <p className="text-sm text-amber-700">
                You missed yesterday's check-in. You have until midnight tonight to correct it.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDay("today")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedDay === "today"
                  ? "bg-zinc-900 text-white shadow-md"
                  : "bg-white text-zinc-600 border-2 border-zinc-200 hover:border-zinc-300"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDay("yesterday")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedDay === "yesterday"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-white text-amber-600 border-2 border-amber-200 hover:border-amber-300"
              }`}
            >
              Yesterday (Correct)
            </button>
          </div>
        </div>
      )}

      {/* Info Banner for Updates */}
      {currentCheckIn && !isCorrectingAutoFill && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Last updated:</strong> {new Date(currentCheckIn.submittedAt || "").toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" })} MT
                <br />
                You can update your check-in as many times as you want until midnight MT.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Correction Banner */}
      {isCorrectingAutoFill && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Auto-filled Entry:</strong> This check-in was automatically marked as all tasks missed ($10 penalty).
                <br />
                Update it now if you actually completed any tasks yesterday.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Form */}
      <CheckInForm
        userId={userId}
        slug={slug}
        date={currentDate}
        tasks={currentTasks}
        isSunday={currentIsSunday}
        totalPenalty={totalPenalty}
        currentPosition={currentPosition}
        poolTotal={poolTotal}
        groupSize={groupSize}
        groupAvgCompletionRate={groupAvgCompletionRate}
        groupAvgPenalty={groupAvgPenalty}
        existingCheckIn={currentCheckIn}
        isCorrectingYesterday={isCorrectingAutoFill}
      />
    </>
  );
}
