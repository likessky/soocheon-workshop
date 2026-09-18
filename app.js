/**
 * ==============================================================================
 * 수천재작소 (SooCheon Workshop) - 메인 애플리케이션 로직 (app.js)
 * ==============================================================================
 * 
 * [버전 안내: v2.0 - 페이지네이션 & 뷰 모드 전환 & 초간단 7열 연동]
 * 
 * [핵심 추가 및 개선 기능]
 * 1. 화면에 표시할 사이트 개수 선택 (6개 / 12개 / 24개 / 전체보기)
 * 2. 부드러운 페이지네이션 (이전, 페이지 번호, 다음 버튼 및 범위 안내)
 * 3. 보기 형태 전환 (비주얼 중심 카드 뷰 ↔ 한눈에 훑어보는 리스트 뷰)
 * 4. 사용자 선택값(테마, 보기 모드, 페이지당 개수) 브라우저 자동 저장 (localStorage)
 * 5. 복잡한 AI 의존성 없이 순수한 웹/프로그램/스크립트 데이터 초고속 렌더링
 * 
 * 초보자 및 교육자 분들도 쉽게 이해하고 수정할 수 있도록 모든 함수와 로직에 친절한 한글 주석을 달아두었습니다.
 */

// ------------------------------------------------------------------------------
// 1. 전역 상태 관리 (State Management)
// ------------------------------------------------------------------------------
let state = {
  allProjects: [],        // 구글 시트 또는 샘플에서 불러온 전체 프로젝트 원본 데이터
  filteredProjects: [],   // 현재 검색어 및 카테고리/상태 필터가 적용된 데이터
  selectedCategory: "전체", // 현재 선택된 탭 ("전체", "웹사이트", "프로그램", "스크립트")
  selectedStatus: "전체",   // 현재 선택된 상태 ("전체", "운영 중", "업데이트 중", "다운로드 전용")
  searchQuery: "",        // 검색창에 입력된 실시간 키워드
  
  // 페이지네이션 관련 상태
  currentPage: 1,         // 현재 보고 있는 페이지 번호 (기본: 1페이지)
  itemsPerPage: localStorage.getItem("soocheon_per_page") || "12", // 한 화면에 볼 개수 (기본: 12개)
  
  // 보기 형태 상태 ('grid': 카드 그리드 뷰, 'list': 목록 리스트 뷰)
  viewMode: localStorage.getItem("soocheon_view_mode") || "grid",
  
  // 테마 및 구글 시트 연동 URL
  theme: localStorage.getItem("soocheon_theme") || "light",
  sheetUrl: localStorage.getItem("soocheon_sheet_url") || CONFIG.SHEET_API_URL || ""
};

// 썸네일 이미지 로딩 실패 또는 미입력 시 표시할 기본 고품질 플레이스홀더 이미지
const FALLBACK_THUMBNAIL = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60";

