# YOMIAN ENGLISH v1.3.0

## Japanese v6.11.x 공통 UX 이식
- 진행 중 학습 자동 저장 및 `이어하기` 추가
- 홈으로 이동하거나 학습을 중단해도 현재 문제 위치 보존
- 오늘 완료한 카테고리 재진입 시 `복습하기 / 추가학습` 선택
- 한 번에 학습할 문제 수 5 / 10 / 15 / 20 / 30 설정
- 복습 간격 기본값 1 / 3 / 7일 설정
- 반복 숙달 시 복습 간격 자동 증가 ON/OFF
- 자동 백업(localStorage) + IndexedDB 이중 저장 보강
- 설정에서 자동백업 복원 지원
- 브라우저 영구 저장소 요청(persistent storage) 보강
- 출석 화면을 최근 날짜 목록에서 월간 캘린더로 개선

## UI / UX
- 강한 블루 중심 UI를 뉴트럴 화이트/슬레이트/다크 네이비 기반으로 전면 정리
- 상태 강조만 청록색으로 제한해 심플하고 모던한 톤 적용
- 완료 카테고리: 청록 테두리/배경 + `오늘 완료` 배지
- 홈 히어로: 오늘 완료 수 / 복습 대기 / 연속 학습 요약
- 난이도 필터에서 해당 레벨 자료가 없는 카테고리는 비활성화
- 카테고리 3열 / 태블릿 2열 / 모바일 1열
- 모바일 모달을 하단 시트 방식으로 변경
- 모바일 학습 화면의 상단 진행 상태와 하단 액션 가독성 개선
- 주요 터치 타깃 44px 이상
- 키보드 focus-visible 및 prefers-reduced-motion 접근성 대응
- 하단 내비게이션 현재 화면 표시
- 모바일에서도 설정 버튼 접근 가능하도록 개선

## Compatibility
- 2,358개 영어 콘텐츠 유지
- 로그인 / Supabase 테이블 / 사용자 ID / 기존 localStorage key 유지
- PWA identity 유지
  - id: `/anthony-english-coach/`
  - start_url: `/anthony-english-coach/`
  - scope: `/anthony-english-coach/`
- Smart Update 유지, cache version `1.3.0`
- 기존 v1.2.4 학습기록을 그대로 읽어 v1.3.0 상태 구조로 자동 보강
