import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, getWeeklyRecapEmailHtml } from "@/lib/email";

export async function GET(request: NextRequest) {
  // Verify this is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all users with check-ins from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toLocaleDateString("en-CA", {
      timeZone: "America/Denver",
    });

    const users = await prisma.user.findMany({
      include: {
        checkIns: {
          where: {
            date: {
              gte: sevenDaysAgoStr,
            },
          },
          orderBy: {
            date: "desc",
          },
        },
        group: true,
      },
    });

    // Calculate week stats
    const userStats = users.map((user) => {
      const perfectDaysThisWeek = user.checkIns.filter(
        (c) => c.penalty === 0
      ).length;
      const totalPenaltiesThisWeek = user.checkIns.reduce(
        (sum, c) => sum + c.penalty,
        0
      );

      return {
        name: user.name,
        email: user.email,
        perfectDaysThisWeek,
        totalPenaltiesThisWeek,
        checkInsThisWeek: user.checkIns.length,
      };
    });

    // Find top performer (most perfect days)
    const topPerformer = userStats.reduce((prev, current) =>
      current.perfectDaysThisWeek > prev.perfectDaysThisWeek ? current : prev
    );

    // Find biggest improver (most check-ins with low penalties)
    const biggestImprover = userStats.reduce((prev, current) => {
      const prevAvg =
        prev.checkInsThisWeek > 0
          ? prev.totalPenaltiesThisWeek / prev.checkInsThisWeek
          : 10;
      const currentAvg =
        current.checkInsThisWeek > 0
          ? current.totalPenaltiesThisWeek / current.checkInsThisWeek
          : 10;
      return currentAvg < prevAvg ? current : prev;
    });

    // Calculate group highlights
    const totalPerfectDays = userStats.reduce(
      (sum, u) => sum + u.perfectDaysThisWeek,
      0
    );
    const groupHighlights = `The group scored ${totalPerfectDays} perfect days this week! ${
      totalPerfectDays >= 30
        ? "Outstanding performance! 🎉"
        : "Let's aim higher next week!"
    }`;

    // Who's on fire (3+ perfect days this week)
    const onFire = userStats
      .filter((u) => u.perfectDaysThisWeek >= 3)
      .map((u) => u.name);

    // Who's struggling (0-1 perfect days this week)
    const struggling = userStats
      .filter((u) => u.perfectDaysThisWeek <= 1)
      .map((u) => u.name);

    // Calculate week number
    const startDate = new Date(users[0]?.group?.startDate || Date.now());
    const today = new Date();
    const weekNumber = Math.ceil(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    // Send email to each user
    const results = await Promise.all(
      users.map(async (user) => {
        const html = getWeeklyRecapEmailHtml(user.name, {
          topPerformer: {
            name: topPerformer.name,
            perfectDays: topPerformer.perfectDaysThisWeek,
          },
          biggestImprover: {
            name: biggestImprover.name,
            improvement:
              biggestImprover.totalPenaltiesThisWeek === 0
                ? "Perfect week!"
                : `Only $${biggestImprover.totalPenaltiesThisWeek} in penalties`,
          },
          groupHighlights,
          onFire,
          struggling,
          weekNumber,
        });

        const result = await sendEmail(
          user.email,
          `Week ${weekNumber} Recap - 75 Hard Challenge`,
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
      message: "Weekly recap emails sent",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Weekly recap cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to send weekly recap emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