// ------------------------------------------------------------------------------
// 2. DOM 요소 참조 객체 (UI Elements)
// ------------------------------------------------------------------------------
const DOM = {
  // 프로젝트 목록 컨테이너 및 상태 안내
  projectGrid: document.getElementById("projectGrid"),
  emptyState: document.getElementById("emptyState"),
  currentCount: document.getElementById("currentCount"),
  displayRangeInfo: document.getElementById("displayRangeInfo"),
  paginationContainer: document.getElementById("paginationContainer"),

  // 통계 지표 엘리먼트
  statTotal: document.getElementById("statTotal"),
  statWeb: document.getElementById("statWeb"),
  statApp: document.getElementById("statApp"),
  statScript: document.getElementById("statScript"),

  // 검색 및 필터 컨트롤
  searchInput: document.getElementById("searchInput"),
  btnClearSearch: document.getElementById("btnClearSearch"),
  categoryTabs: document.getElementById("categoryTabs"),
  statusFilter: document.getElementById("statusFilter"),
  btnResetFilters: document.getElementById("btnResetFilters"),
  btnReloadData: document.getElementById("btnReloadData"),

  // 서브 툴바 컨트롤 (개수 선택 & 보기 모드)
  itemsPerPageSelect: document.getElementById("itemsPerPageSelect"),
  btnViewGrid: document.getElementById("btnViewGrid"),
  btnViewList: document.getElementById("btnViewList"),

  // 테마 및 시트 동기화 인디케이터
  btnToggleTheme: document.getElementById("btnToggleTheme"),
  themeIcon: document.getElementById("themeIcon"),
  syncIndicator: document.getElementById("syncIndicator"),

  // 상세 보기 모달
  detailModal: document.getElementById("detailModal"),
  btnCloseModal: document.getElementById("btnCloseModal"),
  modalThumbnail: document.getElementById("modalThumbnail"),
  modalCategoryBadge: document.getElementById("modalCategoryBadge"),
  modalStatusBadge: document.getElementById("modalStatusBadge"),
  modalTitle: document.getElementById("modalTitle"),
  modalDescription: document.getElementById("modalDescription"),
  modalTechStack: document.getElementById("modalTechStack"),
  modalActions: document.getElementById("modalActions"),

  // 구글 시트 설정 모달
  settingsModal: document.getElementById("settingsModal"),
  btnOpenSettings: document.getElementById("btnOpenSettings"),
  btnCloseSettings: document.getElementById("btnCloseSettings"),
  inputSheetUrl: document.getElementById("inputSheetUrl"),
  btnSaveSettings: document.getElementById("btnSaveSettings"),
  btnResetToSample: document.getElementById("btnResetToSample"),

  // 알림 토스트 메시지
  toast: document.getElementById("toast"),
  toastText: document.getElementById("toastText"),
  toastIcon: document.getElementById("toastIcon")
};

// ------------------------------------------------------------------------------
// 3. 앱 초기화 (Initialization)
// ------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // 1) 테마 적용 (크림 라이트 또는 리저브 다크)
  applyTheme(state.theme);

  // 2) 저장된 보기 모드(그리드/리스트) 및 개수 선택 초기 UI 반영
  applyInitialViewControls();

  // 3) 이벤트 리스너 등록 (클릭, 검색, 필터, 페이지 변경 등)
  setupEventListeners();

  // 4) 데이터 불러오기 (구글 시트 연동 시도 -> 실패 시 내장 샘플 데이터)
  loadProjectData();
});

/**
 * 저장된 보기 모드(그리드/리스트) 및 페이지당 개수를 셀렉트박스와 버튼에 반영
 */
function applyInitialViewControls() {
  // 표시 개수 셀렉트박스 값 동기화
  if (DOM.itemsPerPageSelect) {
    DOM.itemsPerPageSelect.value = state.itemsPerPage;
  }

  // 보기 형태 버튼 활성화 상태 동기화
  updateViewModeButtons();
}

// ------------------------------------------------------------------------------
// 4. 데이터 로드 및 구글 시트 연동
// ------------------------------------------------------------------------------
/**
 * 구글 스프레드시트 또는 기본 샘플 데이터로부터 프로젝트 목록을 가져옵니다.
 */
async function loadProjectData() {
  const sheetApiUrl = state.sheetUrl.trim();

  // 구글 시트 URL이 설정되어 있는 경우 비동기 통신 시도
  if (sheetApiUrl) {
    showToast("구글 스프레드시트에서 데이터를 가져오는 중...", "info");
    try {
      const response = await fetch(sheetApiUrl);
      if (!response.ok) {
        throw new Error(`HTTP 에러! 상태 코드: ${response.status}`);
      }
      const data = await response.json();

      // 유효한 배열 데이터인지 검증
      if (Array.isArray(data)) {
        if (data.length > 0) {
          state.allProjects = normalizeProjectsData(data);
          updateSyncIndicator(true);
          showToast(`구글 시트와 동기화 완료! (${data.length}개 프로젝트) ✨`, "success");
        } else {
          state.allProjects = [];
          updateSyncIndicator(true);
          showToast("구글 시트와 연결되었습니다! (등록된 프로젝트가 아직 없습니다)", "info");
        }
      } else {
        throw new Error("시트에서 올바른 배열 형태의 데이터가 반환되지 않았습니다.");
      }
    } catch (error) {
      console.warn("구글 시트 연동 실패, 샘플 데이터셋으로 대체합니다:", error);
      updateSyncIndicator(false);
      showToast("시트 연동 실패. 기본 샘플 데이터를 표시합니다.", "warning");
      state.allProjects = [...CONFIG.SAMPLE_PROJECTS];
    }
  } else {
    // 설정된 구글 시트 URL이 없는 경우: 기본 데모 샘플 데이터 사용
    state.allProjects = [...CONFIG.SAMPLE_PROJECTS];
    updateSyncIndicator(false);
  }

  // 통계 수치 갱신 및 필터/페이지네이션 렌더링
  updateStatistics();
  state.currentPage = 1;
  applyFilterAndRender();
}

