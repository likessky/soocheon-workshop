/**
 * ==============================================================================
 * 수천재작소 (SooCheon Workshop) - 구글 스프레드시트 연동 Apps Script (Code.gs)
 * ==============================================================================
 *
 * [버전 안내: v3.0 - 고유 ID 기반 CRUD & 카테고리(탭) 관리]
 *
 * v2와 달라진 점
 *  1. 프로젝트 시트에 I열(고유 ID)이 추가됩니다. 비어있는 행은 doGet 실행 시 자동으로
 *     ID가 부여(백필)되므로, 기존에 적어둔 내용은 그대로 두면 됩니다.
 *  2. 수정/삭제를 행 번호가 아닌 이 고유 ID로 찾습니다. 시트에서 행을 지우거나 정렬을
 *     바꿔도 엉뚱한 프로젝트가 수정/삭제되지 않습니다.
 *  3. '카테고리' 시트가 자동으로 만들어집니다. 웹 화면의 탭(분류)을 여기서 관리합니다.
 *  4. 웹 화면에서 등록/수정/삭제/탭관리를 모두 할 수 있도록 doPost가 action별로 나뉩니다.
 *
 * ------------------------------------------------------------------------------
 * [프로젝트 시트 1행 헤더 구성]
 *  A열: 웹사이트 URL          B열: 프로젝트 제목      C열: 프로젝트 설명
 *  D열: 썸네일 이미지 URL     E열: 카테고리           F열: 운영 상태
 *  G열: 다운로드 링크         H열: 기술 스택(콤마)    I열: 고유 ID (자동 생성, 건드리지 마세요)
 *
 * [카테고리 시트 구성 (자동 생성됨)]
 *  A열: 이름   B열: 아이콘(Font Awesome 클래스)   C열: 색상(#RRGGBB)   D열: 정렬순서   E열: 고유 ID
 *
 * ------------------------------------------------------------------------------
 * [적용 방법]
 * 1. 구글 스프레드시트 상단 메뉴 [확장 프로그램] > [Apps Script] 클릭
 * 2. 기존 코드를 모두 지우고 이 파일의 전체 내용을 붙여넣은 뒤 저장 (Ctrl + S)
 * 3. 우측 상단 [배포] > [배포 관리] > 연필(수정) 아이콘 > 버전: "새 버전" > [배포]
 *    ★ 중요: [새 배포]가 아니라 [배포 관리 > 수정 > 새 버전]으로 해야 기존 주소가 그대로 유지됩니다.
 *      (실수로 [새 배포]를 눌러 주소가 바뀌었다면, 웹 화면 우측 상단 [시트 연동]에 새 주소를 넣으면 됩니다.)
 */

// ------------------------------------------------------------------------------
// 설정 상수
// ------------------------------------------------------------------------------

/** 카테고리(탭) 정보를 담아둘 시트 이름 */
var CATEGORY_SHEET_NAME = "카테고리";

/** 프로젝트 시트의 마지막 데이터 열 (A~I = 9열) */
var PROJECT_LAST_COL = 9;

/** 고유 ID가 들어가는 열 번호 (I열 = 9번째) */
var PROJECT_ID_COL = 9;

/** 썸네일을 비워뒀을 때 대신 쓸 기본 이미지 */
var DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60";

/** 카테고리 시트를 처음 만들 때 채워 넣을 기본 탭 3종 */
var DEFAULT_CATEGORIES = [
  { name: "웹사이트", icon: "fa-solid fa-globe",        color: "#00704A", order: 1 },
  { name: "프로그램", icon: "fa-solid fa-laptop-code",  color: "#8C5B23", order: 2 },
  { name: "스크립트", icon: "fa-solid fa-terminal",     color: "#4A443A", order: 3 }
];


// ==============================================================================
// 1. 읽기 (GET) - 프로젝트 목록 + 카테고리 목록을 한 번에 내려줍니다
// ==============================================================================

