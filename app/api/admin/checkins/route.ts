import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Fetch all check-ins for this date
    const checkIns = await prisma.checkIn.findMany({
      where: {
        date,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      success: true,
      checkIns,
    });
  } catch (error) {
    console.error("Fetch check-ins error:", error);
    return NextResponse.json(
      { error: "Failed to fetch check-ins" },
      { status: 500 }
    );
  }
}
