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

    // Get all users
    const users = await prisma.user.findMany();

    // Calculate leaderboard with ALL check-ins
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const allCheckIns = await prisma.checkIn.findMany({
          where: { userId: user.id },
        });
        const totalPenalty = allCheckIns.reduce(
          (sum, checkIn) => sum + checkIn.penalty,
          0
        );
        return { name: user.name, totalPenalty };
      })
    );
    leaderboard.sort((a, b) => a.totalPenalty - b.totalPenalty);

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

        const html = getReminderEmailHtml(
          user.name,
          checkInUrl,
          yesterdayData,
          leaderboard
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
