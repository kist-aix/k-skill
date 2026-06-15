# 인허가 영업상태 조회 (localdata-business-status)

`localdata-business-status` 스킬은 행정안전부 **지방행정 인허가데이터(LOCALDATA)**의 지역별 CSV를 `file.localdata.go.kr`에서 직접 받아 동네 사업장의 영업상태를 조회한다.

## 제공 기능

- 영업상태(영업/휴업/폐업)·상세영업상태·인허가일자(업력)·폐업일자·업태구분·도로명/지번 주소·데이터갱신시점
- 인허가 업종 **208종 전체** 지원 — 한글명("약국", "숙박업", "일반음식점")으로 지정 가능

## 인증/시크릿

없다. 무인증 공개 파일 서버이므로 프록시를 거치지 않고 사용자 머신에서 직접 호출한다. helper는 stdlib만 쓴다(추가 의존성 없음). 받은 파일은 1일 로컬 캐시한다.

## 입력/동일성 경계

- 전국 통파일이 업종당 수백 MB라 시군구 단위 지역 지정(`--region`)이 필요하다.
- 자료에 **사업자등록번호가 수록되지 않아** 상호(사업장명) 문자열 매칭만 가능하다. 동명 상호 가능성은 사용자가 판단한다.
- 자료는 매일 갱신되며 2일 전 기준으로 현행화된다.

## 예시

```bash
python3 localdata-business-status/scripts/localdata_business_status.py \
  --name "호텔샬롬" --region 제주제주시 --industry 숙박업

python3 localdata-business-status/scripts/localdata_business_status.py \
  --name "○○약국" --region 서울종로구 --industry 약국
```

## 입력

- `--name`: 상호(사업장명) — 필수
- `--region`: 시군구 — 필수 (예: `제주제주시`, `서울종로구`)
- `--industry`: 업종 slug 또는 한글명(여러 번 지정 가능). 생략 시 일반음식점·휴게음식점·숙박업

## 실패 모드

- `unavailable` + 안내: 상호/지역 미입력, 지역·업종 특정 실패(후보 나열), 다운로드 실패 — 수동 확인 URL 제공
- 0건: 매치 없음

## 공식 출처

- 인허가 영업상태: `https://file.localdata.go.kr/file/download/<업종slug>/info?orgCode=<지자체코드>` (무인증, Referer 필요, CP949 CSV)
- 본체: <https://www.localdata.go.kr>
