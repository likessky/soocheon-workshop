/**
 * ==============================================================================
 * 수천재작소 (SooCheon Workshop) - 구글 스프레드시트 연동 Apps Script (Code.gs)
 * ==============================================================================
 * 
 * [버전 안내: v2.0 - 초간단 7열 경량화 버전]
 * - 복잡한 AI 함수나 외부 API 키 없이, 누구나 메모장처럼 시트에 적기만 하면
 *   안티그래비티 '수천재작소' 웹 포털에서 즉시 읽을 수 있는 표준 JSON 데이터로 전송합니다.
 * 
 * [스프레드시트 1행 헤더 권장 구성 (초간단 7열)]
 * A열: 웹사이트 URL (바로가기 주소)
 * B열: 프로젝트 제목 (이름)
 * C열: 프로젝트 설명 (개요)
 * D열: 썸네일 이미지 URL (비워두면 기본 고품질 이미지 적용)
 * E열: 카테고리 (웹사이트 / 프로그램 / 스크립트)
 * F열: 운영 상태 (운영 중 / 업데이트 중 / 다운로드 전용)
 * G열: 다운로드 링크 (구글 드라이브 링크 등, 웹사이트인 경우 비워둬도 됨)
 * H열 (선택): 기술 스택 (예: React, Python 등 콤마로 구분, 비워둬도 됨)
 * 
 * [적용 방법 (3단계)]
 * 1. 구글 스프레드시트 상단 메뉴에서 [확장 프로그램] > [Apps Script] 클릭
 * 2. 기존 코드를 모두 지우고 이 파일(Code.gs)의 전체 내용을 복사하여 붙여넣기 (Ctrl + S 저장)
 * 3. 우측 상단 [배포] > [새 배포] 클릭
 *    - 유형: "웹 앱" 선택 (톱니바퀴 아이콘)
 *    - 설명: "수천재작소 API v2"
 *    - 다음 사용자 권한으로 앱 실행: "나 (사용자 계정)"
 *    - 액세스 권한이 있는 사용자: "모든 사용자 (Anyone)" (★ 필수: 그래야 포털에서 로그인 없이 읽을 수 있습니다)
 *    - [배포] 버튼 클릭 후 생성된 웹 앱 URL 복사!
 * 4. 수천재작소 웹 화면 상단의 [시트 연동] 버튼을 눌러 복사한 URL을 붙여넣으면 즉시 연동 완료!
 */

/**
 * 웹 브라우저 또는 수천재작소 웹앱에서 GET 요청이 들어왔을 때 실행되는 메인 함수
 */
function doGet(e) {
  try {
    // 현재 활성화된 스프레드시트의 첫 번째 시트를 가져옵니다.
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();

    // 데이터가 1행(헤더)만 있거나 비어있는 경우 빈 배열 반환
    if (data.length <= 1) {
      return createJsonResponse([]);
    }

    // 2행부터 마지막 행까지 순회하며 프로젝트 객체 목록을 생성합니다.
    const projects = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      const url          = String(row[0] || "").trim(); // A열: 사이트 바로가기 URL
      const title        = String(row[1] || "").trim(); // B열: 프로젝트 제목
      const desc         = String(row[2] || "").trim(); // C열: 프로젝트 설명
      const thumbnail    = String(row[3] || "").trim(); // D열: 썸네일 이미지 URL
      const tag          = String(row[4] || "").trim(); // E열: 카테고리 (웹사이트, 프로그램, 스크립트)
      const status       = String(row[5] || "").trim(); // F열: 운영 상태 (운영 중, 업데이트 중, 다운로드 전용)
      const driveUrl     = String(row[6] || "").trim(); // G열: 구글 드라이브 다운로드 링크
      const techStackStr = String(row[7] || "").trim(); // H열: (선택) 기술 스택

      // URL과 제목이 모두 비어있는 빈 행은 목록에서 제외합니다.
      if (!url && !title) {
        continue;
      }

      // 기본 카테고리 보정 (입력 안 했을 경우 '웹사이트'를 기본값으로 지정)
      const finalTag = tag || "웹사이트";
      
      // 운영 상태 기본값 보정
      const finalStatus = status || "운영 중";

      // 썸네일 기본값 보정 (비어있을 경우 감성적인 기본 고화질 이미지 적용)
      const finalThumbnail = thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60";

      // 기술 스택 문자열 파싱 (예: "HTML, CSS, JS" -> ["HTML", "CSS", "JS"])
      let techStack = [];
      if (techStackStr) {
        techStack = techStackStr.split(",").map(function(item) {
          return item.trim();
        }).filter(Boolean);
      }
      if (techStack.length === 0) {
        techStack = [finalTag];
      }

      // 최종 정제된 프로젝트 정보 객체 생성
      projects.push({
        id: i,
        url: url,
        title: title || "등록된 제목 없음",
        description: desc || "설명이 아직 작성되지 않았습니다.",
        thumbnail: finalThumbnail,
        tag: finalTag,
        status: finalStatus,
        driveUrl: driveUrl,
        techStack: techStack
      });
    }

    // 완성된 프로젝트 목록을 JSON 형태로 응답합니다.
    return createJsonResponse(projects);

  } catch (error) {
    // 예외 발생 시 에러 메시지를 JSON 형태로 반환합니다.
    return createJsonResponse({
      error: true,
      message: error.toString()
    });
  }
}

/**
 * JSON 응답 생성 헬퍼 함수 (CORS 헤더 및 MimeType 설정)
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
