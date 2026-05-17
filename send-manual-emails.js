const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
require('dotenv').config();

const prisma = new PrismaClient();

// Create nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendManualEmails() {
  try {
    console.log('Starting manual email send...\n');

    // Get all users
    const users = await prisma.user.findMany({
      include: {
        group: true,
        checkIns: {
          orderBy: { date: 'desc' }
        }
      }
    });

    console.log(`Found ${users.length} users to email:\n`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    console.log('');

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });

    // Calculate leaderboard
    const groupSize = users.length;
    const startDateStr = new Date(users[0].group.startDate).toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });
    const startDate = new Date(startDateStr);
    const todayDate = new Date(todayStr);
    const daysPassed = Math.floor(
      (todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const leaderboard = users.map(user => {
      const recordedPenalty = user.checkIns.reduce((sum, c) => sum + c.penalty, 0);
      const missingDays = Math.max(0, daysPassed - user.checkIns.length);
      const totalPenalty = recordedPenalty + (missingDays * 10);

      const allCheckIns = users.flatMap(u => u.checkIns);
      const recordedPenalties = allCheckIns.reduce((sum, c) => sum + c.penalty, 0);
      const totalRecordedDays = allCheckIns.length;
      const expectedTotalDays = daysPassed * groupSize;
      const missingTotalDays = expectedTotalDays - totalRecordedDays;
      const poolTotal = recordedPenalties + (missingTotalDays * 10);

      const share = poolTotal / groupSize;
      const netPosition = share - totalPenalty;

      return { name: user.name, totalPenalty, netPosition };
    });
    leaderboard.sort((a, b) => b.netPosition - a.netPosition);

    // Send email to each user
    const results = [];
    for (const user of users) {
      console.log(`📧 Sending to ${user.name} (${user.email})...`);

      // Get yesterday's check-in
      const yesterdayCheckIn = user.checkIns.find(c => c.date === yesterdayStr);

      // Calculate streak
      let currentStreak = 0;
      let perfectDays = 0;
      let streakActive = true;

      for (const checkIn of user.checkIns) {
        if (checkIn.penalty === 0) {
          perfectDays++;
          if (streakActive) currentStreak++;
        } else {
          streakActive = false;
        }
      }

      // Build email HTML
      const checkInUrl = `https://75-hard-three.vercel.app/checkin/${user.slug}`;

      const wasSunday = new Date(yesterdayStr).getDay() === 0;
      const taskNames = wasSunday
        ? ["📖 Read 5 pages", "🚶 Walk (outdoor activity)", null, "💧 1 gallon water", "🥗 Diet"]
        : ["📖 Read 5 pages", "🏃 Outdoor workout", "💪 Second workout", "💧 1 gallon water", "🥗 Diet"];

      const yesterdaySection = yesterdayCheckIn
        ? `<h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 24px 0 12px;">Yesterday's Summary</h2>
           <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
             ${[yesterdayCheckIn.task1, yesterdayCheckIn.task2, yesterdayCheckIn.task3, yesterdayCheckIn.task4, yesterdayCheckIn.task5]
               .map((completed, i) => {
                 if (taskNames[i] === null) return "";
                 return `<div style="margin: 8px 0; color: ${completed ? "#16a34a" : "#dc2626"};">${completed ? "✓" : "✗"} ${taskNames[i]}</div>`;
               })
               .join("")}
             <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-weight: 600; color: ${yesterdayCheckIn.penalty === 0 ? "#16a34a" : "#dc2626"};">
               Yesterday's Penalty: $${yesterdayCheckIn.penalty}
             </div>
           </div>`
        : "";

      const html = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h1 style="color: #18181b; font-size: 24px; font-weight: 700; margin: 0 0 8px;">Hey ${user.name}! 👋</h1>
                <p style="color: #71717a; font-size: 16px; margin: 0 0 24px;">Time to check in for today.</p>

                <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                  <div style="font-size: 12px; color: rgba(255,255,255,0.9); font-weight: 600; margin-bottom: 8px;">PERFECT DAY STREAK</div>
                  <div style="font-size: 56px; font-weight: 800; color: white; margin-bottom: 8px;">
                    ${currentStreak > 0 ? "🔥" : "💀"} ${currentStreak}
                  </div>
                  <div style="font-size: 15px; color: white; font-weight: 500;">
                    ${currentStreak === 0 ? "Start a new perfect streak today!" : "Consecutive days with $0 penalty!"}
                  </div>
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 13px; color: white;">
                    Total Perfect Days: <strong>${perfectDays}</strong>
                  </div>
                </div>

                ${yesterdaySection}

                <div style="margin: 32px 0;">
                  <a href="${checkInUrl}" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    Submit Today's Check-In
                  </a>
                </div>

                <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 32px 0 12px;">Current Standings</h2>
                <div style="background: #f4f4f5; border-radius: 8px; padding: 16px;">
                  ${leaderboard.map((entry, i) => `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: ${i < leaderboard.length - 1 ? "1px solid #e4e4e7" : "none"};">
                      <span>${i === 0 ? "🏆" : `${i + 1}.`} ${entry.name}</span>
                      <span style="color: ${entry.netPosition >= 0 ? "#16a34a" : "#dc2626"}; font-weight: 700;">
                        ${entry.netPosition >= 0 ? "+" : ""}$${entry.netPosition.toFixed(2)}
                      </span>
                    </div>
                  `).join("")}
                </div>

                <p style="color: #a1a1aa; font-size: 14px; margin: 32px 0 0; text-align: center;">
                  You have until midnight MT to check in for today.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        await transporter.sendMail({
          from: `"75 Hard" <${process.env.GMAIL_USER}>`,
          to: user.email,
          subject: "75 Hard Daily Check-In Reminder",
          html: html,
        });

        console.log(`   ✅ Sent successfully`);
        results.push({ user: user.name, email: user.email, success: true });
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        results.push({ user: user.name, email: user.email, success: false, error: err.message });
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY:');
    console.log('='.repeat(60));
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`✅ Successful: ${successful}/${users.length}`);
    console.log(`❌ Failed: ${failed}/${users.length}`);

    if (failed > 0) {
      console.log('\nFailed emails:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.user} (${r.email}): ${r.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

sendManualEmails();