/**
 * 구글 시트 등 외부에서 받아온 데이터 구조를 내부 표준 규격으로 일관되게 정제합니다.
 */
function normalizeProjectsData(rawList) {
  return rawList.map((item, index) => {
    // 기술 스택/태그 파싱
    let techStack = [];
    if (Array.isArray(item.techStack)) {
      techStack = item.techStack;
    } else if (typeof item.techStack === "string") {
      techStack = item.techStack.split(",").map(t => t.trim()).filter(Boolean);
    } else if (typeof item.skills === "string") {
      techStack = item.skills.split(",").map(t => t.trim()).filter(Boolean);
    }

    const tag = item.tag || item.category || "웹사이트";

    return {
      id: item.id || index + 1,
      title: item.title || item.name || "무제 프로젝트",
      description: item.description || item.desc || "프로젝트 설명이 등록되지 않았습니다.",
      thumbnail: (item.thumbnail && item.thumbnail.startsWith("http")) ? item.thumbnail : FALLBACK_THUMBNAIL,
      tag: tag,
      status: item.status || "운영 중",
      url: item.url || item.link || "",
      driveUrl: item.driveUrl || item.driveLink || "",
      techStack: techStack.length > 0 ? techStack : [tag]
    };
  });
}

/**
 * 상단 시트 연동 상태 닷(Dot) 색상 갱신
 */
function updateSyncIndicator(isConnected) {
  if (isConnected) {
    DOM.syncIndicator.className = "sync-dot connected";
    DOM.syncIndicator.title = "구글 시트 실시간 연결 완료";
  } else {
    DOM.syncIndicator.className = "sync-dot demo";
    DOM.syncIndicator.title = "데모 샘플 데이터 모드 작동 중";
  }
}

// ------------------------------------------------------------------------------
// 5. 검색, 필터링 및 페이지네이션 슬라이싱 로직
// ------------------------------------------------------------------------------
/**
 * 현재 선택된 탭, 상태, 검색어에 따라 데이터를 필터링하고
 * 페이지네이션 계산 후 화면에 렌더링합니다.
 */
function applyFilterAndRender() {
  const query = state.searchQuery.toLowerCase().trim();

  // 1) 전체 데이터 필터링
  state.filteredProjects = state.allProjects.filter(project => {
    // 카테고리 탭 검사
    const matchCategory = (state.selectedCategory === "전체") || (project.tag === state.selectedCategory);

    // 운영 상태 검사
    const matchStatus = (state.selectedStatus === "전체") || (project.status === state.selectedStatus);

    // 검색어 매칭 검사 (제목, 설명, 태그)
    let matchQuery = true;
    if (query) {
      const inTitle = (project.title || "").toLowerCase().includes(query);
      const inDesc  = (project.description || "").toLowerCase().includes(query);
      const inTech  = (project.techStack || []).some(tech => tech.toLowerCase().includes(query));
      const inTag   = (project.tag || "").toLowerCase().includes(query);
      matchQuery = inTitle || inDesc || inTech || inTag;
    }

    return matchCategory && matchStatus && matchQuery;
  });

  const totalCount = state.filteredProjects.length;
  DOM.currentCount.textContent = totalCount;

  // 2) 결과가 0개인 경우 빈 화면 처리
  if (totalCount === 0) {
    DOM.projectGrid.innerHTML = "";
    DOM.emptyState.classList.remove("hidden");
    DOM.paginationContainer.classList.add("hidden");
    DOM.displayRangeInfo.textContent = "0-0";
    return;
  }

  DOM.emptyState.classList.add("hidden");

  // 3) 페이지네이션 계산
  let pagedProjects = [];
  let totalPages = 1;

  if (state.itemsPerPage === "all") {
    // 전체보기인 경우 슬라이싱 없이 전체 표시
    pagedProjects = state.filteredProjects;
    totalPages = 1;
    state.currentPage = 1;
    DOM.displayRangeInfo.textContent = `1-${totalCount}`;
  } else {
    const perPage = parseInt(state.itemsPerPage, 10) || 12;
    totalPages = Math.ceil(totalCount / perPage);

    // 현재 페이지가 전체 페이지 수를 벗어난 경우 1페이지로 보정
    if (state.currentPage > totalPages) {
      state.currentPage = 1;
    }

    const startIndex = (state.currentPage - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalCount);

    pagedProjects = state.filteredProjects.slice(startIndex, endIndex);
    DOM.displayRangeInfo.textContent = `${startIndex + 1}-${endIndex}`;
  }

  // 4) 프로젝트 목록 렌더링 (카드 뷰 또는 리스트 뷰)
  renderProjects(pagedProjects);

  // 5) 페이지네이션 버튼 바 렌더링
  renderPagination(totalPages, state.currentPage);
}

