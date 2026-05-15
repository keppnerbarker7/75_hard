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
};

// Daily reminder email template
export function getReminderEmailHtml(
  userName: string,
  checkInUrl: string,
  yesterdayData: CheckInData | null,
  leaderboard: LeaderboardEntry[]
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

            ${yesterdaySection}

            <div style="margin: 32px 0;">
              <a href="${checkInUrl}" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Submit Today's Check-In
              </a>
            </div>

            <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 32px 0 12px;">Current Standings</h2>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 16px;">
              ${leaderboard
                .slice(0, 6)
                .map(
                  (entry, i) => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: ${i < leaderboard.length - 1 ? "1px solid #e4e4e7" : "none"};">
                  <span style="color: #18181b;">${i === 0 ? "🏆" : `${i + 1}.`} ${entry.name}</span>
                  <span style="color: #dc2626; font-weight: 600;">$${entry.totalPenalty}</span>
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
