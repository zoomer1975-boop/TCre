# 통계 페이지 추가 계획

## Summary

- 새 관리자 전용 라우트 `/statistics`를 추가하고 사이드바 메뉴명을 `통계`로 표시한다.
- 기본 조회 기간은 최근 12개월이며, URL 쿼리 `from`, `to`, `relationshipScope`로 기간 검색과 관계도 범위를 유지한다.
- 월별 그래프는 `공헌등록건수`를 막대, `승인건수`를 선으로 한 화면에 표시한다.
- 회원 관계 그래프는 D3 force graph로 표시하고, 기여자 중심으로 추천자/승인자 관계선을 연결한다.

## Key Changes

- `d3`, `@types/d3`를 추가한다.
- `src/app/statistics/page.tsx`에서 관리자 권한을 확인하고 데이터 로드/기간 필터를 처리한다.
- `src/components`에 클라이언트 그래프 컴포넌트를 추가한다.
- 월별 통계는 `Contribution.createdAt` 기준 등록건수, `Approval.createdAt` 기준 승인건수로 집계한다.
- 관계도는 `contributorId -> recommenderId`, `contributorId -> approverId`로 연결한다.
- 선 라벨은 `추천자`, `승인자`로 구분한다.
- 회원 노드는 원형 아바타로 표시하고 현재는 이름 첫 글자 placeholder를 사용한다. 이미지 필드는 추후 추가 전까지 스키마 변경하지 않는다.

## Interfaces

- 월별 통계 타입: `{ month: "YYYY-MM"; registrations: number; approvals: number }`
- 관계 노드 타입: `{ id: string; name: string; role: "contributor" | "recommender" | "approver" | "mixed"; imageUrl?: string }`
- 관계 엣지 타입: `{ source: string; target: string; relation: "recommender" | "approver"; count: number }`
- 검색 쿼리:
  - `from=YYYY-MM`
  - `to=YYYY-MM`
  - `relationshipScope=period | all`

## Test Plan

- 통계 집계 유틸 테스트:
  - 최근 12개월 기본 범위 생성
  - 등록/승인 월별 카운트 집계
  - 기간 밖 데이터 제외
  - 같은 회원 간 관계 중복 시 `count` 누적
- 권한 테스트 또는 수동 확인:
  - ADMIN은 `/statistics` 접근 가능
  - 비관리자는 `notFound()` 처리
- 검증 명령:
  - `npm run test`
  - `npm run build`
