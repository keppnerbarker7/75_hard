import nodemailer from "nodemailer";

// Create nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const defaultFromAddress =
  process.env.EMAIL_FROM || `"75 Hard" <${process.env.GMAIL_USER}>`;

function isPlaceholderRecipient(email: string): boolean {
  return /@placeholder\.com$/i.test(email.trim());
}

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
  streakData?: { currentStreak: number; perfectDays: number },
  yesterdayDate?: string
): string {
  // Check if yesterday was Sunday
  const wasSunday = yesterdayDate ? new Date(yesterdayDate).getDay() === 0 : false;

  // On Sundays, show Walk instead of two workouts
  const taskNames = wasSunday
    ? [
        "📖 Read 5 pages",
        "🚶 Walk (outdoor activity)",
        null, // Skip task3 on Sundays
        "💧 1 gallon water",
        "🥗 Diet",
      ]
    : [
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
            // Skip task3 on Sundays (null in taskNames array)
            if (taskNames[i] === null) return "";
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

            <div style="background: #f4f4f5; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #18181b; font-size: 14px; margin: 0;">
                <strong>📅 How Check-Ins Work:</strong><br />
                • Check in <strong>anytime during the day</strong> (MT timezone)<br />
                • Update as many times as you want until midnight<br />
                • At 12:01 AM MT, missed check-ins are auto-filled ($10 penalty)<br />
                • You have 24 hours to correct auto-filled entries
              </p>
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
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">🏆 TOP PERFORMER</div>
              <div style="color: white; font-size: 24px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${weekData.topPerformer.name}</div>
              <div style="color: white; font-size: 14px; margin-top: 4px; font-weight: 500;">${weekData.topPerformer.perfectDays} perfect days this week!</div>
            </div>

            <!-- Biggest Improver -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">📈 MOST IMPROVED</div>
              <div style="color: white; font-size: 24px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${weekData.biggestImprover.name}</div>
              <div style="color: white; font-size: 14px; margin-top: 4px; font-weight: 500;">${weekData.biggestImprover.improvement}</div>
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
              <div style="background: linear-gradient(135deg, #fb923c 0%, #f97316 100%); border-radius: 8px; padding: 16px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="color: white; margin: 0; font-size: 14px; font-weight: 600;">${weekData.onFire.join(", ")} keeping those streaks alive!</p>
              </div>
            `
                : ""
            }

            <!-- Struggling -->
            ${
              weekData.struggling.length > 0
                ? `
              <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 24px 0 12px;">⚠️ Needs a Push</h2>
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 8px; padding: 16px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="color: white; margin: 0; font-size: 14px; font-weight: 600;">${weekData.struggling.join(", ")} - Let's step it up this week!</p>
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
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return {
        success: false,
        error: "Missing GMAIL_USER or GMAIL_APP_PASSWORD",
      };
    }

    if (isPlaceholderRecipient(to)) {
      return {
        success: false,
        error: `Skipping placeholder recipient: ${to}`,
      };
    }

    await transporter.sendMail({
      from: defaultFromAddress,
      to: to,
      subject: subject,
      html: html,
    });

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
