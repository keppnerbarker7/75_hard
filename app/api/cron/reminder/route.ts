import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {  sendEmail, getReminderEmailHtml } from "@/lib/email";

export async function GET(request: NextRequest) {
  // Verify this is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get yesterday's date in MT timezone
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });

    // Get all users with group info
    const users = await prisma.user.findMany({
      include: {
        group: true,
      },
    });

    const groupSize = users.length;

    // Calculate how many days have passed (using MT timezone)
    const group = users[0]?.group;
    if (!group) {
      return NextResponse.json({ error: "No group found" }, { status: 404 });
    }

    const startDateStr = new Date(group.startDate).toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });
    const startDate = new Date(startDateStr);
    const todayDate = new Date(todayStr);
    // Days passed EXCLUDING today (only count complete days)
    const daysPassed = Math.floor(
      (todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate leaderboard with net positions
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const allCheckIns = await prisma.checkIn.findMany({
          where: { userId: user.id },
        });

        // Recorded penalties
        const recordedPenalty = allCheckIns.reduce(
          (sum, checkIn) => sum + checkIn.penalty,
          0
        );

        // Missing days penalty
        const daysRecorded = allCheckIns.length;
        const missingDays = Math.max(0, daysPassed - daysRecorded);
        const missingPenalty = missingDays * 10;

        const totalPenalty = recordedPenalty + missingPenalty;

        // Calculate total pool for share calculation
        const totalRecordedDays = users.length * daysPassed;
        const allUsersCheckIns = await prisma.checkIn.findMany();
        const recordedPenalties = allUsersCheckIns.reduce((sum, c) => sum + c.penalty, 0);
        const totalMissingDays = totalRecordedDays - allUsersCheckIns.length;
        const poolTotal = recordedPenalties + (totalMissingDays * 10);

        const share = poolTotal / groupSize;
        const netPosition = share - totalPenalty;

        return { name: user.name, totalPenalty, netPosition };
      })
    );
    leaderboard.sort((a, b) => b.netPosition - a.netPosition);

    // Send email to each user
    const results = await Promise.all(
      users.map(async (user) => {
        // Get yesterday's check-in
        const yesterdayCheckIn = await prisma.checkIn.findUnique({
          where: {
            userId_date: {
              userId: user.id,
              date: yesterdayStr,
            },
          },
        });

        const yesterdayData = yesterdayCheckIn
          ? {
              task1: yesterdayCheckIn.task1,
              task2: yesterdayCheckIn.task2,
              task3: yesterdayCheckIn.task3,
              task4: yesterdayCheckIn.task4,
              task5: yesterdayCheckIn.task5,
              penalty: yesterdayCheckIn.penalty,
            }
          : null;

        const checkInUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/checkin/${user.slug}`;

        // Calculate streak data for this user
        const allUserCheckIns = await prisma.checkIn.findMany({
          where: { userId: user.id },
          orderBy: { date: "desc" },
        });

        let currentStreak = 0;
        let perfectDays = 0;
        let streakActive = true;

        // Count perfect days and current streak
        for (let i = 0; i < allUserCheckIns.length; i++) {
          const checkIn = allUserCheckIns[i];
          if (checkIn.penalty === 0) {
            perfectDays++;
            // Only count toward current streak if we haven't broken it yet
            if (streakActive) {
              currentStreak++;
            }
          } else {
            // Hit a penalty - streak is broken
            streakActive = false;
          }
        }

        const html = getReminderEmailHtml(
          user.name,
          checkInUrl,
          yesterdayData,
          leaderboard,
          { currentStreak, perfectDays },
          yesterdayStr
        );

        const result = await sendEmail(
          user.email,
          "75 Hard Daily Check-In Reminder",
          html
        );

        return {
          user: user.name,
          email: user.email,
          success: result.success,
          error: result.error,
        };
      })
    );

    const failed = results.filter((result) => !result.success);

    return NextResponse.json({
      success: failed.length === 0,
      message:
        failed.length === 0
          ? "Reminder emails sent"
          : `Reminder emails sent with ${failed.length} failure${failed.length === 1 ? "" : "s"}`,
      counts: {
        total: results.length,
        sent: results.length - failed.length,
        failed: failed.length,
      },
      results,
      timestamp: new Date().toISOString(),
      fromAddress:
        process.env.EMAIL_FROM || process.env.RESEND_FROM || "75 Hard <onboarding@resend.dev>",
      note:
        !process.env.EMAIL_FROM && !process.env.RESEND_FROM
          ? "Using Resend test sender. Verify a domain and set EMAIL_FROM to send to recipients beyond your own Resend account email."
          : undefined,
    }, { status: failed.length === 0 ? 200 : 207 });
  } catch (error) {
    console.error("Reminder cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to send reminder emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