function doGet(e) {
  try {
    var projects = readProjects();
    var categories = readCategories();

    return createJsonResponse({
      ok: true,
      version: 3,
      projects: projects,
      categories: categories
    });
  } catch (error) {
    return createJsonResponse({
      ok: false,
      error: true,
      message: error.toString()
    });
  }
}


// ==============================================================================
// 2. 쓰기 (POST) - action 값에 따라 등록/수정/삭제를 나눠 처리합니다
// ==============================================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonFail("요청 본문이 비어 있습니다.");
    }

    var body = JSON.parse(e.postData.contents);

    // action이 없으면 예전 버전(v2) 방식의 '추가' 요청으로 간주합니다 (하위 호환).
    var action = body.action || "project.create";

    switch (action) {
      case "project.create":   return handleProjectCreate(body);
      case "project.update":   return handleProjectUpdate(body);
      case "project.delete":   return handleProjectDelete(body);

      case "category.create":  return handleCategoryCreate(body);
      case "category.update":  return handleCategoryUpdate(body);
      case "category.delete":  return handleCategoryDelete(body);
      case "category.reorder": return handleCategoryReorder(body);

      default:
        return jsonFail("알 수 없는 요청입니다: " + action);
    }
  } catch (error) {
    return jsonFail(error.toString());
  }
}


// ==============================================================================
// 3. 프로젝트 읽기 / 쓰기 로직
// ==============================================================================

/**
 * 프로젝트 시트를 통째로 읽어 표준 객체 배열로 돌려줍니다.
 * 이때 ID가 비어있는 행에는 새 ID를 만들어 시트에 기록(백필)합니다.
 */
function readProjects() {
  var sheet = getProjectSheet();
  var lastRow = sheet.getLastRow();

  // 헤더만 있거나 완전히 비어있는 경우
  if (lastRow <= 1) {
    return [];
  }

  var range = sheet.getRange(2, 1, lastRow - 1, PROJECT_LAST_COL);
  var values = range.getValues();

  var projects = [];
  var idColumnValues = [];   // I열에 다시 써 넣을 값 모음
  var needsIdBackfill = false;

  for (var i = 0; i < values.length; i++) {
    var row = values[i];

    var url       = cleanText(row[0]);
    var title     = cleanText(row[1]);
    var desc      = cleanText(row[2]);
    var thumbnail = cleanText(row[3]);
    var tag       = cleanText(row[4]);
    var status    = cleanText(row[5]);
    var driveUrl  = cleanText(row[6]);
    var techStr   = cleanText(row[7]);
    var id        = cleanText(row[8]);

    // URL과 제목이 모두 비어있는 줄은 빈 행으로 보고 건너뜁니다.
    var isEmptyRow = (!url && !title);

    // 빈 행이 아닌데 ID가 없다면 새로 발급합니다.
    if (!isEmptyRow && !id) {
      id = generateId("p");
      needsIdBackfill = true;
    }
    idColumnValues.push([isEmptyRow ? "" : id]);

    if (isEmptyRow) {
      continue;
    }

    projects.push({
      id: id,
      url: url,
      title: title || "등록된 제목 없음",
      description: desc || "설명이 아직 작성되지 않았습니다.",
      thumbnail: thumbnail || DEFAULT_THUMBNAIL,
      tag: tag || "웹사이트",
      status: status || "운영 중",
      driveUrl: driveUrl,
      techStack: splitTech(techStr, tag || "웹사이트"),
      _row: i + 2   // 참고용 실제 시트 행 번호 (웹 화면에서는 쓰지 않습니다)
    });
  }

  // 새로 발급한 ID가 있으면 I열 전체를 한 번에 기록합니다 (호출 1회로 최소화).
  if (needsIdBackfill) {
    sheet.getRange(2, PROJECT_ID_COL, idColumnValues.length, 1).setValues(idColumnValues);
    ensureProjectHeader(sheet);
  }

  return projects;
}

