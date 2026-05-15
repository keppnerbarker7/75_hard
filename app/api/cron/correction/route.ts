import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, getCorrectionEmailHtml } from "@/lib/email";
import { getCorrectionLink } from "@/lib/challenge";
import { getYesterdayDateInMountainTime } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const yesterdayStr = getYesterdayDateInMountainTime();

    const autoFilledCheckIns = await prisma.checkIn.findMany({
      where: {
        date: yesterdayStr,
        isAutoFilled: true,
        correctedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (autoFilledCheckIns.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No correction emails needed",
        count: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const results = await Promise.all(
      autoFilledCheckIns.map(async (checkIn) => {
        const checkInUrl = getCorrectionLink(
          checkIn.user.slug,
          yesterdayStr,
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        );

        const html = getCorrectionEmailHtml(
          checkIn.user.name,
          checkInUrl,
          checkIn.penalty
        );

        const result = await sendEmail(
          checkIn.user.email,
          "⚠️ Missed Check-In - Correction Available",
          html
        );

        return {
          user: checkIn.user.name,
          email: checkIn.user.email,
          penalty: checkIn.penalty,
          success: result.success,
          error: result.error,
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: "Correction emails sent",
      count: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Correction cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to send correction emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