// ------------------------------------------------------------------------------
// 6. 프로젝트 목록 렌더링 (카드 그리드 뷰 vs 리스트 목록 뷰)
// ------------------------------------------------------------------------------
/**
 * 현재 보기 형태(state.viewMode)에 맞춰 HTML을 생성하고 DOM에 주입합니다.
 */
function renderProjects(projects) {
  if (state.viewMode === "list") {
    // 리스트 뷰 레이아웃 적용
    DOM.projectGrid.className = "project-grid list-view";
    DOM.projectGrid.innerHTML = projects.map(project => createListItemHtml(project)).join("");
  } else {
    // 카드 그리드 뷰 레이아웃 적용
    DOM.projectGrid.className = "project-grid";
    DOM.projectGrid.innerHTML = projects.map(project => createCardItemHtml(project)).join("");
  }
}

/**
 * [카드 뷰] 개별 카드 아이템 HTML 생성
 */
function createCardItemHtml(project) {
  const tagClass = `tag-${escapeHtml(project.tag)}`;
  const statusNormalized = project.status.replace(/\s+/g, "");
  const statusClass = `status-${statusNormalized}`;

  // 태그 칩 (최대 3개 노출)
  const displayTech = (project.techStack || []).slice(0, 3);
  const techMoreCount = (project.techStack || []).length - displayTech.length;
  const techChipsHtml = displayTech.map(tech => `
    <span class="tech-chip">#${escapeHtml(tech)}</span>
  `).join("") + (techMoreCount > 0 ? `<span class="tech-chip">+${techMoreCount}</span>` : "");

  // 액션 버튼 구성
  let actionBtnHtml = "";
  if (project.url) {
    actionBtnHtml = `
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer" class="btn-card-action primary" onclick="event.stopPropagation()">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> 바로가기
      </a>
    `;
  } else if (project.driveUrl) {
    actionBtnHtml = `
      <a href="${escapeHtml(project.driveUrl)}" target="_blank" rel="noopener noreferrer" class="btn-card-action download" onclick="event.stopPropagation()">
        <i class="fa-solid fa-cloud-arrow-down"></i> 다운로드
      </a>
    `;
  } else {
    actionBtnHtml = `
      <button class="btn-card-action primary" onclick="openDetailModal(${project.id}); event.stopPropagation();">
        <i class="fa-solid fa-circle-info"></i> 상세 정보
      </button>
    `;
  }

  return `
    <article class="project-card" onclick="openDetailModal(${project.id})">
      <!-- 카드 썸네일 -->
      <div class="card-thumbnail-box">
        <img src="${escapeHtml(project.thumbnail)}" 
             alt="${escapeHtml(project.title)}" 
             class="card-img" 
             loading="lazy"
             onerror="this.onerror=null; this.src='${FALLBACK_THUMBNAIL}';">
        
        <div class="card-badges">
          <span class="card-badge ${tagClass}">
            ${escapeHtml(project.tag)}
          </span>
          <span class="status-badge ${statusClass}">
            <span class="dot"></span> ${escapeHtml(project.status)}
          </span>
        </div>
      </div>

      <!-- 카드 본문 -->
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(project.title)}</h3>
        <p class="card-desc">${escapeHtml(project.description)}</p>

        <!-- 태그 칩 -->
        <div class="card-tech-list">
          ${techChipsHtml}
        </div>
      </div>

      <!-- 카드 하단 버튼 -->
      <div class="card-footer">
        ${actionBtnHtml}
        <button class="btn-card-detail" title="자세히 보기" onclick="openDetailModal(${project.id}); event.stopPropagation();">
          <i class="fa-solid fa-expand"></i>
        </button>
      </div>
    </article>
  `;
}