/**
 * 새 프로젝트 한 건을 시트 맨 아래에 추가합니다.
 */
function handleProjectCreate(body) {
  var data = body.project || body;   // v2 방식(본문 자체가 프로젝트)도 허용
  var title = cleanText(data.title);
  var url = cleanText(data.url);

  if (!title && !url) {
    return jsonFail("제목과 URL 중 최소 하나는 입력해야 합니다.");
  }

  var sheet = getProjectSheet();
  ensureProjectHeader(sheet);

  var newId = generateId("p");

  sheet.appendRow([
    url,
    title,
    cleanText(data.description),
    cleanText(data.thumbnail),
    cleanText(data.tag) || "웹사이트",
    cleanText(data.status) || "운영 중",
    cleanText(data.driveUrl),
    joinTech(data.techStack),
    newId
  ]);

  return jsonOk("새 프로젝트가 등록되었습니다.", { id: newId });
}

/**
 * 고유 ID로 행을 찾아 A~H열 내용을 덮어씁니다. (I열 ID는 건드리지 않습니다)
 */
function handleProjectUpdate(body) {
  var data = body.project || body;
  var id = cleanText(data.id);

  if (!id) {
    return jsonFail("수정할 프로젝트의 ID가 없습니다.");
  }

  var sheet = getProjectSheet();
  var rowNumber = findRowById(sheet, PROJECT_ID_COL, id);

  if (rowNumber < 0) {
    return jsonFail("해당 프로젝트를 시트에서 찾을 수 없습니다. 이미 삭제되었을 수 있어요.");
  }

  sheet.getRange(rowNumber, 1, 1, 8).setValues([[
    cleanText(data.url),
    cleanText(data.title),
    cleanText(data.description),
    cleanText(data.thumbnail),
    cleanText(data.tag) || "웹사이트",
    cleanText(data.status) || "운영 중",
    cleanText(data.driveUrl),
    joinTech(data.techStack)
  ]]);

  return jsonOk("프로젝트가 수정되었습니다.", { id: id });
}

/**
 * 고유 ID로 행을 찾아 그 행만 삭제합니다.
 */
function handleProjectDelete(body) {
  var id = cleanText(body.id || (body.project && body.project.id));

  if (!id) {
    return jsonFail("삭제할 프로젝트의 ID가 없습니다.");
  }

  var sheet = getProjectSheet();
  var rowNumber = findRowById(sheet, PROJECT_ID_COL, id);

  if (rowNumber < 0) {
    return jsonFail("해당 프로젝트를 시트에서 찾을 수 없습니다. 이미 삭제되었을 수 있어요.");
  }

  sheet.deleteRow(rowNumber);

  return jsonOk("프로젝트가 삭제되었습니다.", { id: id });
}


// ==============================================================================
// 4. 카테고리(탭) 읽기 / 쓰기 로직
// ==============================================================================

/**
 * 카테고리 시트를 읽어 정렬순서대로 돌려줍니다. 시트가 없으면 기본값으로 만들어 줍니다.
 */
function readCategories() {
  var sheet = getCategorySheet();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  var categories = [];
  var idColumnValues = [];
  var needsIdBackfill = false;

  for (var i = 0; i < values.length; i++) {
    var name  = cleanText(values[i][0]);
    var icon  = cleanText(values[i][1]);
    var color = cleanText(values[i][2]);
    var order = values[i][3];
    var id    = cleanText(values[i][4]);

    if (!name) {
      idColumnValues.push([""]);
      continue;
    }

    if (!id) {
      id = generateId("c");
      needsIdBackfill = true;
    }
    idColumnValues.push([id]);

    categories.push({
      id: id,
      name: name,
      icon: icon || "fa-solid fa-folder",
      color: color || "#00704A",
      order: (typeof order === "number" && !isNaN(order)) ? order : (i + 1)
    });
  }

  if (needsIdBackfill) {
    sheet.getRange(2, 5, idColumnValues.length, 1).setValues(idColumnValues);
  }

  // 정렬순서 오름차순 정렬
  categories.sort(function (a, b) {
    return a.order - b.order;
  });

  return categories;
}

