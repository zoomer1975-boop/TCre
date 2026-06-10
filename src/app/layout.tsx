import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/providers/identity";
import {
  getCumulativeCreditsForUser,
  getPendingApprovalCountForUser,
  getPendingRecommendationCountForUser,
  listUsers
} from "@/lib/server/tcredit-repository";

export const metadata: Metadata = {
  title: "Contribution Log",
  description: "Contribution Log and T-Credit MVP"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, users] = await Promise.all([getCurrentUser(), listUsers()]);
  const [cumulativeCredits, pendingApprovalCount, pendingRecommendationCount] = await Promise.all([
    getCumulativeCreditsForUser(user.id),
    getPendingApprovalCountForUser(user),
    getPendingRecommendationCountForUser(user.id)
  ]);
  const headerActionCount = user.roles.includes("APPROVER") ? pendingApprovalCount : pendingRecommendationCount;

  return (
    <html lang="ko">
      <body>
        <AppShell
          user={user}
          users={users}
          cumulativeCredits={cumulativeCredits}
          headerActionCount={headerActionCount}
          pendingApprovalCount={pendingApprovalCount}
          pendingRecommendationCount={pendingRecommendationCount}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
