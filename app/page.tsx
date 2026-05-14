import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Get today's date in MT timezone
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });

  // Fetch all users with their check-ins
  const users = await prisma.user.findMany({
    include: {
      checkIns: true,
      group: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  if (users.length === 0) {
    return <div>No users found</div>;
  }

  const group = users[0].group;
  const groupSize = users.length;

  // Calculate total pool from all check-ins
  const allCheckIns = users.flatMap((user) => user.checkIns);
  const poolTotal = allCheckIns.reduce(
    (sum, checkIn) => sum + checkIn.penalty,
    0
  );

  // Calculate days remaining
  const endDate = new Date(group.endDate);
  const todayDate = new Date();
  const daysRemaining = Math.ceil(
    (endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Build leaderboard data
  const leaderboardData = users.map((user) => {
    const userCheckIns = user.checkIns;
    const totalPenalty = userCheckIns.reduce(
      (sum, checkIn) => sum + checkIn.penalty,
      0
    );
    const daysCompleted = userCheckIns.length;
    const share = poolTotal / groupSize;
    const netPosition = share - totalPenalty; // positive = gain, negative = owe

    // Check if they've checked in today
    const checkedInToday = userCheckIns.some(
      (checkIn) => checkIn.date === today
    );

    return {
      name: user.name,
      slug: user.slug,
      daysCompleted,
      totalPenalty,
      netPosition,
      checkedInToday,
    };
  });

  // Sort by net position (highest to lowest)
  leaderboardData.sort((a, b) => b.netPosition - a.netPosition);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            75 Hard Challenge
          </h1>
          <p className="text-zinc-300 text-lg">{group.name}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 text-center">
            <p className="text-zinc-600 text-sm font-medium mb-2">Pool Total</p>
            <p className="text-4xl font-bold text-zinc-900">${poolTotal}</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center">
            <p className="text-zinc-600 text-sm font-medium mb-2">
              Days Remaining
            </p>
            <p className="text-4xl font-bold text-zinc-900">{daysRemaining}</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center">
            <p className="text-zinc-600 text-sm font-medium mb-2">
              Each Share
            </p>
            <p className="text-4xl font-bold text-zinc-900">
              ${(poolTotal / groupSize).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Today's Check-In Status */}
        <div className="bg-white rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">
            Today's Check-Ins
          </h2>
          <div className="flex flex-wrap gap-2">
            {leaderboardData.map((user) => (
              <div
                key={user.slug}
                className={`px-4 py-2 rounded-lg font-medium ${
                  user.checkedInToday
                    ? "bg-green-100 text-green-800"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {user.checkedInToday ? "✓" : "○"} {user.name}
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="bg-zinc-900 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Leaderboard</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Penalties
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider">
                    Net Position
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-200">
                {leaderboardData.map((user, index) => (
                  <tr
                    key={user.slug}
                    className={index === 0 ? "bg-yellow-50" : ""}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-2xl font-bold text-zinc-900">
                        {index === 0 ? "🏆" : index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`/checkin/${user.slug}`}
                        className="text-lg font-medium text-zinc-900 hover:text-zinc-600"
                      >
                        {user.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-zinc-900">{user.daysCompleted}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-red-600 font-medium">
                        ${user.totalPenalty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`font-bold text-lg ${
                          user.netPosition >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {user.netPosition >= 0 ? "+" : ""}$
                        {user.netPosition.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 text-center">
          <p className="text-zinc-400 text-sm mb-4">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-3">
            {users.map((user) => (
              <a
                key={user.slug}
                href={`/checkin/${user.slug}`}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm"
              >
                {user.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
