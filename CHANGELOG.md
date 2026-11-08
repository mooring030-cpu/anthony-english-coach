# ANTHONY ENGLISH COACH v1.1.1

## Bug fix / QA patch
- 홈/←홈/학습완료 홈 이동 오류 수정 (`goHome` 전역 등록)
- 홈 이동 시 열린 모달과 재생 중 음성 정리
- 랭킹 점수 갱신 함수명 오류 수정
- 전체 학습자료 한글 검색 오류 수정
- 퀴즈 중복 보기 방지
- CEFR 레벨 선택 시 다른 레벨 자료가 섞이는 문제 수정
- 오늘의 10분 학습 완료 상태 표시 보강
- 퀴즈 화면의 말하기 인식 결과 피드백 보강
- 학습 진행률 표시 보정
- GitHub Pages 하위 경로에서 Push 알림 클릭 시 잘못된 루트로 이동하는 문제 수정
- 로그아웃 시 Push 구독 정리로 계정 전환 충돌 예방
- 서비스워커 캐시 버전 갱신 및 업데이트 확인 강화

# Changelog

## v1.1
- 학습 콘텐츠 2,358개로 확장
- Business English 10개 실무 트랙 신설
- 카테고리 UI를 기본 영어 / Business English로 분리
- 오후 7시 미학습 Push 발송용 Supabase Edge Function 추가
- Cron 템플릿 추가
- Service Worker 캐시 v1.1로 갱신
- v1.0 학습기록 호환 유지

## v1.0
- 최초 영어판
