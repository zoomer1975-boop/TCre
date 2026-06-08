"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { StatusBadge, TextBadge } from "@/components/Badge";
import { ContributionStatus } from "@/lib/domain";

export type ApprovalHistoryRow = {
  id: string;
  title: string;
  description: string;
  contributorName: string;
  typeLabel: string;
  decision: Extract<ContributionStatus, "APPROVED" | "REJECTED">;
  finalCredit: number;
};

export function ApprovalHistoryTable({ rows }: { rows: ApprovalHistoryRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="table-scroll">
      <table className="min-w-full divide-y divide-line text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-muted">
          <tr>
            <th className="px-4 py-3">공헌</th>
            <th className="px-4 py-3">공헌자</th>
            <th className="px-4 py-3">유형</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length > 0 ? (
            rows.map((row) => {
              const expanded = expandedId === row.id;

              return (
                <Fragment key={row.id}>
                  <tr className={expanded ? "bg-slate-50/60" : undefined}>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : row.id)}
                        className="inline-flex max-w-full items-center gap-2 text-left font-semibold text-ink hover:text-campus"
                        aria-expanded={expanded}
                      >
                        <ChevronDown
                          className={`size-4 shrink-0 text-muted transition ${expanded ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                        <span className="break-words">{row.title}</span>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-muted">{row.contributorName}</td>
                    <td className="px-4 py-4">
                      <TextBadge tone="campus">{row.typeLabel}</TextBadge>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.decision} />
                    </td>
                    <td className="px-4 py-4 font-bold text-ink">{row.finalCredit} C</td>
                  </tr>
                  {expanded ? (
                    <tr className="bg-slate-50/60">
                      <td colSpan={5} className="px-4 pb-5 pt-0">
                        <div className="rounded-md border border-line bg-white p-4">
                          <p className="text-xs font-bold uppercase text-muted">공헌 내용</p>
                          <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{row.description}</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-muted">
                승인/반려 내역이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
