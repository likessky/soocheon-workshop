/**
 * ==============================================================================
 * 수천재작소 (SooCheon Workshop) - 설정 파일 (config.js)
 * ==============================================================================
 *
 * [설명]
 * - 구글 스프레드시트 Apps Script 웹앱 URL과, 시트를 아직 불러오지 못한 아주 짧은
 *   순간(첫 로딩 0.x초) 동안만 잠깐 쓰이는 기본 탭 정보를 담고 있습니다.
 * - 실제 프로젝트 목록과 탭(카테고리)은 항상 구글 시트에서 실시간으로 불러옵니다.
 */

const CONFIG = {
  // [1] 프로젝트 타이틀 및 소개 문구
  APP_TITLE: "수천재작소",
  APP_SUBTITLE: "디지털 장인 '수천재'의 프로젝트 & 도구 통합 아카이브",

  // [2] 구글 스프레드시트 Apps Script 웹앱 배포 URL
  SHEET_API_URL: "https://script.google.com/macros/s/AKfycbw4MYHhClCZs-1LoDBP1P0JcxLcR8s4YaSqZC-ZRzwty6lNjRFBAwvJU46W8MYvcZRd/exec",

  // [3] 아직 시트/캐시를 하나도 불러오지 못했을 때 잠깐 사용할 기본 탭 목록
  //     (구글 시트의 '카테고리' 시트가 로드되는 즉시 이 값은 실제 데이터로 교체됩니다)
  DEFAULT_CATEGORIES: [
    { id: "default-web",    name: "웹사이트", icon: "fa-solid fa-globe",       color: "#00704A", order: 1 },
    { id: "default-app",    name: "프로그램", icon: "fa-solid fa-laptop-code", color: "#8C5B23", order: 2 },
    { id: "default-script", name: "스크립트", icon: "fa-solid fa-terminal",    color: "#4A443A", order: 3 }
  ],

  // [4] 탭 색상을 고를 때 먼저 보여줄 자주 쓰는 색상 (마음에 안 들면 '직접 선택' 가능)
  COLOR_PRESETS: [
    { name: "그린",   hex: "#00704A" },
    { name: "브라운", hex: "#8C5B23" },
    { name: "차콜",   hex: "#4A443A" },
    { name: "레드",   hex: "#D64545" },
    { name: "오렌지", hex: "#E8853D" },
    { name: "옐로",   hex: "#D4A72C" },
    { name: "블루",   hex: "#3B7DD8" },
    { name: "네이비", hex: "#2C3E6B" },
    { name: "퍼플",   hex: "#7B5CC4" },
    { name: "핑크",   hex: "#D85C9A" }
  ]
};
