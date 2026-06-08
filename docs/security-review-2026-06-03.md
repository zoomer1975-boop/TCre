# 재점검 + 보안 리뷰: T-Credit

**작성일**: 2026-06-03
**대상**: 커밋 전 전체 (`src/`, `prisma/`)
**검증**: `tsc --noEmit` 통과 · `vitest` 6/6 통과 · `npm audit` 취약점 0건

---

## 1부. 1차 리뷰 지적사항 재점검

| # | 지적 (1차) | 상태 | 확인 내용 |
|---|---|---|---|
| 1 | 서버 액션 인가 검사 부재 (CRITICAL) | ✅ **수정됨** | `submitApproval`이 `actor: User`를 받아 트랜잭션 내부에서 공헌을 조회하고 `canApproveContribution`(APPROVER 역할 + `PENDING_APPROVAL` 상태 + 조직 일치, ADMIN 우회)로 검증. 리포지토리 계층에서 강제됨 (`tcredit-repository.ts:373`). |
| 2 | 빈 목록 페이지 크래시 (HIGH) | ✅ **수정됨** | `approvals/page.tsx:18-33`에서 `canApproveContribution` 필터 후 `target` 없으면 빈 상태 UI 렌더. |
| 3 | enum 입력 미검증 → NaN 크레딧 (HIGH) | ✅ **수정됨** | `isContributionType`/`isEffortTier`/`isApprovalDecision` 타입 가드로 액션 진입부에서 차단 (`contributions/actions.ts:36-42`, `approvals/actions.ts:34-40`). |
| 4 | "현재 시각" 하드코딩 (MEDIUM) | ✅ **수정됨** | `new Date()`로 변경 (`contributions/actions.ts:49`). |
| 6 | 테스트 커버리지 부족 (MEDIUM) | ✅ **개선됨** | 인가 매트릭스·enum 가드 테스트 추가, 3→6건. |

**재점검 판정: 우선순위 1~3번 모두 적절히 해소됨.** 특히 인가를 페이지가 아닌 리포지토리/도메인 계층에 둔 것이 정확한 선택입니다.

---

## 2부. 보안 리뷰 (OWASP 체크리스트 기반)

### ✅ 양호

| 항목 | 결과 |
|---|---|
| 시크릿 관리 | 하드코딩 없음, `.env` gitignore, seed에 비밀값 없음 |
| SQL 인젝션 | Prisma 파라미터 바인딩, 문자열 연결 쿼리 없음 |
| XSS | React 자동 이스케이프, `dangerouslySetInnerHTML`/`eval` 없음 |
| 의존성 | `npm audit` 취약점 0건 |
| 쓰기 경로 인가 | 승인/추천 모두 서버 계층에서 소유자·역할 검증 |
| CSRF | Next.js Server Actions 내장 Origin 검증 + 쿠키 `httpOnly`,`sameSite=lax` |

### 🟠 HIGH — 읽기 페이지 서버측 인가 부재

`/admin`, `/committee`, `/approver-insights` 페이지에 **서버측 역할 검사가 없습니다.** 역할 게이팅은 `AppShell`의 클라이언트 측 내비 필터·리다이렉트뿐(`AppShell.tsx:63,77`)이라, URL로 직접 접근하면 현재 신원의 역할과 무관하게 렌더됩니다.

- `/admin`(`admin/page.tsx`): 전체 사용자 목록·권한·예산·조직도 노출
- `/committee`, `/approver-insights`: 심의/승인 통계 노출

**권고**: 각 페이지 서버 컴포넌트 진입부에서
```ts
const user = await getCurrentUser();
if (!canAccessRole(user, "ADMIN")) notFound(); // 또는 redirect("/")
```
승인 페이지(`approvals`)는 이미 `canApproveContribution` 필터로 사실상 가려지지만, 명시적 게이트를 두는 편이 일관적입니다.

### 🟠 HIGH — 신원 모델 자체 (배포 시 CRITICAL)

`getCurrentUser`는 `tcredit_mock_user_id` 쿠키 기반이고, `switchUserAction`은 인증 없이 임의 사용자로 전환을 허용하며, `getDefaultUser`는 쿠키 없는 방문자에게 **ADMIN을 기본 부여**합니다(`tcredit-repository.ts:140`). 의도된 데모 목 인증이지만, 실제 인증으로 교체하기 전까지는 위 #1의 인가 검증을 우회할 수 있는 유일한 약점입니다. `IdentityProvider` 인터페이스가 있으므로 실제 SSO/OIDC 어댑터로 교체 시 **기본 ADMIN 폴백을 제거**해야 합니다.

### 🟡 MEDIUM

1. **클라이언트로 원시 에러 메시지 전달** — `approvals/actions.ts:62`에서 `error.message`를 그대로 사용자에게 반환. 현재는 알려진 도메인 메시지만 던지지만, 예기치 못한 Prisma 오류가 발생하면 내부 정보가 노출될 수 있습니다. 알려진 검증 오류와 일반 오류를 구분해 일반 오류는 고정 메시지로 치환 권장.

2. **문자열 입력 길이 상한 부재** — `title`/`description`/`comment`/`reason`에 최대 길이 검증이 없습니다. 과대 페이로드 저장 가능. 필수값 검사에 `.length <= N` 상한 추가 권장.

3. **보안 헤더 미설정** — `next.config.ts`가 비어 있어 CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options` 없음. 운영 배포 전 `headers()`로 설정 필요(전역 web 보안 규칙 참조).

### 🟢 LOW

- **레이트 리미팅 없음** — 서버 액션에 호출 제한 없음. 프로토타입 단계에선 허용 가능하나 운영 전 도입 권장.
- 쿠키 `secure` 플래그 미지정(`account/actions.ts`) — 운영(HTTPS)에서 `secure: process.env.NODE_ENV === "production"` 추가 권장.

---

## 종합 판정

- **재점검**: ✅ 1차 우선순위(1~3) 모두 해결, 빌드/타입/테스트 통과.
- **보안 리뷰**: 쓰기 경로는 견고해졌으나 **읽기 페이지 서버측 인가(HIGH)**가 남아 있음.

### 운영 배포 전 권장 처리 순서
1. 민감 페이지(`/admin`,`/committee`,`/approver-insights`) 서버측 역할 게이트 추가 (HIGH)
2. 실제 인증 도입 시 `getDefaultUser`의 ADMIN 폴백 제거 (HIGH)
3. 에러 메시지 일반화 + 문자열 길이 상한 + 보안 헤더 (MEDIUM)
