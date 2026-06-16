# 카카오톡 Mac 아카이브 검색 가이드

## 이 기능으로 할 수 있는 일

- Apple Silicon macOS에서 `katok`으로 카카오톡 로컬 대화 아카이브 생성
- keyword, BM25, semantic 검색
- 검색 결과의 chunk id로 원문, 주변 맥락, parent window 조회
- 검색 전 freshness 확인과 sync/index 필요 여부 판단

이 가이드는 기존 `kakaotalk-mac` 스킬 경로를 유지하지만 실행 표면은 `katok` CLI다. 메시지 전송, 삭제, UI 자동화, 직접 DB 읽기, 인증 캐시 처리, 복호화 material 처리는 포함하지 않는다.

## 먼저 필요한 것

- Apple Silicon macOS
- KakaoTalk for Mac 설치
- Homebrew 또는 Cargo
- `katok` CLI
- 현재 터미널 앱의 Full Disk Access 권한

## 설치

Homebrew:

```bash
brew tap NomaDamas/katok https://github.com/NomaDamas/katok.git
brew install katok
```

Cargo:

```bash
cargo install katok
export PATH="$HOME/.cargo/bin:$PATH"
```

Cargo 설치 후 `katok`이 보이지 않으면 `$HOME/.cargo/bin`을 shell PATH에 추가한다.

## 개인 정보와 안전 규칙

- Do not inspect local database internals from this skill.
- Do not directly read KakaoTalk DB files.
- Do not handle auth caches or decryption material.
- live macOS 카카오톡 ingestion은 `katok sync --source macos --json`으로만 수행한다.
- 검색 결과는 snippet과 chunk id 중심으로 먼저 다룬다.
- 사용자가 특정 결과를 열어 달라고 하거나 chunk id를 제공했을 때만 chunk 원문을 조회한다.

## 기본 흐름

1. `katok doctor --json`으로 freshness와 준비 상태를 확인한다.
2. Full Disk Access 설정이 필요하면 `katok permissions macos`로 시스템 설정 화면을 연다.
3. 앱 설치, container, DB 파일 접근 진단이 필요할 때만 `katok doctor --macos-probe --json`을 실행한다.
4. 최신성이 중요하거나 sync 권장이 있으면 `katok sync --source macos --json`을 실행한다.
5. semantic search 전에 index 권장이 있으면 `katok index --json`을 실행한다.
6. 질의 성격에 따라 `katok search keyword`, `katok search bm25`, `katok search semantic`을 선택한다.
7. 사용자가 지정한 결과만 `katok chunk get`, `katok chunk context`, `katok chunk parent`로 연다.

## 예시

```bash
katok doctor --json
katok permissions macos
katok doctor --macos-probe --json
katok sync --source macos --json
katok index --json
katok search keyword "계약서" --json
katok search bm25 "지난주 미팅 자료" --json
katok search semantic "최근에 논의한 세금 신고 일정" --json
katok chunk get <chunk-id> --json
katok chunk context <chunk-id> --json
katok chunk parent <chunk-id> --json
```

## 검색 방식 선택

`katok search keyword`는 정확한 문자열, 이름, 계좌번호, 고유명사처럼 그대로 기억나는 값을 찾을 때 쓴다.

`katok search bm25`는 여러 단어가 섞인 일반 질의에 쓴다.

`katok search semantic`은 표현이 정확히 기억나지 않지만 의미가 비슷한 대화를 찾을 때 쓴다. `katok doctor --json`에서 semantic index 갱신이 필요하다고 나오면 먼저 `katok index --json`을 실행한다.

## chunk 조회

검색 결과에서 더 넓은 맥락이 필요할 때만 chunk 명령을 사용한다.

```bash
katok chunk get <chunk-id> --json
katok chunk context <chunk-id> --json
katok chunk parent <chunk-id> --json
```

- `chunk get`: 해당 chunk 원문 조회
- `chunk context`: 같은 채팅방의 바로 앞뒤 micro chunk 조회
- `chunk parent`: semantic search가 사용한 더 큰 parent window 조회

## Synthetic QA

실제 카카오톡 설치 없이 upstream fixture로 테스트할 때만 아래 경로를 쓴다.

```bash
katok sync --source fixture tests/fixtures/kakao/replies.jsonl --json
KATOK_EMBEDDER=local-test katok index --json
KATOK_EMBEDDER=mock katok index --json
```

실사용 경로에서는 fixture, mock embedder, 원격 embedding endpoint를 사용하지 않는다.

## 주의할 점

- Apple Silicon macOS 전용이다.
- Intel macOS는 packaged local EmbeddingGemma 경로의 지원 대상이 아니다.
- Full Disk Access는 사용자가 System Settings에서 직접 허용해야 한다.
- `katok doctor --macos-probe --json`은 macOS app-data 접근 prompt를 띄울 수 있으므로 setup 진단이 필요할 때만 실행한다.
- 이 스킬은 read/search/retrieve 전용이며 메시지 전송과 삭제를 지원하지 않는다.
