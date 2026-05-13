# 마이리얼트립 MCP 검색 가이드

`myrealtrip-search`는 마이리얼트립 공식 개발자센터가 공개한 Streamable HTTP MCP 서버를 직접 호출해 항공권, 숙소, 투어·티켓·액티비티를 검색하는 스킬이다.

- 공식 문서: <https://docs.myrealtrip.com/#/api/mcp/overview>
- 설정 문서: <https://docs.myrealtrip.com/#/api/mcp/setup>
- 기본 endpoint: `https://mcp-servers.myrealtrip.com/mcp`
- 인증: 문서 기준 불필요

## 설치

Python MCP SDK가 필요하다.

```bash
python3 -m pip install mcp
```

Hermes Agent에 MCP 서버로 직접 붙이고 싶다면 다음처럼 등록한다.

```yaml
mcp_servers:
  myrealtrip:
    url: "https://mcp-servers.myrealtrip.com/mcp"
```

직접 MCP 설정을 하지 않아도 스킬에 포함된 래퍼를 사용할 수 있다.

```bash
python3 myrealtrip-search/scripts/myrealtrip_mcp.py tools
```

## 주요 도구

| 도구 | 용도 |
| --- | --- |
| `searchDomesticFlights` | 김포↔제주 등 국내선 항공권 실시간 검색 |
| `searchInternationalFlights` | 인천↔해외 공항 국제선 항공권 실시간 검색 |
| `flightsFareCalendar` | 날짜별 최저가 캘린더 조회. 캐시/추정값이므로 실제 검색으로 재확인 필요 |
| `getPromotionAirlines` | 항공권 특가·프로모션 항공사 확인 |
| `searchStays` | 호텔·펜션·리조트 등 숙소 검색 |
| `getStayDetail` | 숙소 객실, 가격, 취소정책, 시설, 리뷰 상세 확인 |
| `getCategoryList` | 도시별 투어/액티비티 카테고리 값 확인 |
| `searchTnas` | 투어·티켓·액티비티 검색 |
| `getTnaDetail` | 투어/티켓 상세 정보 확인 |
| `getTnaOptions` | 특정 날짜의 옵션, 가격, 예약 가능 여부 확인 |

## 예시

### 국제선 검색

```bash
python3 myrealtrip-search/scripts/myrealtrip_mcp.py call searchInternationalFlights \
  --json '{"tripType":"ROUND_TRIP","origin":"ICN","destination":"KIX","departDate":"2026-06-10","returnDate":"2026-06-14","passengers":{"adults":1,"children":0,"infants":0},"maxResults":5}'
```

### 숙소 검색

```bash
python3 myrealtrip-search/scripts/myrealtrip_mcp.py call searchStays \
  --json '{"keyword":"부산 해운대","checkIn":"2026-06-10","checkOut":"2026-06-12","adultCount":2,"childCount":0,"isDomestic":true,"order":"recommended"}'
```

### 투어/티켓 검색

```bash
python3 myrealtrip-search/scripts/myrealtrip_mcp.py call searchTnas \
  --arg query="오사카 유니버설 스튜디오" \
  --arg perPage=5
```

날짜별 실제 옵션과 가격은 검색 결과의 `gid`, `url`로 다시 확인한다.

```bash
python3 myrealtrip-search/scripts/myrealtrip_mcp.py call getTnaOptions \
  --json '{"gid":"123456","url":"https://www.myrealtrip.com/offers/123456","selectedDate":"2026-06-10"}'
```

## 운영 원칙

- 예약/결제/로그인은 자동화하지 않는다. 결과와 예약 URL만 제공한다.
- 가격, 좌석, 재고, 예약 가능 여부는 변동 가능하므로 답변에 명시한다.
- 항공 최저가 캘린더는 캐시/추정값이므로 실시간 검색 결과를 우선한다.
- 숙소 상세 질문은 목록 결과의 `gid`로 `getStayDetail`을 이어서 호출한다.
- 도시별 투어 카테고리 값은 추측하지 말고 `getCategoryList` 결과를 사용한다.