/**
 * [리스트 뷰] 개별 가로 행 아이템 HTML 생성
 */
function createListItemHtml(project) {
  const tagClass = `tag-${escapeHtml(project.tag)}`;
  const statusNormalized = project.status.replace(/\s+/g, "");
  const statusClass = `status-${statusNormalized}`;

  // 태그 칩 (최대 2개 노출)
  const displayTech = (project.techStack || []).slice(0, 2);
  const techChipsHtml = displayTech.map(tech => `
    <span class="tech-chip">#${escapeHtml(tech)}</span>
  `).join("");

  // 액션 버튼 구성
  let actionBtnHtml = "";
  if (project.url) {
    actionBtnHtml = `
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer" class="btn-list-action primary" onclick="event.stopPropagation()">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> 바로가기
      </a>
    `;
  } else if (project.driveUrl) {
    actionBtnHtml = `
      <a href="${escapeHtml(project.driveUrl)}" target="_blank" rel="noopener noreferrer" class="btn-list-action download" onclick="event.stopPropagation()">
        <i class="fa-solid fa-cloud-arrow-down"></i> 다운로드
      </a>
    `;
  }

  return `
    <div class="project-list-item" onclick="openDetailModal(${project.id})">
      <!-- 좌측 미니 썸네일 -->
      <div class="list-thumb-box">
        <img src="${escapeHtml(project.thumbnail)}" 
             alt="${escapeHtml(project.title)}" 
             class="list-thumb-img" 
             loading="lazy"
             onerror="this.onerror=null; this.src='${FALLBACK_THUMBNAIL}';">
      </div>

      <!-- 중앙 정보 영역 -->
      <div class="list-content-box">
        <div class="list-header">
          <h3 class="list-title">${escapeHtml(project.title)}</h3>
          <div class="list-badges">
            <span class="card-badge ${tagClass}">${escapeHtml(project.tag)}</span>
            <span class="status-badge ${statusClass}">
              <span class="dot"></span> ${escapeHtml(project.status)}
            </span>
          </div>
        </div>

        <p class="list-desc">${escapeHtml(project.description)}</p>

        <div class="list-tags">
          ${techChipsHtml}
        </div>
      </div>

      <!-- 우측 액션 버튼 영역 -->
      <div class="list-actions-box">
        ${actionBtnHtml}
        <button class="btn-list-action detail" title="자세히 보기" onclick="openDetailModal(${project.id}); event.stopPropagation();">
          <i class="fa-solid fa-expand"></i>
        </button>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------------------
// 7. 페이지네이션 컨트롤러 렌더링
// ------------------------------------------------------------------------------
/**
 * 총 페이지 수와 현재 페이지에 맞춰 페이지 이동 버튼들을 생성합니다.
 */
function renderPagination(totalPages, currentPage) {
  // 페이지가 1개 이하이거나 전체보기 모드이면 페이지네이션 바를 숨깁니다.
  if (totalPages <= 1 || state.itemsPerPage === "all") {
    DOM.paginationContainer.classList.add("hidden");
    DOM.paginationContainer.innerHTML = "";
    return;
  }

  DOM.paginationContainer.classList.remove("hidden");

  let html = "";

  // 1) 이전 페이지 버튼
  const prevDisabled = currentPage === 1 ? "disabled" : "";
  html += `
    <button class="btn-page-nav" ${prevDisabled} onclick="goToPage(${currentPage - 1})" aria-label="이전 페이지">
      <i class="fa-solid fa-chevron-left"></i> 이전
    </button>
  `;

  // 2) 페이지 번호 버튼 목록 생성 (스마트 페이징: 최대 7개 구간 표시)
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  // 첫 페이지 표시
  if (startPage > 1) {
    html += `<button class="btn-page-number" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      html += `<span class="page-ellipsis">...</span>`;
    }
  }

  // 번호 버튼들
  for (let p = startPage; p <= endPage; p++) {
    const activeClass = p === currentPage ? "active" : "";
    html += `
      <button class="btn-page-number ${activeClass}" onclick="goToPage(${p})">
        ${p}
      </button>
    `;
  }

  // 마지막 페이지 표시
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="page-ellipsis">...</span>`;
    }
    html += `<button class="btn-page-number" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  // 3) 다음 페이지 버튼
  const nextDisabled = currentPage === totalPages ? "disabled" : "";
  html += `
    <button class="btn-page-nav" ${nextDisabled} onclick="goToPage(${currentPage + 1})" aria-label="다음 페이지">
      다음 <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  DOM.paginationContainer.innerHTML = html;
}

/**
 * 특정 페이지로 이동하고 상단 프로젝트 목록 위치로 부드럽게 스크롤합니다.
 */
function goToPage(pageNum) {
  state.currentPage = pageNum;
  applyFilterAndRender();

  // 상단 목록 영역으로 부드러운 스크롤 이동
  DOM.projectGrid.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ------------------------------------------------------------------------------
// 8. 보기 모드 전환 (카드 뷰 ↔ 리스트 뷰)
// ------------------------------------------------------------------------------
/**
 * 보기 모드를 변경하고 로컬스토리지에 저장 후 화면을 즉시 갱신합니다.
 */
function setViewMode(mode) {
  if (state.viewMode === mode) return;

  state.viewMode = mode;
  localStorage.setItem("soocheon_view_mode", mode);
  updateViewModeButtons();
  renderProjects(state.filteredProjects.slice(
    state.itemsPerPage === "all" ? 0 : (state.currentPage - 1) * parseInt(state.itemsPerPage, 10),
    state.itemsPerPage === "all" ? undefined : (state.currentPage - 1) * parseInt(state.itemsPerPage, 10) + parseInt(state.itemsPerPage, 10)
  ));
}

/**
 * 뷰 모드 토글 버튼의 활성화(active) 클래스를 갱신합니다.
 */
function updateViewModeButtons() {
  if (DOM.btnViewGrid && DOM.btnViewList) {
    if (state.viewMode === "list") {
      DOM.btnViewList.classList.add("active");
      DOM.btnViewGrid.classList.remove("active");
    } else {
      DOM.btnViewGrid.classList.add("active");
      DOM.btnViewList.classList.remove("active");
    }
  }
}

// ------------------------------------------------------------------------------
// 9. 통계 지표(Stats Bar) 계산 및 갱신
// ------------------------------------------------------------------------------
function updateStatistics() {
  const total = state.allProjects.length;
  const webCount = state.allProjects.filter(p => p.tag === "웹사이트").length;
  const appCount = state.allProjects.filter(p => p.tag === "프로그램").length;
  const scriptCount = state.allProjects.filter(p => p.tag === "스크립트").length;

  DOM.statTotal.textContent = total;
  DOM.statWeb.textContent = webCount;
  DOM.statApp.textContent = appCount;
  DOM.statScript.textContent = scriptCount;
}

// ------------------------------------------------------------------------------
// 10. 모달(상세 보기 & 시트 설정) 제어
// ------------------------------------------------------------------------------
/**
 * 프로젝트 상세 정보 모달 열기
 */
function openDetailModal(projectId) {
  const project = state.allProjects.find(p => p.id === projectId);
  if (!project) return;

  DOM.modalTitle.textContent = project.title;
  DOM.modalDescription.textContent = project.description;
  DOM.modalThumbnail.src = project.thumbnail;
  DOM.modalThumbnail.onerror = () => { DOM.modalThumbnail.src = FALLBACK_THUMBNAIL; };

  // 배지 설정
  DOM.modalCategoryBadge.textContent = project.tag;
  DOM.modalCategoryBadge.className = `card-badge tag-${project.tag}`;

  DOM.modalStatusBadge.textContent = project.status;
  DOM.modalStatusBadge.className = `card-badge status-${project.status.replace(/\s+/g, "")}`;

  // 기술 스택 칩 목록
  DOM.modalTechStack.innerHTML = (project.techStack || []).map(tech => `
    <span class="tech-tag-chip">#${escapeHtml(tech)}</span>
  `).join("");

  // 액션 버튼 구성
  let actionsHtml = "";
  if (project.url) {
    actionsHtml += `
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer" class="btn-primary">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> 사이트 바로가기
      </a>
    `;
  }
  if (project.driveUrl) {
    actionsHtml += `
      <a href="${escapeHtml(project.driveUrl)}" target="_blank" rel="noopener noreferrer" class="btn-secondary">
        <i class="fa-solid fa-cloud-arrow-down"></i> 드라이브 다운로드
      </a>
    `;
  }
  DOM.modalActions.innerHTML = actionsHtml;

  // 모달 표시
  DOM.detailModal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // 배경 스크롤 방지
}

function closeDetailModal() {
  DOM.detailModal.classList.add("hidden");
  document.body.style.overflow = "";
}

/**
 * 구글 시트 연동 설정 모달 열기/닫기
 */
function openSettingsModal() {
  DOM.inputSheetUrl.value = state.sheetUrl;
  DOM.settingsModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeSettingsModal() {
  DOM.settingsModal.classList.add("hidden");
  document.body.style.overflow = "";
}

// ------------------------------------------------------------------------------
// 11. 테마(다크/라이트) 전환
// ------------------------------------------------------------------------------
function applyTheme(themeName) {
  state.theme = themeName;
  localStorage.setItem("soocheon_theme", themeName);

  if (themeName === "dark") {
    document.body.className = "dark-theme";
    DOM.themeIcon.className = "fa-solid fa-sun";
    DOM.btnToggleTheme.title = "크림 라이트 모드로 전환";
  } else {
    document.body.className = "light-theme";
    DOM.themeIcon.className = "fa-solid fa-moon";
    DOM.btnToggleTheme.title = "리저브 다크 모드로 전환";
  }
}

function toggleTheme() {
  const newTheme = state.theme === "light" ? "dark" : "light";
  applyTheme(newTheme);
  showToast(`${newTheme === "dark" ? "리저브 다크" : "크림 라이트"} 테마가 적용되었습니다.`);
}

// ------------------------------------------------------------------------------
// 12. 전체 이벤트 리스너 등록
// ------------------------------------------------------------------------------
function setupEventListeners() {
  // 1) 테마 전환
  DOM.btnToggleTheme.addEventListener("click", toggleTheme);

  // 2) 실시간 검색어 입력
  DOM.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    DOM.btnClearSearch.classList.toggle("hidden", !state.searchQuery);
    state.currentPage = 1; // 검색 시 1페이지로 이동
    applyFilterAndRender();
  });

  // 검색어 초기화 버튼
  DOM.btnClearSearch.addEventListener("click", () => {
    DOM.searchInput.value = "";
    state.searchQuery = "";
    DOM.btnClearSearch.classList.add("hidden");
    state.currentPage = 1;
    applyFilterAndRender();
    DOM.searchInput.focus();
  });

  // 3) 카테고리 탭 클릭
  DOM.categoryTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;

    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    state.selectedCategory = btn.dataset.category;
    state.currentPage = 1; // 탭 변경 시 1페이지로 이동
    applyFilterAndRender();
  });

  // 4) 상태 드롭다운 필터 변경
  DOM.statusFilter.addEventListener("change", (e) => {
    state.selectedStatus = e.target.value;
    state.currentPage = 1; // 상태 변경 시 1페이지로 이동
    applyFilterAndRender();
  });

  // 5) 필터 초기화 버튼
  DOM.btnResetFilters.addEventListener("click", () => {
    DOM.searchInput.value = "";
    state.searchQuery = "";
    DOM.btnClearSearch.classList.add("hidden");

    state.selectedCategory = "전체";
    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.category === "전체");
    });

    state.selectedStatus = "전체";
    DOM.statusFilter.value = "전체";

    state.currentPage = 1;
    applyFilterAndRender();
  });

  // 6) 통계 카드 클릭 시 해당 카테고리로 필터링 이동
  document.querySelectorAll(".stat-card").forEach(card => {
    card.addEventListener("click", () => {
      const targetCategory = card.dataset.filter;
      if (!targetCategory) return;

      state.selectedCategory = targetCategory;
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.category === targetCategory);
      });

      state.currentPage = 1;
      applyFilterAndRender();
      DOM.projectGrid.scrollIntoView({ behavior: "smooth" });
    });
  });

  // 7) 서브 툴바: 표시 개수 선택
  if (DOM.itemsPerPageSelect) {
    DOM.itemsPerPageSelect.addEventListener("change", (e) => {
      state.itemsPerPage = e.target.value;
      localStorage.setItem("soocheon_per_page", state.itemsPerPage);
      state.currentPage = 1; // 개수 변경 시 1페이지로 이동
      applyFilterAndRender();
      showToast(`한 화면에 ${e.target.value === "all" ? "전체" : e.target.value + "개씩"} 표시합니다.`);
    });
  }

  // 8) 서브 툴바: 보기 형태 전환 (카드 뷰 vs 리스트 뷰)
  if (DOM.btnViewGrid) {
    DOM.btnViewGrid.addEventListener("click", () => {
      setViewMode("grid");
      showToast("카드 그리드 보기로 전환되었습니다. 🔲");
    });
  }
  if (DOM.btnViewList) {
    DOM.btnViewList.addEventListener("click", () => {
      setViewMode("list");
      showToast("리스트 목록 보기로 전환되었습니다. 📋");
    });
  }

  // 9) 실시간 새로고침 버튼
  DOM.btnReloadData.addEventListener("click", () => {
    loadProjectData();
  });

  // 10) 모달 제어
  DOM.btnCloseModal.addEventListener("click", closeDetailModal);
  DOM.detailModal.addEventListener("click", (e) => {
    if (e.target === DOM.detailModal) closeDetailModal();
  });

  DOM.btnOpenSettings.addEventListener("click", openSettingsModal);
  DOM.btnCloseSettings.addEventListener("click", closeSettingsModal);
  DOM.settingsModal.addEventListener("click", (e) => {
    if (e.target === DOM.settingsModal) closeSettingsModal();
  });

  // ESC 키로 모달 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDetailModal();
      closeSettingsModal();
    }
  });

  // 11) 구글 시트 연동 설정 저장
  DOM.btnSaveSettings.addEventListener("click", () => {
    const newUrl = DOM.inputSheetUrl.value.trim();
    state.sheetUrl = newUrl;
    localStorage.setItem("soocheon_sheet_url", newUrl);
    closeSettingsModal();
    loadProjectData();
  });

  // 기본 샘플 데이터로 복원
  DOM.btnResetToSample.addEventListener("click", () => {
    state.sheetUrl = "";
    localStorage.removeItem("soocheon_sheet_url");
    DOM.inputSheetUrl.value = "";
    closeSettingsModal();
    loadProjectData();
    showToast("기본 샘플 데이터 모드로 복원되었습니다.", "info");
  });
}

// ------------------------------------------------------------------------------
// 13. 알림 토스트 (Toast Message)
// ------------------------------------------------------------------------------
let toastTimer = null;
function showToast(message, type = "success") {
  if (toastTimer) clearTimeout(toastTimer);

  DOM.toastText.textContent = message;
  
  if (type === "warning") {
    DOM.toastIcon.className = "fa-solid fa-triangle-exclamation";
  } else if (type === "info") {
    DOM.toastIcon.className = "fa-solid fa-circle-info";
  } else {
    DOM.toastIcon.className = "fa-solid fa-circle-check";
  }

  DOM.toast.classList.remove("hidden");

  toastTimer = setTimeout(() => {
    DOM.toast.classList.add("hidden");
  }, 2800);
}

/**
 * XSS 공격 방지를 위한 안전한 HTML 이스케이프 함수
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
