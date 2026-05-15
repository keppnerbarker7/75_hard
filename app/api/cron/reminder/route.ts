import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, getReminderEmailHtml } from "@/lib/email";
import { buildLeaderboard, calculateStreakData } from "@/lib/challenge";
import { getTodayDateInMountainTime, getYesterdayDateInMountainTime } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const yesterdayStr = getYesterdayDateInMountainTime();
    const todayStr = getTodayDateInMountainTime();

    const users = await prisma.user.findMany({
      include: {
        group: true,
        checkIns: true,
      },
    });

    const group = users[0]?.group;
    if (!group) {
      return NextResponse.json({ error: "No group found" }, { status: 404 });
    }

    const leaderboard = buildLeaderboard(users, group.startDate, todayStr)
      .map((entry) => ({
        name: entry.name,
        totalPenalty: entry.totalPenalty,
        netPosition: entry.netPosition,
      }))
      .sort((a, b) => b.netPosition - a.netPosition);

    const results = await Promise.all(
      users.map(async (user) => {
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

        const checkInUrl = `${
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        }/checkin/${user.slug}`;
        const streakData = calculateStreakData(user.checkIns);

        const html = getReminderEmailHtml(
          user.name,
          checkInUrl,
          yesterdayData,
          leaderboard,
          {
            currentStreak: streakData.currentStreak,
            perfectDays: streakData.perfectDays,
          }
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

    return NextResponse.json({
      success: true,
      message: "Reminder emails sent",
      results,
      timestamp: new Date().toISOString(),
    });
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