function handleCategoryCreate(body) {
  var data = body.category || body;
  var name = cleanText(data.name);

  if (!name) {
    return jsonFail("탭 이름을 입력해 주세요.");
  }

  var sheet = getCategorySheet();
  var existing = readCategories();

  // 같은 이름의 탭이 이미 있는지 검사
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].name === name) {
      return jsonFail("'" + name + "' 탭은 이미 있습니다.");
    }
  }

  var maxOrder = 0;
  for (var j = 0; j < existing.length; j++) {
    if (existing[j].order > maxOrder) maxOrder = existing[j].order;
  }

  var newId = generateId("c");

  sheet.appendRow([
    name,
    cleanText(data.icon) || "fa-solid fa-folder",
    cleanText(data.color) || "#00704A",
    maxOrder + 1,
    newId
  ]);

  return jsonOk("'" + name + "' 탭이 추가되었습니다.", { id: newId });
}

/**
 * 탭 정보를 수정합니다. 이름이 바뀐 경우 해당 이름을 쓰고 있던 프로젝트의
 * 카테고리(E열)도 한 번에 새 이름으로 바꿔줍니다.
 */
function handleCategoryUpdate(body) {
  var data = body.category || body;
  var id = cleanText(data.id);

  if (!id) {
    return jsonFail("수정할 탭의 ID가 없습니다.");
  }

  var sheet = getCategorySheet();
  var rowNumber = findRowById(sheet, 5, id);

  if (rowNumber < 0) {
    return jsonFail("해당 탭을 찾을 수 없습니다.");
  }

  var currentRow = sheet.getRange(rowNumber, 1, 1, 5).getValues()[0];
  var oldName = cleanText(currentRow[0]);
  var newName = cleanText(data.name) || oldName;

  // 다른 탭과 이름이 겹치는지 검사
  if (newName !== oldName) {
    var existing = readCategories();
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].name === newName && existing[i].id !== id) {
        return jsonFail("'" + newName + "' 탭은 이미 있습니다.");
      }
    }
  }

  sheet.getRange(rowNumber, 1, 1, 4).setValues([[
    newName,
    cleanText(data.icon) || cleanText(currentRow[1]) || "fa-solid fa-folder",
    cleanText(data.color) || cleanText(currentRow[2]) || "#00704A",
    (typeof data.order === "number") ? data.order : currentRow[3]
  ]]);

  // 이름이 바뀌었다면 프로젝트들의 카테고리 값도 따라 바꿉니다.
  var movedCount = 0;
  if (newName !== oldName) {
    movedCount = renameProjectCategory(oldName, newName);
  }

  return jsonOk("탭 정보가 수정되었습니다.", { id: id, renamedProjects: movedCount });
}

/**
 * 탭을 삭제합니다. 그 탭에 속해 있던 프로젝트들은 지정한 대체 탭으로 옮깁니다.
 */
function handleCategoryDelete(body) {
  var id = cleanText(body.id || (body.category && body.category.id));
  var fallbackName = cleanText(body.fallbackName);

  if (!id) {
    return jsonFail("삭제할 탭의 ID가 없습니다.");
  }

  var sheet = getCategorySheet();
  var rowNumber = findRowById(sheet, 5, id);

  if (rowNumber < 0) {
    return jsonFail("해당 탭을 찾을 수 없습니다.");
  }

  var targetName = cleanText(sheet.getRange(rowNumber, 1).getValue());

  // 마지막 남은 탭은 지울 수 없게 막습니다 (탭이 0개가 되면 분류가 불가능해집니다).
  var all = readCategories();
  if (all.length <= 1) {
    return jsonFail("탭은 최소 1개는 있어야 합니다.");
  }

  // 대체 탭을 정하지 않았다면 남아있는 첫 번째 탭으로 옮깁니다.
  if (!fallbackName) {
    for (var i = 0; i < all.length; i++) {
      if (all[i].id !== id) {
        fallbackName = all[i].name;
        break;
      }
    }
  }

  var movedCount = renameProjectCategory(targetName, fallbackName);
  sheet.deleteRow(rowNumber);

  return jsonOk(
    "'" + targetName + "' 탭이 삭제되었습니다." +
    (movedCount > 0 ? " (" + movedCount + "개 프로젝트를 '" + fallbackName + "'(으)로 옮겼습니다)" : ""),
    { id: id, movedProjects: movedCount, fallbackName: fallbackName }
  );
}

