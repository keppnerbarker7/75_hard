import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Verify this is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get yesterday's date in MT timezone (this runs at midnight MT, so we autofill the day that just ended)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });

    // Get all users
    const users = await prisma.user.findMany();

    // Find users who haven't checked in yesterday
    const results = await Promise.all(
      users.map(async (user) => {
        const existingCheckIn = await prisma.checkIn.findUnique({
          where: {
            userId_date: {
              userId: user.id,
              date: yesterdayStr,
            },
          },
        });

        if (existingCheckIn) {
          return {
            user: user.name,
            action: "skipped",
            reason: "already checked in",
          };
        }

        // Create auto-filled check-in with all tasks failed
        const checkIn = await prisma.checkIn.create({
          data: {
            userId: user.id,
            date: yesterdayStr,
            task1: false,
            task2: false,
            task3: false,
            task4: false,
            task5: false,
            penalty: 10, // Max penalty
            isAutoFilled: true,
          },
        });

        return {
          user: user.name,
          action: "auto-filled",
          penalty: checkIn.penalty,
          date: yesterdayStr,
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: "Auto-fill completed",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Auto-fill cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to auto-fill check-ins",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
