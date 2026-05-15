import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePenalty } from "@/lib/challenge";
import { getTodayDateInMountainTime, isCorrectionWindowOpen } from "@/lib/dates";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      slug?: string;
      tasks?: Record<number, boolean>;
      date?: string;
      mode?: "today" | "correct";
    };
    const { slug, tasks, date, mode } = body;

    if (!slug || !tasks) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { slug },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = getTodayDateInMountainTime();
    const targetDate = date ?? today;
    const penalty = calculatePenalty(tasks);

    if (mode === "correct") {
      if (!date) {
        return NextResponse.json(
          { error: "Correction date is required" },
          { status: 400 }
        );
      }

      if (!isCorrectionWindowOpen(targetDate)) {
        return NextResponse.json(
          { error: "Correction window has closed" },
          { status: 403 }
        );
      }

      const existingCheckIn = await prisma.checkIn.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: targetDate,
          },
        },
      });

      if (!existingCheckIn || !existingCheckIn.isAutoFilled) {
        return NextResponse.json(
          { error: "No auto-filled entry is available for correction" },
          { status: 409 }
        );
      }

      const checkIn = await prisma.checkIn.update({
        where: {
          userId_date: {
            userId: user.id,
            date: targetDate,
          },
        },
        data: {
          task1: tasks[1] || false,
          task2: tasks[2] || false,
          task3: tasks[3] || false,
          task4: tasks[4] || false,
          task5: tasks[5] || false,
          penalty,
          isAutoFilled: false,
          correctedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        checkIn: {
          id: checkIn.id,
          penalty: checkIn.penalty,
          submittedAt: checkIn.submittedAt,
          correctedAt: checkIn.correctedAt,
          date: checkIn.date,
        },
      });
    }

    if (targetDate !== today) {
      return NextResponse.json(
        { error: "Backdating is only allowed through the correction flow" },
        { status: 400 }
      );
    }

    const existingCheckIn = await prisma.checkIn.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    if (existingCheckIn) {
      return NextResponse.json(
        { error: "Already checked in today" },
        { status: 409 }
      );
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        userId: user.id,
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
