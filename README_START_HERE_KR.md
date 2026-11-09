# YOMIAN ENGLISH v1.2.2

## Chrome/Android “이미 설치됨” 복구 기능
- 메인 manifest에 명시적 App ID(`./`)를 추가했습니다.
- 설치하지 않았거나 삭제했는데도 Chrome이 “이미 설치됨”으로 판단할 때는 배포 주소 뒤에 `/reinstall.html`을 붙여 접속하세요.
- 복구 페이지는 별도의 App ID(`./reinstall-v1`)를 사용합니다.
- 앱 내부 설정 → `앱 설치 · 재설치 복구`에서도 복구 페이지로 이동할 수 있습니다.
- 로그인, Supabase, 학습기록은 기존과 동일하게 사용합니다.
- Supabase SQL 재실행은 필요 없습니다.

## GitHub 업데이트
기존 저장소에 패치 파일을 덮어쓴 후 GitHub Desktop에서 `Commit to main` → `Push origin` 하세요.
Smart Update가 이미 적용된 v1.2.1 사용자는 안전한 시점에 v1.2.2가 자동 반영됩니다.

---

# YOMIAN ENGLISH v1.2.1

이번 버전은 기존 **ANTHONY ENGLISH COACH v1.1.2**에서 바로 업데이트할 수 있는 YOMIAN 리브랜딩 최종본입니다.

## 변경 사항
- 앱 표시명: `YOMIAN ENGLISH`
- 짧은 설치명: `YOMIAN EN`
- 일본어 앱과 쉽게 구별되는 영어 전용 새 아이콘 적용
- 아이콘에 영국/미국 국기 반영
- 로그인 화면, 상단 브랜드, 브라우저 제목, PWA Manifest, Push 알림 제목을 YOMIAN으로 변경
- 기존 Smart Update 유지
- 학습기록/계정/Supabase 구조 유지

## 기존 사용자 데이터
학습기록을 유지하기 위해 내부 localStorage 키와 일부 코드 식별자는 `anthony_en_*` 이름을 그대로 유지합니다. 이것은 사용자에게 보이는 브랜드명이 아니며, 변경하면 기존 진도가 초기화될 수 있어 의도적으로 유지한 것입니다.

## GitHub 업데이트
1. `YOMIAN_English_v1_1_2_to_v1_2_1_FINAL_PATCH.zip` 압축을 풉니다.
2. 압축을 푼 폴더 안의 파일을 현재 `anthony-english-coach` 로컬 저장소 최상위에 덮어씁니다.
3. GitHub Desktop에서 변경 파일을 확인합니다.
4. Summary 예시: `YOMIAN ENGLISH v1.2.1 rebrand`
5. `Commit to main` → `Push origin`

## Smart Update
기존 v1.1.2에 Smart Update가 이미 들어 있으므로 GitHub Pages에 새 버전이 배포되면 앱이 자동으로 새 버전을 확인합니다.
- 학습/퀴즈/Listening/Speaking 중: 업데이트 보류
- 홈 화면 + 팝업 없음 + 학습 세션 없음: 안전한 시점에 자동 적용
- 앱 재실행/재활성화/인터넷 재연결/주기 확인 시 업데이트 확인

단, 설치된 PWA의 **이름과 OS 홈 화면 아이콘**은 브라우저/OS 정책에 따라 사용자 승인 또는 재설치가 필요할 수 있습니다. 앱 내부 이름과 화면은 Smart Update로 자동 반영됩니다.

## Push 알림을 사용 중이라면
앱 자체 업데이트에는 Supabase SQL 재실행이 필요 없습니다. 다만 실제 오후 7시 Push 알림 제목도 `YOMIAN ENGLISH`로 바꾸려면 포함된 `supabase/functions/english-daily-reminder/index.ts`로 Edge Function을 다시 배포해야 합니다.

## 앱 아이콘
- `yomian-english-icon-192-v3.png`
- `yomian-english-icon-512-v3.png`
- `yomian-english-icon-1024-v3.png`

Manifest는 192/512 v3 아이콘을 사용합니다.
