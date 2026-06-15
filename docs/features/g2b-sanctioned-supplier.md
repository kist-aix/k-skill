# 부정당제재업체 조회 (g2b-sanctioned-supplier)

`g2b-sanctioned-supplier` 스킬은 공공데이터포털의 **조달청 나라장터 사용자정보 서비스**(15129466, `getUnptRsttCorpInfo02`)를 `k-skill-proxy` 경유로 호출한다.

## 제공 기능

- 사업자등록번호 정확 일치(`inqryDiv=1`)로 **조회시점 현재 유효한** 부정당제재 조회
- 반환: 제재 시작/종료일자, 제재기관명, 계약법구분, 제재근거법률 등 upstream 필드 원문

## 적용 범위 한계

upstream 명세상 다음은 제공되지 않는다(과거 이력 조회가 아니다).

- 조회시점에 제재만료·해제된 건
- 나라장터 미등록업체·개인에 대한 제재

만료 이력까지 보려면 나라장터(<https://www.g2b.go.kr>)에서 수동 확인이 필요하다.

## 인증/시크릿

사용자 로컬 시크릿은 필요 없다. upstream `DATA_GO_KR_API_KEY`는 프록시 서버에만 둔다(15129466 활용신청 필요). self-host 프록시는 `KSKILL_PROXY_BASE_URL`로 지정한다.

## 예시

```bash
python3 g2b-sanctioned-supplier/scripts/g2b_sanctioned_supplier.py --bizno 124-81-00998
```

## 실패 모드

- `400 bad_request`: 사업자번호가 10자리가 아님
- `503 upstream_not_configured`: 프록시에 `DATA_GO_KR_API_KEY` 없음
- `502 upstream_forbidden`: 프록시 키가 15129466에 미신청
- `total_count: 0`: 조회시점 유효 제재 없음(만료·미등록업체는 미제공임에 유의)

## 공식 출처

- 공공데이터포털: <https://www.data.go.kr/data/15129466/openapi.do>
- upstream: `https://apis.data.go.kr/1230000/ao/UsrInfoService02/getUnptRsttCorpInfo02`
- 수동 대조: 나라장터 <https://www.g2b.go.kr>
- 프록시 route: `GET /v1/g2b/sanctioned-supplier`
