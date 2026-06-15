# 금융위 기업기본정보 조회 (fsc-corporate-info)

`fsc-corporate-info` 스킬은 공공데이터포털의 **금융위원회_기업기본정보 서비스**(15043184, `getCorpOutline_V2`)를 `k-skill-proxy` 경유로 호출한다.

## 제공 기능

- 법인명(`corpNm`) 기준 후보: 대표자·설립일·업종 등 upstream 필드 원문
- 사업자번호 교차검증: 응답에 `bzno`가 있으면 입력 번호와 정확 일치하는 후보를 분리(없으면 교차검증 불가 표기)

## 인증/시크릿

사용자 로컬 시크릿은 필요 없다. upstream `DATA_GO_KR_API_KEY`는 프록시 서버에만 둔다(15043184 활용신청 필요). self-host 프록시는 `KSKILL_PROXY_BASE_URL`로 지정한다.

## 입력 제한

검색 파라미터가 `crno`(법인등록번호 13자리)/`corpNm`(법인명)뿐이라 **사업자번호 단독 조회가 불가**하다. 법인명으로 조회한다. `crno`는 사업자등록번호와 별개 번호다.

## 예시

```bash
python3 fsc-corporate-info/scripts/fsc_corporate_info.py --name "삼성전자" --b-no 124-81-00998
```

## 실패 모드

- `400 bad_request`: 법인명 미입력
- `503 upstream_not_configured`: 프록시에 `DATA_GO_KR_API_KEY` 없음
- `502 upstream_forbidden`: 프록시 키가 15043184에 미신청
- 빈 결과: 법인명 불일치 — 표기를 바꿔 재시도

## 공식 출처

- 공공데이터포털: <https://www.data.go.kr/data/15043184/openapi.do>
- upstream: `https://apis.data.go.kr/1160100/service/GetCorpBasicInfoService_V2/getCorpOutline_V2`
- 프록시 route: `GET /v1/fsc/corp-outline`
