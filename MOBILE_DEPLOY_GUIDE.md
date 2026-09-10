# 모바일 공개 배포 가이드 — v0.2

## 목표
배포가 끝나면 `https://...` 주소 하나를 카카오톡으로 보내고, 친구는 아이폰/갤럭시의 Safari/Chrome에서 링크를 눌러 회원가입 후 바로 같이 플레이합니다.

## Render 배포 권장 구성
이 프로젝트에는 `render.yaml`이 포함되어 있습니다.

1. 프로젝트를 GitHub 저장소에 업로드합니다.
2. Render에서 **Blueprint** 또는 **Web Service**로 저장소를 연결합니다.
3. Start Command는 `npm start`, Health Check는 `/healthz`를 사용합니다.
4. SQLite 캐릭터 데이터를 계속 보존하려면 `/var/data`에 Persistent Disk를 연결하고 `DATA_DIR=/var/data`로 둡니다.
5. 배포가 완료되면 Render가 발급한 `https://<서비스명>.onrender.com` 주소를 친구에게 보냅니다.

> 중요: Render의 Persistent Disk는 유료 Web Service에서 사용할 수 있습니다. 디스크 없이도 테스트 배포는 가능하지만, 재배포/재시작 시 계정과 캐릭터 데이터 보존을 보장할 수 없습니다.

## 모바일 설치
- Android/Chrome: 게임 우측 상단 `⬇️` 버튼 또는 브라우저 메뉴 → 앱 설치/홈 화면에 추가
- iPhone/Safari: 공유 버튼 → 홈 화면에 추가
- 설치 후에는 주소창 없이 앱처럼 실행됩니다.

## 친구 초대
게임 우측 상단 `↗️` 버튼을 누르면 휴대폰 공유 메뉴가 열립니다. 카카오톡을 선택해 현재 게임 주소를 전달할 수 있습니다.

## 운영 전 체크
- HTTPS 주소인지 확인
- 서로 다른 휴대폰 2대에서 회원가입/로그인
- 같은 낚시터에서 서로 캐릭터 표시 확인
- 채팅 송수신 확인
- 낚시 후 새로고침해도 레벨/가방/도감 유지 확인
- 서버 재배포 후에도 데이터 유지 확인(Persistent Disk 사용 시)