/**
 * 탭 순서를 한 번에 바꿉니다. body.order 는 카테고리 ID를 원하는 순서대로 담은 배열입니다.
 */
function handleCategoryReorder(body) {
  var orderedIds = body.order || body.ids;

  if (!orderedIds || !orderedIds.length) {
    return jsonFail("정렬할 탭 순서가 전달되지 않았습니다.");
  }

  var sheet = getCategorySheet();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return jsonFail("정렬할 탭이 없습니다.");
  }

  var idValues = sheet.getRange(2, 5, lastRow - 1, 1).getValues();
  var orderValues = sheet.getRange(2, 4, lastRow - 1, 1).getValues();

  for (var i = 0; i < idValues.length; i++) {
    var rowId = cleanText(idValues[i][0]);
    var position = orderedIds.indexOf(rowId);

    if (position >= 0) {
      orderValues[i][0] = position + 1;
    }
  }

  sheet.getRange(2, 4, orderValues.length, 1).setValues(orderValues);

  return jsonOk("탭 순서가 변경되었습니다.");
}

/**
 * 프로젝트 시트의 카테고리(E열) 값 중 oldName 인 것을 모두 newName 으로 바꿉니다.
 * @return {number} 실제로 바뀐 프로젝트 개수
 */
function renameProjectCategory(oldName, newName) {
  if (!oldName || !newName || oldName === newName) {
    return 0;
  }

  var sheet = getProjectSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 0;
  }

  var range = sheet.getRange(2, 5, lastRow - 1, 1);
  var values = range.getValues();
  var changed = 0;

  for (var i = 0; i < values.length; i++) {
    if (cleanText(values[i][0]) === oldName) {
      values[i][0] = newName;
      changed++;
    }
  }

  if (changed > 0) {
    range.setValues(values);
  }

  return changed;
}


// ==============================================================================
// 5. 시트 접근 헬퍼
// ==============================================================================

/**
 * 프로젝트가 들어있는 시트(첫 번째 시트)를 돌려줍니다.
 * '카테고리' 시트가 어쩌다 맨 앞에 와도 프로젝트 시트를 제대로 찾도록 처리했습니다.
 */
function getProjectSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() !== CATEGORY_SHEET_NAME) {
      return sheets[i];
    }
  }

  // 프로젝트 시트가 아예 없는 경우 새로 만들어 줍니다.
  var created = ss.insertSheet("프로젝트", 0);
  ensureProjectHeader(created);
  return created;
}

/**
 * '카테고리' 시트를 돌려줍니다. 없으면 기본 탭 3개와 함께 새로 만듭니다.
 */
function getCategorySheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CATEGORY_SHEET_NAME);

  if (sheet) {
    return sheet;
  }

  sheet = ss.insertSheet(CATEGORY_SHEET_NAME);
  sheet.getRange(1, 1, 1, 5).setValues([["이름", "아이콘", "색상", "정렬순서", "고유 ID"]]);
  sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
  sheet.setFrozenRows(1);

  var rows = [];
  for (var i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    var c = DEFAULT_CATEGORIES[i];
    rows.push([c.name, c.icon, c.color, c.order, generateId("c")]);
  }
  sheet.getRange(2, 1, rows.length, 5).setValues(rows);

  return sheet;
}

