/**
 * ==============================================================================
 * 수천재작소 (SooCheon Workshop) - 설정 및 기본 샘플 데이터 파일 (config.js)
 * ==============================================================================
 * 
 * [설명]
 * - 구글 스프레드시트와 연동하기 전에도 화면이 풍성하게 표시될 수 있도록
 *   수천재님의 대표 예상 프로젝트들을 샘플 데이터로 미리 담아두었습니다.
 * - 나중에 구글 스프레드시트 웹앱 URL을 아래 `SHEET_API_URL`에 넣어주면
 *   실제 구글 시트의 데이터와 1초 만에 실시간 연동됩니다!
 */

const CONFIG = {
  // [1] 프로젝트 타이틀 및 소개 문구
  APP_TITLE: "수천재작소",
  APP_SUBTITLE: "디지털 장인 '수천재'의 프로젝트 & 도구 통합 아카이브",
  
  // [2] 구글 스프레드시트 Apps Script 웹앱 배포 URL (연동 완료)
  SHEET_API_URL: "https://script.google.com/macros/s/AKfycbw4MYHhClCZs-1LoDBP1P0JcxLcR8s4YaSqZC-ZRzwty6lNjRFBAwvJU46W8MYvcZRd/exec", 

  // [3] 초기 데모 샘플 데이터셋 (구글 시트 연동 전 기본 노출 데이터)
  SAMPLE_PROJECTS: [
    {
      id: 1,
      title: "학생 성적 확인 및 맞춤형 피드백 시스템",
      description: "구글 시트와 웹앱을 연동하여 학생과 학부모가 개인별 성적과 성장 피드백을 실시간으로 확인하는 교육용 웹 서비스입니다.",
      aiCopy: "수작업 성적표 발행은 이제 그만! 클릭 한 번으로 학생별 맞춤 성장 리포트를 전송하는 스마트 교육 대시보드",
      thumbnail: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=60",
      tag: "웹사이트",
      status: "운영 중", // 운영 중 | 업데이트 중 | 다운로드 전용
      url: "https://example.com/gas-grade-app",
      driveUrl: "",
      techStack: ["Google Apps Script", "JavaScript", "HTML5", "CSS3", "Google Sheets"]
    },
    {
      id: 2,
      title: "OptiPay - 자동 급여 계산 및 명세서 생성기",
      description: "복잡한 4대 보험과 수당, 공제 항목을 1초 만에 계산하고 깔끔한 PDF 명세서까지 자동 출력해 주는 관리자용 스트림릿 프로그램입니다.",
      aiCopy: "세무사도 놀란 초간편 급여 정산! 클릭 한 번에 계산부터 명세서 발급까지 끝내는 최적화 페이롤 툴",
      thumbnail: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60",
      tag: "프로그램",
      status: "운영 중",
      url: "https://example.com/optipay",
      driveUrl: "https://drive.google.com",
      techStack: ["Python", "Streamlit", "Pandas", "ReportLab"]
    },
    {
      id: 3,
      title: "교무업무 자동화 나이스 데이터 추출 스크립트",
      description: "반복적인 행정 업무 데이터를 엑셀 및 시트 양식에 맞춰 자동으로 정제하고 분류해 주는 업무 경감 파이썬 자동화 스크립트 모음입니다.",
      aiCopy: "퇴근 시간을 2시간 앞당겨주는 기적! 반복 엑셀 노가다를 단 3초 만에 끝내는 칼퇴 보장 스크립트",
      thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=60",
      tag: "스크립트",
      status: "다운로드 전용",
      url: "",
      driveUrl: "https://drive.google.com",
      techStack: ["Python", "Selenium", "OpenPyXL"]
    },
    {
      id: 4,
      title: "학급 자리배치 & 모둠구성 스마트 룰렛",
      description: "친한 친구 격리, 시력 배려, 남녀 성비 등 까다로운 조건을 고려하여 공정하고 재미있게 자리를 배정해 주는 인터랙티브 웹앱입니다.",
      aiCopy: "불만 제로! 알고리즘과 흥미진진한 룰렛 애니메이션으로 완성하는 평화로운 학급 자리배치기",
      thumbnail: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60",
      tag: "웹사이트",
      status: "운영 중",
      url: "https://example.com/seating-chart",
      driveUrl: "",
      techStack: ["Vue.js", "TailwindCSS", "Canvas API"]
    },
    {
      id: 5,
      title: "구글 폼 설문조사 실시간 시각화 대시보드",
      description: "구글 폼 응답이 들어올 때마다 스프레드시트 수식과 Apps Script를 활용해 대형 스크린용 인포그래픽 차트로 실시간 갱신합니다.",
      aiCopy: "설문 결과가 눈앞에서 살아 움직인다! 프레젠테이션에 최적화된 실시간 인터랙티브 차트 쇼",
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60",
      tag: "웹사이트",
      status: "업데이트 중",
      url: "https://example.com/survey-dashboard",
      driveUrl: "",
      techStack: ["Chart.js", "Google Sheets", "HTML/CSS"]
    },
    {
      id: 6,
      title: "수업용 타이머 & 랜덤 발표자 추첨기",
      description: "집중력을 높여주는 BGM과 긴장감 넘치는 효과음이 내장된 풀스크린 전자칠판 전용 타이머 & 추첨 프로그램입니다.",
      aiCopy: "수업 집중도 200% 상승! 재미있는 사운드와 타이머로 학생들의 시선을 단숨에 사로잡는 마법의 도구",
      thumbnail: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&auto=format&fit=crop&q=60",
      tag: "프로그램",
      status: "다운로드 전용",
      url: "",
      driveUrl: "https://drive.google.com",
      techStack: ["Electron", "Web Audio API", "Node.js"]
    }
  ]
};
