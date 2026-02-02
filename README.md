# SnapScript - Obsidian 텍스트 변환 플러그인

SnapScript는 Obsidian에서 선택한 텍스트를 빠르게 변환하고 처리할 수 있는 플러그인입니다. 사용자가 직접 JavaScript 스크립트를 작성하여 다양한 텍스트 변환 작업을 자동화할 수 있습니다.

## 주요 기능

- 📝 텍스트 선택 시 자동으로 스크립트 메뉴 표시
- 🔧 사용자 정의 JavaScript 스크립트로 텍스트 변환
- 🎨 스크립트 버튼마다 색상 지정 가능
- 📋 다중 선택 텍스트 처리 지원
- 📤 스크립트 가져오기/내보내기
- ⌨️ 단축키 지원 (`Ctrl/Cmd+Shift+P`)
- 🔄 사용자 입력을 받을 수 있는 대화형 스크립트

## 설치 방법

### 수동 설치

1. 최신 릴리스를 [GitHub 저장소](https://github.com/kanghangsu/snapscript)에서 다운로드
2. 압축 파일을 Obsidian 볼트의 `.obsidian/plugins/snapscript` 폴더에 압축 해제
3. Obsidian 앱에서 플러그인을 활성화

## 사용 방법

### 기본 사용법

1. 노트에서 텍스트를 선택합니다
2. 선택한 텍스트 주변에 나타나는 스크립트 메뉴에서 원하는 스크립트를 클릭합니다
3. 선택한 텍스트가 스크립트에 의해 변환됩니다

### 단축키

- `Ctrl/Cmd+Shift+P`: 스크립트 메뉴 표시

### 스크립트 관리

플러그인 설정에서 다음 작업을 수행할 수 있습니다:

- 새 스크립트 추가
- 기존 스크립트 편집
- 스크립트 삭제
- 스크립트 테스트
- 스크립트 순서 변경 (드래그 앤 드롭)
- 스크립트 가져오기/내보내기

## 스크립트 작성하기

### 기본 구조

스크립트는 JavaScript로 작성되며 선택한 텍스트를 처리하여 변환된 결과를 반환합니다.

```javascript
// 기본 스크립트 구조
// text: 선택된 텍스트
// editor: 편집기 객체
return `변환된 ${text}`;
```

### 사용 가능한 객체 및 함수

스크립트 내에서 다음 객체와 함수를 사용할 수 있습니다:

- `text`: 선택된 텍스트 문자열
- `editor`: 현재 편집기 객체, 텍스트 조작 및 선택 관리를 위한 메서드 제공

### 대화형 함수

스크립트에서 다음과 같은 대화형 함수를 사용할 수 있습니다:

```javascript
// 사용자에게 입력 요청
const userInput = await showPrompt("제목", "설명", "기본값");

// 여러 입력 필드 표시
const result = await showMultiInputPrompt("양식 제목", [
  { id: "field1", label: "필드1", initialValue: "기본값" },
  { id: "field2", label: "필드2" }
]);

// 선택 목록 표시
const selection = await showSuggestPrompt("선택하세요", [
  { label: "옵션 1", value: "value1", description: "설명1" },
  { label: "옵션 2", value: "value2", description: "설명2" }
]);

// 퍼지 검색 선택 목록
const fuzzySelection = await showFuzzySuggestPrompt("검색", [
  { label: "항목 1", value: "value1", description: "설명1" }
]);

// 알림 표시
showNotice("알림 메시지", 3000); // 3000ms 동안 표시
```

## 예제 스크립트

### 텍스트를 볼드체로 변환

```javascript
return `**${text}**`;
```

### 텍스트를 이탤릭체로 변환

```javascript
return `*${text}*`;
```

### 링크 생성

```javascript
const url = await showPrompt("URL 입력", "https://");
return `[${text}](${url})`;
```

### 날짜 추가

```javascript
const now = new Date();
const formattedDate = now.toISOString().split('T')[0];
return `${text} (${formattedDate})`;
```

### HTML 태그 제거

```javascript
return text.replace(/<[^>]*>/g, '');
```

### 마크다운 테이블 생성

```javascript
const rows = text.split('\n');
const headers = rows[0].split(',');
let markdown = '| ' + headers.join(' | ') + ' |\n';
markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

for(let i = 1; i < rows.length; i++) {
  if(rows[i].trim() === '') continue;
  const columns = rows[i].split(',');
  markdown += '| ' + columns.join(' | ') + ' |\n';
}

return markdown;
```

## 설정 옵션

### 메뉴 위치

스크립트 메뉴가 표시되는 위치를 설정할 수 있습니다:
- 아래: 선택 영역 아래에 메뉴 표시
- 위: 선택 영역 위에 메뉴 표시
- 왼쪽: 선택 영역 왼쪽에 메뉴 표시
- 오른쪽: 선택 영역 오른쪽에 메뉴 표시

### 설정 버튼 표시

메뉴에 항상 설정 버튼을 표시할지 여부를 설정할 수 있습니다.

## 스크립트 가져오기/내보내기

### 스크립트 내보내기

1. 플러그인 설정에서 '내보내기' 버튼 클릭
2. `SnapScript-scripts.json` 파일이 다운로드됨

### 스크립트 가져오기

1. 플러그인 설정에서 '가져오기' 버튼 클릭
2. JSON 파일 선택
3. 가져올 스크립트 선택
4. '가져오기' 버튼 클릭

## 문제 해결 및 FAQ

**Q: 텍스트를 선택해도 메뉴가 나타나지 않습니다.**  
A: 플러그인이 활성화되어 있는지 확인하고, 단축키 `Ctrl/Cmd+Shift+P`를 사용해보세요.

**Q: 스크립트가 작동하지 않습니다.**  
A: 스크립트 코드를 테스트 기능을 통해 확인해보세요. JavaScript 문법 오류가 있을 수 있습니다.

**Q: 여러 줄의 텍스트를 선택하면 어떻게 처리되나요?**  
A: SnapScript는 여러 줄의 텍스트도 동일하게 처리합니다. 다중 선택도 지원합니다.
