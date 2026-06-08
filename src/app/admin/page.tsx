import { Database, Settings2, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TextBadge } from "@/components/Badge";
import { canAccessRole, formatKrw, formatNumber } from "@/lib/domain";
import { createOrgNameLookup } from "@/lib/lookups";
import { getCurrentUser } from "@/lib/providers/identity";
import { getBudgetPool, listOrgUnits, listUsers } from "@/lib/server/tcredit-repository";

export default async function AdminPage() {
  const [currentUser, budgetPool, users, orgUnits] = await Promise.all([
    getCurrentUser(),
    getBudgetPool(),
    listUsers(),
    listOrgUnits()
  ]);
  if (!canAccessRole(currentUser, "ADMIN")) {
    notFound();
  }

  const orgNames = createOrgNameLookup(orgUnits);
  const approvers = users.filter((user) => user.roles.includes("APPROVER"));

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="관리자 설정"
        description="조직, 사용자, 승인권자, 예산 풀, 심의 임계값을 관리하는 운영자 화면입니다."
      />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="사용자" value={`${users.length}명`} detail="PostgreSQL 사용자 기준" />
        <StatCard label="조직" value={`${orgUnits.length}개`} detail="부서/단과대/팀" />
        <StatCard label="승인권자" value={`${approvers.length}명`} detail="팀장 및 부서장" />
        <StatCard label="예산" value={formatKrw(budgetPool.totalBudgetKrw)} detail={`${formatNumber(budgetPool.issuedCreditLimit)} C 발행 가능`} />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-line bg-white shadow-soft">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <UsersRound className="size-5 text-campus" aria-hidden="true" />
            <h2 className="text-lg font-bold text-ink">사용자 및 권한</h2>
          </div>
          <div className="table-scroll">
            <table className="min-w-full divide-y divide-line text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">사용자</th>
                  <th className="px-4 py-3">소속</th>
                  <th className="px-4 py-3">직책</th>
                  <th className="px-4 py-3">역할</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-ink">{user.name}</p>
                      <p className="mt-1 text-xs text-muted">{user.employeeNo}</p>
                    </td>
                    <td className="px-4 py-4 text-muted">{orgNames[user.orgUnitCode] ?? user.orgUnitCode}</td>
                    <td className="px-4 py-4 text-muted">{user.position}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.map((role) => (
                          <TextBadge key={role}>{role}</TextBadge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Database className="size-5 text-campus" aria-hidden="true" />
              <h2 className="text-lg font-bold text-ink">예산 풀</h2>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              {[
                ["운영 기간", `${budgetPool.year}년 ${budgetPool.term}`],
                ["총 예산", formatKrw(budgetPool.totalBudgetKrw)],
                ["1 Credit 명목가치", formatKrw(budgetPool.nominalCreditValue)],
                ["발행 가능 Credit", `${formatNumber(budgetPool.issuedCreditLimit)} C`]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Settings2 className="size-5 text-campus" aria-hidden="true" />
              <h2 className="text-lg font-bold text-ink">심의 임계값</h2>
            </div>
            <div className="mt-4 space-y-3">
              {[
                "승인권자가 한 사람에게 전체 권한의 40% 이상 배분",
                "공헌자의 반려 비율이 전체 입력 건의 50% 이상",
                "동일 내용 반복 또는 부서별 중복 승인 요청",
                "월말 승인 집중도가 평균 대비 2배 이상"
              ].map((rule) => (
                <div key={rule} className="rounded-md bg-slate-50 p-3 text-sm font-medium leading-6 text-ink">
                  {rule}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
