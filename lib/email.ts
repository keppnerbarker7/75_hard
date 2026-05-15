import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type CheckInData = {
  task1: boolean;
  task2: boolean;
  task3: boolean;
  task4: boolean;
  task5: boolean;
  penalty: number;
};

export type LeaderboardEntry = {
  name: string;
  totalPenalty: number;
  netPosition: number;
};

// Daily reminder email template
export function getReminderEmailHtml(
  userName: string,
  checkInUrl: string,
  yesterdayData: CheckInData | null,
  leaderboard: LeaderboardEntry[],
  streakData?: { currentStreak: number; perfectDays: number }
): string {
  const taskNames = [
    "📖 Read 5 pages",
    "🏃 Outdoor workout",
    "💪 Second workout",
    "💧 1 gallon water",
    "🥗 Diet",
  ];

  const yesterdaySection = yesterdayData
    ? `
      <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 24px 0 12px;">Yesterday's Summary</h2>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        ${[yesterdayData.task1, yesterdayData.task2, yesterdayData.task3, yesterdayData.task4, yesterdayData.task5]
          .map((completed, i) => {
            return `<div style="margin: 8px 0; color: ${completed ? "#16a34a" : "#dc2626"};">${completed ? "✓" : "✗"} ${taskNames[i]}</div>`;
          })
          .join("")}
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-weight: 600; color: ${yesterdayData.penalty === 0 ? "#16a34a" : "#dc2626"};">
          Yesterday's Penalty: $${yesterdayData.penalty}
        </div>
      </div>
    `
    : "";

  const streakSection = streakData
    ? `
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: rgba(255,255,255,0.9); font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Perfect Day Streak</div>
        <div style="font-size: 56px; font-weight: 800; color: white; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          ${streakData.currentStreak > 0 ? "🔥" : "💀"} ${streakData.currentStreak}
        </div>
        <div style="font-size: 15px; color: white; font-weight: 500;">
          ${streakData.currentStreak === 0 ? "Start a new perfect streak today!" : streakData.currentStreak === 1 ? "Keep it going!" : "Consecutive days with $0 penalty!"}
        </div>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 13px; color: white;">
          Total Perfect Days: <strong>${streakData.perfectDays}</strong>
        </div>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #18181b; font-size: 24px; font-weight: 700; margin: 0 0 8px;">Hey ${userName}! 👋</h1>
            <p style="color: #71717a; font-size: 16px; margin: 0 0 24px;">Time to check in for today.</p>

            ${streakSection}

            ${yesterdaySection}

            <div style="margin: 32px 0;">
              <a href="${checkInUrl}" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Submit Today's Check-In
              </a>
            </div>

            <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 32px 0 12px;">Current Standings</h2>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 16px;">
              ${leaderboard
                .map(
                  (entry, i) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: ${i < leaderboard.length - 1 ? "1px solid #e4e4e7" : "none"};">
                  <span style="color: #18181b;">${i === 0 ? "🏆" : `${i + 1}.`} ${entry.name}</span>
                  <span style="color: ${entry.netPosition >= 0 ? "#16a34a" : "#dc2626"}; font-weight: 700; text-align: left;">${entry.netPosition >= 0 ? "+" : ""}$${entry.netPosition.toFixed(2)}</span>
                </div>
              `
                )
                .join("")}
            </div>

            <p style="color: #a1a1aa; font-size: 14px; margin: 32px 0 0; text-align: center;">
              You have until midnight MT to check in for today.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Late correction email template
export function getCorrectionEmailHtml(
  userName: string,
  checkInUrl: string,
  autoPenalty: number
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #ea580c; font-size: 24px; font-weight: 700; margin: 0 0 8px;">Missed Check-In ⚠️</h1>
            <p style="color: #71717a; font-size: 16px; margin: 0 0 24px;">Hey ${userName}, you didn't check in yesterday.</p>

            <div style="background: #fed7aa; border-left: 4px solid #ea580c; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #9a3412; margin: 0; font-weight: 600;">Auto-filled: All tasks missed</p>
              <p style="color: #9a3412; margin: 8px 0 0; font-size: 24px; font-weight: 700;">Penalty: $${autoPenalty}</p>
            </div>

            <p style="color: #18181b; font-size: 16px; margin: 24px 0;">
              <strong>You have until midnight tonight MT to correct this.</strong>
            </p>

            <p style="color: #71717a; font-size: 14px; margin: 16px 0 24px;">
              If you actually completed some tasks yesterday, click below to update your check-in. After midnight, this entry will be locked.
            </p>

            <div style="margin: 32px 0;">
              <a href="${checkInUrl}" style="display: inline-block; background: #ea580c; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Correct Yesterday's Entry
              </a>
            </div>

            <p style="color: #a1a1aa; font-size: 14px; margin: 32px 0 0; text-align: center;">
              This is your one 24-hour correction window.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Weekly recap email template
export function getWeeklyRecapEmailHtml(
  userName: string,
  weekData: {
    topPerformer: { name: string; perfectDays: number };
    biggestImprover: { name: string; improvement: string };
    groupHighlights: string;
    onFire: string[];
    struggling: string[];
    weekNumber: number;
  }
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #18181b; font-size: 28px; font-weight: 700; margin: 0 0 8px;">Week ${weekData.weekNumber} Recap 📊</h1>
            <p style="color: #71717a; font-size: 16px; margin: 0 0 24px;">Hey ${userName}, here's how the group performed this week!</p>

            <!-- Top Performer -->
            <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <div style="color: #78350f; font-size: 14px; font-weight: 600; margin-bottom: 8px;">🏆 TOP PERFORMER</div>
              <div style="color: white; font-size: 24px; font-weight: 800;">${weekData.topPerformer.name}</div>
              <div style="color: #78350f; font-size: 14px; margin-top: 4px;">${weekData.topPerformer.perfectDays} perfect days this week!</div>
            </div>

            <!-- Biggest Improver -->
            <div style="background: #10b981; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <div style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 600; margin-bottom: 8px;">📈 MOST IMPROVED</div>
              <div style="color: white; font-size: 24px; font-weight: 800;">${weekData.biggestImprover.name}</div>
              <div style="color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 4px;">${weekData.biggestImprover.improvement}</div>
            </div>

            <!-- Group Highlights -->
            <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 24px 0 12px;">Group Highlights</h2>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #18181b; margin: 0; font-size: 14px;">${weekData.groupHighlights}</p>
            </div>

            <!-- On Fire -->
            ${
              weekData.onFire.length > 0
                ? `
              <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 24px 0 12px;">🔥 On Fire</h2>
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #78350f; margin: 0; font-size: 14px;">${weekData.onFire.join(", ")} keeping those streaks alive!</p>
              </div>
            `
                : ""
            }

            <!-- Struggling -->
            ${
              weekData.struggling.length > 0
                ? `
              <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 24px 0 12px;">⚠️ Needs a Push</h2>
              <div style="background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #991b1b; margin: 0; font-size: 14px;">${weekData.struggling.join(", ")} - Let's step it up this week!</p>
              </div>
            `
                : ""
            }

            <!-- Next Week -->
            <div style="background: #18181b; border-radius: 12px; padding: 20px; margin-top: 24px; text-align: center;">
              <p style="color: white; font-size: 18px; font-weight: 700; margin: 0 0 8px;">Week ${weekData.weekNumber + 1} Starts Tomorrow!</p>
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">Let's make it the best week yet. 💪</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Send email function
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: "75 Hard <onboarding@resend.dev>", // Update with your domain later
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
