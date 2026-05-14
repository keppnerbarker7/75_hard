import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date, tasks } = body;

    // Validate input
    if (!userId || !date || !tasks) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if check-in already exists for this user/date
    const existingCheckIn = await prisma.checkIn.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    if (existingCheckIn) {
      return NextResponse.json(
        { error: "Check-in already exists for this date" },
        { status: 409 }
      );
    }

    // Calculate penalty
    const completedTasks = Object.values(tasks as Record<number, boolean>).filter(
      Boolean
    ).length;
    const missedTasks = 5 - completedTasks;
    const penalty = Math.min(missedTasks * 2, 10);

    // Create check-in
    const checkIn = await prisma.checkIn.create({
      data: {
        userId,
        date,
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
        date: checkIn.date,
        penalty: checkIn.penalty,
      },
    });
  } catch (error) {
    console.error("Admin check-in error:", error);
    return NextResponse.json(
      { error: "Failed to create check-in" },
      { status: 500 }
    );
  }
}