/**
 * 프로젝트 시트 1행에 헤더가 없거나 I열 헤더가 비어 있으면 채워줍니다.
 */
function ensureProjectHeader(sheet) {
  var firstCell = cleanText(sheet.getRange(1, 1).getValue());

  if (!firstCell) {
    sheet.getRange(1, 1, 1, PROJECT_LAST_COL).setValues([[
      "웹사이트 URL", "프로젝트 제목", "프로젝트 설명", "썸네일 URL",
      "카테고리", "운영 상태", "다운로드 링크", "기술 스택", "고유 ID"
    ]]);
    sheet.getRange(1, 1, 1, PROJECT_LAST_COL).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }

  if (!cleanText(sheet.getRange(1, PROJECT_ID_COL).getValue())) {
    sheet.getRange(1, PROJECT_ID_COL).setValue("고유 ID").setFontWeight("bold");
  }
}

/**
 * 지정한 열에서 특정 ID가 들어있는 행 번호를 찾습니다. 못 찾으면 -1.
 */
function findRowById(sheet, columnNumber, id) {
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return -1;
  }

  var values = sheet.getRange(2, columnNumber, lastRow - 1, 1).getValues();

  for (var i = 0; i < values.length; i++) {
    if (cleanText(values[i][0]) === id) {
      return i + 2;   // 헤더 1행 + 0-based 보정
    }
  }

  return -1;
}


// ==============================================================================
// 6. 공용 유틸리티
// ==============================================================================

/** 셀 값을 안전한 문자열로 정리 */
function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** "React, Python" -> ["React", "Python"] (비었으면 카테고리 이름을 대신 사용) */
function splitTech(text, fallbackTag) {
  if (!text) {
    return fallbackTag ? [fallbackTag] : [];
  }

  var list = text.split(",").map(function (item) {
    return item.trim();
  }).filter(Boolean);

  return list.length > 0 ? list : (fallbackTag ? [fallbackTag] : []);
}

/** ["React", "Python"] 또는 "React, Python" -> "React, Python" */
function joinTech(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return cleanText(value);
}

/** 절대 겹치지 않는 고유 ID 생성 (예: p_lq3x9a_f71c) */
function generateId(prefix) {
  var timePart = Date.now().toString(36);
  var randomPart = Math.random().toString(36).substring(2, 8);
  return prefix + "_" + timePart + "_" + randomPart;
}

/** JSON 응답 생성 (Apps Script 웹앱은 이 형태여야 브라우저에서 읽을 수 있습니다) */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonOk(message, data) {
  return createJsonResponse({
    success: true,
    message: message || "완료되었습니다.",
    data: data || null
  });
}

function jsonFail(message) {
  return createJsonResponse({
    success: false,
    message: message || "알 수 없는 오류가 발생했습니다."
  });
}


// ==============================================================================
// 7. (선택) 스프레드시트에서 직접 실행해 볼 수 있는 점검 함수
// ==============================================================================

/**
 * Apps Script 편집기 상단에서 이 함수를 선택해 [실행]하면
 * 시트 준비 상태를 한 번에 점검하고 결과를 로그로 보여줍니다.
 * (I열 ID 부여, 카테고리 시트 생성이 함께 이뤄집니다)
 */
function 설정점검() {
  var projects = readProjects();
  var categories = readCategories();

  Logger.log("프로젝트 시트: " + getProjectSheet().getName());
  Logger.log("불러온 프로젝트: " + projects.length + "개");
  Logger.log("불러온 탭(카테고리): " + categories.length + "개");

  for (var i = 0; i < categories.length; i++) {
    Logger.log("  - " + categories[i].name + " (" + categories[i].color + ")");
  }

  Logger.log("모든 준비가 끝났습니다. 이제 [배포 관리 > 수정 > 새 버전]으로 재배포하세요.");
}
