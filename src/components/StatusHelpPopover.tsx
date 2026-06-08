"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";
import { ContributionStatus, statusGuides, statusLabels } from "@/lib/domain";

const PANEL_WIDTH = 380;

function getPanelPosition(anchor: HTMLButtonElement, panelHeight = 0) {
  const rect = anchor.getBoundingClientRect();
  const viewportPadding = 16;
  const width = Math.min(PANEL_WIDTH, window.innerWidth - viewportPadding * 2);

  return {
    width,
    top: Math.max(viewportPadding, rect.top - panelHeight - 8),
    left: Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding)
  };
}

export function StatusHelpPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ width: PANEL_WIDTH, top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const guideEntries = Object.entries(statusGuides) as Array<
    [ContributionStatus, (typeof statusGuides)[ContributionStatus]]
  >;

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    setPosition(getPanelPosition(buttonRef.current, panelRef.current?.offsetHeight ?? 0));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const syncPosition = () => {
      if (buttonRef.current) {
        setPosition(getPanelPosition(buttonRef.current, panelRef.current?.offsetHeight ?? 0));
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex size-5 items-center justify-center text-campus transition hover:text-campus-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus/30"
      >
        <CircleHelp className="size-5 fill-emerald-50" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">상태 단계 설명 보기</span>
      </button>
      {mounted && isOpen
        ? createPortal(
            <div
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-labelledby={titleId}
              className="fixed z-50 rounded-lg border border-line bg-white p-4 text-left shadow-xl"
              style={{
                left: position.left,
                top: position.top,
                width: position.width
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 id={titleId} className="text-sm font-bold text-ink">
                    공헌 상태 안내
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted">현재 단계와 다음에 이어지는 처리를 확인합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus/30"
                >
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">닫기</span>
                </button>
              </div>
              <div className="mt-3 max-h-[min(28rem,calc(100vh-9rem))] overflow-y-auto pr-1">
                <dl className="space-y-3">
                  {guideEntries.map(([status, guide]) => (
                    <div key={status} className="rounded-md border border-line bg-slate-50 p-3">
                      <dt className="text-xs font-bold text-ink">{statusLabels[status]}</dt>
                      <dd className="mt-1 text-xs leading-5 text-muted">{guide.meaning}</dd>
                      <dd className="mt-2 text-xs leading-5 text-ink">{guide.nextStep}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
