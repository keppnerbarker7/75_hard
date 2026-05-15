import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Verify this is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get today's date in MT timezone (since this runs at midnight, "today" is the day that just ended)
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });

    // Get all users
    const users = await prisma.user.findMany();

    // Find users who haven't checked in today
    const results = await Promise.all(
      users.map(async (user) => {
        const existingCheckIn = await prisma.checkIn.findUnique({
          where: {
            userId_date: {
              userId: user.id,
              date: today,
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
            date: today,
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
          date: today,
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
