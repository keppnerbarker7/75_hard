type TaskSuccessRateProps = {
  taskStats: {
    taskName: string;
    emoji: string;
    completionRate: number;
    completed: number;
    total: number;
  }[];
};

export default function TaskSuccessRate({ taskStats }: TaskSuccessRateProps) {
  return (
    <div className="paper-panel rounded-[2rem] p-6 shadow-lg">
      <h2 className="font-display text-3xl uppercase text-[var(--sand)] mb-2">
        📊 Task Success Rates
      </h2>
      <p className="text-xs text-[var(--muted)] mb-4 uppercase tracking-[0.16em]">
        Which tasks are hardest?
      </p>

      <div className="space-y-4">
        {taskStats.map((task, index) => {
          const percentage = Math.round(task.completionRate * 100);
          const isHardest = index === taskStats.length - 1;
          const isEasiest = index === 0;

          return (
            <div key={task.taskName}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{task.emoji}</span>
                  <span className="font-medium text-[var(--sand)]">
                    {task.taskName}
                  </span>
                  {isEasiest && (
                    <span className="text-xs bg-[rgba(180,208,127,0.14)] text-[var(--olive)] px-2 py-1 rounded-full font-medium">
                      Easiest
                    </span>
                  )}
                  {isHardest && (
                    <span className="text-xs bg-[rgba(255,90,54,0.14)] text-[var(--accent)] px-2 py-1 rounded-full font-medium">
                      Hardest
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[var(--sand)]">
                    {percentage}%
                  </span>
                  <span className="text-xs text-[var(--muted)] ml-2">
                    ({task.completed}/{task.total})
                  </span>
                </div>
              </div>

              <div className="w-full bg-white/6 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    percentage >= 80
                      ? "bg-[var(--olive)]"
                      : percentage >= 60
                      ? "bg-[#ffd166]"
                      : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-white/8">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[var(--sand)]">Group Average</span>
          <span className="text-2xl font-bold text-[var(--accent)]">
            {Math.round(
              (taskStats.reduce((sum, t) => sum + t.completionRate, 0) /
                taskStats.length) *
                100
            )}
            %
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate task stats from all check-ins
export function calculateTaskStats(
  allCheckIns: Array<{
    task1: boolean;
    task2: boolean;
    task3: boolean;
    task4: boolean;
    task5: boolean;
  }>
): {
  taskName: string;
  emoji: string;
  completionRate: number;
  completed: number;
  total: number;
}[] {
  const taskLabels = [
    { name: "Read 5 pages", emoji: "📖" },
    { name: "Outdoor workout", emoji: "🏃" },
    { name: "Second workout", emoji: "💪" },
    { name: "1 gallon water", emoji: "💧" },
    { name: "Follow diet", emoji: "🥗" },
  ];

  const total = allCheckIns.length;
  if (total === 0) {
    return taskLabels.map((label) => ({
      taskName: label.name,
      emoji: label.emoji,
      completionRate: 0,
      completed: 0,
      total: 0,
    }));
  }

  const stats = taskLabels.map((label, index) => {
    const taskKey = `task${index + 1}` as keyof typeof allCheckIns[0];
    const completed = allCheckIns.filter((checkIn) => checkIn[taskKey]).length;
    const completionRate = completed / total;

    return {
      taskName: label.name,
      emoji: label.emoji,
      completionRate,
      completed,
      total,
    };
  });

  // Sort by completion rate (highest first)
  return stats.sort((a, b) => b.completionRate - a.completionRate);
}
