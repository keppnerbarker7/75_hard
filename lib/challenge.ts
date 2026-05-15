import { addDaysToDateString, diffCalendarDays, getTodayDateInMountainTime, getDateStringInTimeZone } from "@/lib/dates";

export const TASKS = [
  { id: 1, label: "Read at least 5 pages (physical book)", shortLabel: "Read 5 pages", emoji: "📖" },
  { id: 2, label: "Outdoor workout — 45 min", shortLabel: "Outdoor workout", emoji: "🏃" },
  { id: 3, label: "Second workout — 45 min", shortLabel: "Second workout", emoji: "💪" },
  { id: 4, label: "Drink 1 gallon of water", shortLabel: "1 gallon water", emoji: "💧" },
  { id: 5, label: "Follow your chosen diet", shortLabel: "Follow diet", emoji: "🥗" },
] as const;

export type TaskState = Record<number, boolean>;

export type CheckInLike = {
  date: string;
  penalty: number;
  task1: boolean;
  task2: boolean;
  task3: boolean;
  task4: boolean;
  task5: boolean;
  isAutoFilled?: boolean;
};

export type UserChallengeData = {
  id: string;
  name: string;
  slug: string;
  checkIns: CheckInLike[];
};

export function getTaskStateFromCheckIn(checkIn: Pick<CheckInLike, "task1" | "task2" | "task3" | "task4" | "task5">): TaskState {
  return {
    1: checkIn.task1,
    2: checkIn.task2,
    3: checkIn.task3,
    4: checkIn.task4,
    5: checkIn.task5,
  };
}

export function countCompletedTasks(taskState: TaskState) {
  return Object.values(taskState).filter(Boolean).length;
}

export function calculatePenalty(taskState: TaskState, penaltyPerTask: number = 2, taskCapPerDay: number = 10) {
  const missedTasks = TASKS.length - countCompletedTasks(taskState);
  return Math.min(missedTasks * penaltyPerTask, taskCapPerDay);
}

export function getGroupStartDateString(startDate: Date) {
  return getDateStringInTimeZone(startDate, "UTC");
}

export function getDaysPassedSinceStart(startDate: Date, asOfDate: string = getTodayDateInMountainTime()) {
  return Math.max(0, diffCalendarDays(getGroupStartDateString(startDate), asOfDate));
}

export function getExpectedPenaltyForMissingDays(daysRecorded: number, daysPassed: number, taskCapPerDay: number = 10) {
  return Math.max(0, daysPassed - daysRecorded) * taskCapPerDay;
}

export function getPoolTotal(users: UserChallengeData[], daysPassed: number, taskCapPerDay: number = 10) {
  const recordedPenalties = users.reduce(
    (sum, user) => sum + user.checkIns.reduce((userSum, checkIn) => userSum + checkIn.penalty, 0),
    0
  );
  const totalRecordedDays = users.reduce((sum, user) => sum + user.checkIns.length, 0);
  const expectedTotalDays = daysPassed * users.length;
  return recordedPenalties + Math.max(0, expectedTotalDays - totalRecordedDays) * taskCapPerDay;
}

export function buildLeaderboard(
  users: UserChallengeData[],
  startDate: Date,
  asOfDate: string = getTodayDateInMountainTime(),
  taskCapPerDay: number = 10
) {
  const daysPassed = getDaysPassedSinceStart(startDate, asOfDate);
  const poolTotal = getPoolTotal(users, daysPassed, taskCapPerDay);
  const share = users.length > 0 ? poolTotal / users.length : 0;

  return users.map((user) => {
    const recordedPenalty = user.checkIns.reduce((sum, checkIn) => sum + checkIn.penalty, 0);
    const missingPenalty = getExpectedPenaltyForMissingDays(user.checkIns.length, daysPassed, taskCapPerDay);
    const totalPenalty = recordedPenalty + missingPenalty;

    return {
      id: user.id,
      name: user.name,
      slug: user.slug,
      daysRecorded: user.checkIns.length,
      totalPenalty,
      netPosition: share - totalPenalty,
      checkedInToday: user.checkIns.some((checkIn) => checkIn.date === asOfDate && !checkIn.isAutoFilled),
      missingDays: Math.max(0, daysPassed - user.checkIns.length),
    };
  });
}

export function calculateTaskStats(checkIns: CheckInLike[]) {
  const total = checkIns.length;

  return TASKS.map((task) => {
    const taskKey = `task${task.id}` as const;
    const completed = checkIns.filter((checkIn) => checkIn[taskKey]).length;

    return {
      taskName: task.shortLabel,
      emoji: task.emoji,
      completionRate: total > 0 ? completed / total : 0,
      completed,
      total,
    };
  }).sort((a, b) => b.completionRate - a.completionRate);
}

export function calculateStreakData(checkIns: CheckInLike[]) {
  if (checkIns.length === 0) {
    return { perfectDays: 0, currentStreak: 0, longestStreak: 0 };
  }

  const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
  const perfectDays = sorted.filter((checkIn) => checkIn.penalty === 0).length;

  let longestStreak = 0;
  let runningStreak = 0;
  let previousPerfectDate: string | null = null;

  for (const checkIn of sorted) {
    if (checkIn.penalty !== 0) {
      runningStreak = 0;
      previousPerfectDate = null;
      continue;
    }

    if (previousPerfectDate && diffCalendarDays(previousPerfectDate, checkIn.date) === 1) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }

    previousPerfectDate = checkIn.date;
    longestStreak = Math.max(longestStreak, runningStreak);
  }

  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const current = sorted[i];
    if (current.penalty !== 0) {
      break;
    }

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      if (diffCalendarDays(current.date, next.date) !== 1) {
        break;
      }
    }

    currentStreak += 1;
  }

  return {
    perfectDays,
    currentStreak,
    longestStreak,
  };
}

export function getCorrectionLink(slug: string, targetDate: string, siteUrl: string) {
  const normalizedBase = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
  return `${normalizedBase}/checkin/${slug}?date=${targetDate}&mode=correct`;
}

export function getLateCorrectionTargetDate() {
  return addDaysToDateString(getTodayDateInMountainTime(), -1);
}
