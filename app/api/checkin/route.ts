import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tasks } = body;

    // Validate input
    if (!userId || !tasks) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get today's date in MT timezone (YYYY-MM-DD format)
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });

    // Calculate penalty: $2 per missed task, capped at $10
    const completedTasks = Object.values(tasks as Record<number, boolean>).filter(
      Boolean
    ).length;
    const missedTasks = 5 - completedTasks;
    const penalty = Math.min(missedTasks * 2, 10);

    // Upsert check-in (update if exists, create if not)
    // This allows users to update their check-in throughout the day
    // Note: On Sundays, task2 (Walk) counts for both workouts, so task3 will match task2
    const checkIn = await prisma.checkIn.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        task1: tasks[1] || false,
        task2: tasks[2] || false,
        task3: tasks[3] || false,
        task4: tasks[4] || false,
        task5: tasks[5] || false,
        penalty,
        submittedAt: new Date(),
        isAutoFilled: false,
      },
      create: {
        userId,
        date: today,
        task1: tasks[1] || false,
        task2: tasks[2] || false,
        task3: tasks[3] || false,
        task4: tasks[4] || false,
        task5: tasks[5] || false,
        penalty,
        isAutoFilled: false,
      },
    });

    return NextResponse.json({
      success: true,
      checkIn: {
        id: checkIn.id,
        penalty: checkIn.penalty,
        submittedAt: checkIn.submittedAt,
      },
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: "Failed to submit check-in" },
      { status: 500 }
    );
  }
}
