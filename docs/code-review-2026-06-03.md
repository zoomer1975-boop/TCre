# 코드 리뷰: T-Credit (Next.js 16 / Prisma / React 19)

**작성일**: 2026-06-03
**대상**: 커밋 전 신규 프로젝트 전체 (`src/`, `prisma/`)
**검증**: 테스트 3/3 통과 · 시크릿 누출 없음(`.env`는 `.gitignore` 처리됨, 로컬 더미 자격증명만 존재)
**판정**: **REQUEST CHANGES**

---

## 요약

도메인 로직과 UI 구조는 깔끔하고 잘 분리되어 있다. 다만 **서버 액션(상태 변경 진입점)에 인가(authorization) 검사가 전혀 없고**, 입력 enum 검증이 빠져 데이터 무결성 버그로 이어진다. 목(mock) 인증 프로토타입이라는 점을 감안해도 승인/크레딧 발행 경로는 보완이 필요하다.

---

## 🔴 CRITICAL — 배포 시 즉시 위험

### 1. 상태 변경 서버 액션에 인가 검사 부재

`submitApprovalAction` (`src/app/approvals/actions.ts:21`)은 `getCurrentUser()`로 행위자만 식별할 뿐, **그 사용자가 `APPROVER`/`ADMIN` 역할인지, 해당 공헌의 소속 조직 승인권자인지 전혀 확인하지 않는다.** 누구든 이 액션을 호출해 임의 공헌을 승인하고 크레딧(=예산/원화)을 발행할 수 있다.

설상가상으로:

- `getDefaultUser()` (`src/lib/server/tcredit-repository.ts:140`)는 쿠키 없는 방문자에게 **기본값으로 ADMIN(user-05)**을 부여한다.
- `switchUserAction` (`src/app/account/actions.ts:8`)은 인증 없이 아무 `userId`로나 신원을 바꿔준다.

→ 결과적으로 익명 방문자가 관리자 권한으로 크레딧을 발행할 수 있는 구조다. `getPendingApprovalCountForUser`는 역할을 검사하지만(`src/lib/server/tcredit-repository.ts:295`) 정작 쓰기 경로인 `submitApproval`은 검사하지 않는다.

**권고**: `submitApprovalAction` 진입부에서

- `canAccessRole(user, "APPROVER")` 확인
- 공헌 `relatedOrgUnitCode === user.orgUnitCode`(ADMIN 제외) 확인
- 공헌 상태가 `PENDING_APPROVAL`인지 확인

인가는 페이지가 아니라 **서버 액션/리포지토리 계층**에서 강제해야 한다.

> 참고: 쿠키명이 `tcredit_mock_user_id`이고 `IdentityProvider` 인터페이스가 있는 걸 보면 의도된 데모용 목 인증이다. 다만 실제 인증으로 교체하더라도 **인가 검사는 여전히 비어 있게** 되므로 지금 서버 계층에 넣어두는 것이 맞다.

---

## 🟠 HIGH

### 2. 빈 목록일 때 페이지 크래시 — `src/app/approvals/page.tsx:15-16`

```ts
const target = contributions.find(/* ... */) ?? contributions[0]; // 빈 배열이면 undefined
const targetRecommendations = recommendations.filter((i) => i.contributionId === target.id); // ← TypeError
```

공헌이 하나도 없으면 `target.id`에서 런타임 에러로 페이지 전체가 죽는다. `if (!target) return <EmptyState/>` 가드 필요.

### 3. enum 입력 미검증 → NaN 크레딧 저장 — `src/app/contributions/actions.ts:46`, `src/app/approvals/actions.ts:26`

`requestedTier`, `finalTier`, `type`, `decision`을 검증 없이 `as "L1"|"L2"|"L3"`로 단언한다. 조작된 폼이 `requestedTier=L9`를 보내면 `tierMultipliers["L9"]`가 `undefined` → `calculateCredit`가 **NaN**을 반환하고 그대로 DB에 저장된다. 전역 코딩 규칙(시스템 경계에서 Zod 검증)에도 어긋난다.

**권고**: 허용값 화이트리스트 또는 Zod `z.enum([...])`로 파싱 후 진행.

---

## 🟡 MEDIUM

### 4. "현재 시각"을 하드코딩 — `src/app/contributions/actions.ts:41`

```ts
const submittedAt = new Date("2026-06-02");
```

30일 기한(`isSubmittedWithin30Days`) 판정이 고정 날짜 기준이라 실제 운영에서 항상 어긋난다. 데모 의도여도 `new Date()` + 주석 또는 주입형 clock 권장.

### 5. 리포지토리의 광범위한 `as PrismaXRow` 캐스팅 — `src/lib/server/tcredit-repository.ts:118-240`

Prisma가 추론해 주는 타입을 수동 행(row) 타입으로 덮어쓰고 있어, 스키마 변경 시 컴파일러가 불일치를 못 잡는다. Prisma `select`/`include` 추론 타입을 그대로 쓰는 편이 안전하다.

### 6. 테스트 커버리지 부족 — `src/lib/domain.test.ts`

순수 도메인 함수 3건만 테스트한다(전역 규칙 80% 목표 대비 낮음). 인가 분기(`canAccessRole`의 false 케이스), 리포지토리 트랜잭션(`createContribution`/`submitApproval`), 서버 액션 검증 로직에 테스트가 없다. 특히 위 #1·#3 회귀 방지 테스트를 권장한다.

---

## 🟢 LOW / 양호한 점

- 시크릿 누출 없음, `.env` 정상 ignore, `console.log` 없음. ✅
- `submitRecommendationComment`는 소유자 검증을 제대로 한다(`src/lib/server/tcredit-repository.ts:438`) — 이 패턴을 승인 경로에도 적용하면 된다.
- 도메인 모델·타입 정의 명료, 트랜잭션과 감사 로그(`auditEvent`) 처리 적절.
- (LOW) `createContribution`에서 `recommenderIds` 중복 제거가 액션과 리포지토리 양쪽에 중복(`src/app/contributions/actions.ts:48`, `src/lib/server/tcredit-repository.ts:322`) — 한 곳으로 통합 가능.

---

## 검증 결과

| 항목 | 결과 |
|---|---|
| 테스트 (`npm test`) | ✅ 3/3 통과 |
| 시크릿 스캔 | ✅ 누출 없음 (`.env` gitignore 처리) |
| Lint / Build | ⏭️ 미실행 |

---

## 우선순위 (병합 전 처리)

1. 서버 액션/리포지토리에 인가 검사 추가 (#1)
2. 빈 목록 가드 (#2)
3. enum 입력 검증 (#3)

#1·#3은 실제 인증을 붙이는 순간 보안 결함으로 직결되므로 지금 서버 계층에서 막아두는 것을 강력히 권한다.
