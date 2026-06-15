# 국민연금 가입 사업장 조회 (national-pension-workplace)

`national-pension-workplace` 스킬은 공공데이터포털의 **국민연금공단_국민연금 가입 사업장 내역 서비스**(3046071, V2)를 `k-skill-proxy` 경유로 호출한다.

## 제공 기능

- 가입 사업장 후보: 사업장명 + 사업자번호 앞 6자리로 매칭, 자료생성년월별 중복은 사업장당 최신 월로 정리
- 단일 사업장 특정 시 상세: 가입자수(`jnngpCnt`), 당월 고지금액(`crrmmNtcAmt`), 신규취득/상실 인원
- 월별 가입 현황 시계열

## 인증/시크릿

사용자 로컬 시크릿은 필요 없다. upstream `DATA_GO_KR_API_KEY`는 프록시 서버에만 둔다(3046071 활용신청 필요). self-host 프록시는 `KSKILL_PROXY_BASE_URL`로 지정한다.

## 공개 범위

- 사업자번호는 앞 6자리만 공개(뒷자리 마스킹)되어 사업장명이 필수다. 후보가 여럿이면 동일성을 단정하지 않고 목록을 그대로 돌려준다.
- 법인·근로자 일정 규모 이상 사업장 위주로 공개되며, 소규모/개인 사업장은 미공개일 수 있다.

## 예시

```bash
python3 national-pension-workplace/scripts/national_pension_workplace.py \
  --name "삼성전자(주)" --b-no 124-81-00998
```

## 실패 모드

- `400 bad_request`: 사업장명 미입력
- `503 upstream_not_configured`: 프록시에 `DATA_GO_KR_API_KEY` 없음
- `502 upstream_forbidden`: 프록시 키가 3046071에 미신청
- `selected_candidate: null`: 후보 다수 — 사용자가 특정

## 공식 출처

- 공공데이터포털: <https://www.data.go.kr/data/3046071/openapi.do>
- upstream: `https://apis.data.go.kr/B552015/NpsBplcInfoInqireServiceV2`
- 프록시 route: `GET /v1/national-pension/workplace`
