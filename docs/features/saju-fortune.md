# 사주 운세 풀이 가이드

`saju-fortune`은 생년월일시와 성별을 인터뷰로 확인한 뒤 `saju-fortune` npm package를 사용해 사주팔자 기본 구조, 오행 분포, 주제별 운세, 궁합을 풀이하는 스킬이다.

## 기본 흐름

1. 이름(선택), 양력/음력, 생년월일, 태어난 시간, 성별, 출생 시군구(선택), 보고 싶은 주제를 먼저 확인한다.
2. 궁합은 두 사람 각각의 생년월일시와 성별을 확인한다.
3. `saju-fortune` package가 없으면 `npm install -g saju-fortune`으로 설치하고 `NODE_PATH="$(npm root -g)"`를 설정한다.
4. `analyzeSaju`, `checkCompatibility`, 또는 `callSajuTool`을 호출해 결과 JSON을 얻는다.
5. 결과를 바탕으로 사주팔자 요약, 오행 분포, 사용자가 고른 주제별 풀이, 실천 조언, 한계를 함께 전달한다.

## 입력값

| 항목 | 필수 여부 | 설명 |
| --- | --- | --- |
| 이름 | 선택 | 풀이 표시용 이름 |
| 양력/음력 | 필수 | 음력은 검증된 만세력으로 양력 변환 후 입력 |
| 생년월일 | 필수 | `YYYY-MM-DD` 형식 |
| 태어난 시간 | 권장 | 모르면 시주 기반 해석 한계를 명시 |
| 성별 | 필수 | package 호출 시 `male` 또는 `female` |
| 출생 시군구 | 선택 | 경도 보정이나 해석 맥락이 필요할 때 사용 |
| 주제 | 필수 | 종합운, 연애운, 재물운, 직업운, 건강운, 한해 운세, 궁합 |

## 사용 예시

```bash
NODE_PATH="$(npm root -g)" node - <<'JS'
const { analyzeSaju } = require("saju-fortune")

const result = analyzeSaju({
  name: "민준",
  birthDate: "1990-03-15",
  birthTime: "10:30",
  calendar: "solar",
  gender: "male",
  birthCity: "서울"
}, {
  analysisType: "fortune",
  fortuneType: "wealth",
  targetYear: 2026
})

console.log(JSON.stringify(result, null, 2))
JS
```

궁합은 `checkCompatibility`로 두 사람의 정보를 함께 전달한다.

```bash
NODE_PATH="$(npm root -g)" node - <<'JS'
const { checkCompatibility } = require("saju-fortune")

const result = checkCompatibility({
  person1: { name: "민준", birthDate: "1990-03-15", birthTime: "10:30", gender: "male" },
  person2: { name: "서연", birthDate: "1992-07-20", birthTime: "14:30", gender: "female" }
})

console.log(JSON.stringify(result, null, 2))
JS
```

## 주의사항

- 태어난 시간을 모르면 시주와 시주 기반 해석은 확정하지 않는다.
- 음력 또는 윤달 생일은 package 안에서 임의 변환하지 않는다.
- 사주 풀이는 재미와 자기점검용으로만 안내하고, 의료·투자·법률 판단을 대신하지 않는다.
- MCP 서버를 따로 실행하지 않고 로컬 또는 전역 npm package를 직접 호출한다.
