# 한국어 AI 윤문 (korean-humanizer) 가이드

## 이 기능으로 할 수 있는 일

- ChatGPT·Claude·Gemini 등이 쓴 "AI 티 나는" 한국어 글을 자연스러운 사람 글로 윤문
- 번역체, AI 상투어, 과도한 명사화·피동, 3의 법칙, 과장된 의의 부여, 마무리 상투구, 챗봇 잔재, 줄표·이모지·곡선따옴표 같은 흔적을 **심각도(S1/S2/S3)** 로 분류해 탐지
- "이 글에서 AI 흔적 찾아줘"처럼 고치지 않고 진단만 (탐지 리포트 + 심각도)
- 목표 글자수 지정 시(`length=1000`, "1000자로") ±5% 안으로 분량 조정, 공백 포함/제외 글자수 보고
- 사용자 글 샘플을 주면 그 말투(voice)로 재작성

## 왜 별도 스킬이 필요한가

- 영어권 humanizer(QuillBot·Undetectable AI 등)는 한국어에 약하다. 한국어 AI 글의 티는 대부분 **영어 번역투**와 격식을 가장한 **상투어**에서 나온다.
- 단순 맞춤법 교정(`korean-spell-check`)이나 유행어 입히기(`korean-slang-writing`)와 달리, 이 스킬은 의미를 보존하면서 **문체·리듬·표현**만 사람답게 되돌린다.
- 과교정을 막기 위해 4대 철칙(의미 불변 · 근거 기반 · 장르 유지 · 과윤문 금지)과 변경률 가드(30% 경고, 50% 중단)를 둔다.

## 먼저 필요한 것

- 추가 설치·API 키 없음. 이 스킬은 프롬프트/지식 기반이며 외부 호출이나 스크립트가 없다.
- (선택) 정확한 글자수 카운팅이 필요하면 `korean-character-count` 스킬과 연동된다.

## 기본 흐름 (탐지 → 윤문 → 감사 → 등급)

1. **트리아지** — 흔적이 무더기인지, 서식만 문제인지, 산문까지 다시 써야 하는지 먼저 정한다.
2. **탐지** — A~J 분류 카탈로그로 흔적을 span·심각도로 표시한다. S1부터 본다.
3. **윤문** — 흔적을 자연스러운 표현으로 교체한다. 의미·사실·고유명사·수치는 100% 보존한다.
4. **감사** — "왜 아직 AI 같은가?"를 다시 묻고, 자가검증 6항과 변경률을 점검한다. 위반이면 롤백 후 재윤문.
5. **등급** — A~D로 자가 채점한다. C·D면 추가 윤문이나 사람 검토를 권한다.

전체 패턴 표(A~J, 60+ 서브 패턴)는 스킬 디렉터리의 [`references/ai-tell-taxonomy.md`](../../korean-humanizer/references/ai-tell-taxonomy.md)에 있다.

## 사용 예시

```text
이 글 AI 티 안 나게 자연스럽게 다듬어줘:
[ChatGPT/Claude 초안 붙여넣기]
```

```text
이 글에서 AI 흔적만 찾아줘 (고치지 말고 심각도까지)
```

```text
1000자로 맞춰서 번역체 고쳐줘
```

## 제한사항

- 문체만 고친다. 사실관계 확인·출처 보강은 하지 않는다(필요하면 별도 리서치).
- 원문에 없는 내용을 창작해 채우지 않는다(의미 보존이 원칙).
- 변경률이 50%를 넘으면 작업을 중단하고 사람 검토를 권한다.

## 감사의 말 (Acknowledgments)

이 스킬은 두 기여 위에 만들어졌다.

- **[happy-nut](https://github.com/happy-nut) (Hyungsun Song)** 님이 PR [#311](https://github.com/NomaDamas/k-skill/pull/311)로 최초 `korean-humanizer` 스킬과 33개 한국어 패턴 카탈로그·예문, triage/length-control 설계를 기여했다. 이 가이드와 v2 스킬의 토대다.
- **[epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai)** (Humanize KR, MIT)의 방법론을 중심으로 v2를 재구성했다. A~J 분류 체계, S1/S2/S3 심각도, 4대 철칙, 변경률 30%/50% 가드, 품질 등급(A~D), 그리고 A-16(그/그녀 강박)·A-18(관계절 좌향 수식)·A-19(이중 조사)·C-11(연결어미 뒤 쉼표)·E-7(경어법 일관성) 같은 한국어 고유 패턴이 여기서 왔다.

원형은 영어권 [blader/humanizer](https://github.com/blader/humanizer)와 [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)이다. 두 프로젝트와 happy-nut 님의 기여에 감사한다.
