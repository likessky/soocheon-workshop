/**
 * ==============================================================================
 * 수천재작소 (SooCheon Workshop) - 메인 애플리케이션 로직 (app.js)
 * ==============================================================================
 *
 * [버전 안내: v3.0]
 *
 * [핵심 개선 사항]
 * 1. 즉시 로딩: 마지막으로 불러온 데이터를 브라우저에 캐시해두고, 재접속 시 바로
 *    화면에 그린 뒤 백그라운드에서 최신 데이터로 조용히 갱신합니다(진입 토스트 없음).
 * 2. 가로(열) 개수 조절: 표시 개수(세로)뿐 아니라 한 줄에 보일 카드 개수도 선택 가능.
 * 3. 모바일 최적화 레이아웃 (히어로 / 통계바 / 카드).
 * 4. 사이트 등록/수정/삭제를 웹 화면에서 바로 처리 (구글 시트에 실시간 반영).
 * 5. 탭(카테고리)을 화면에서 직접 추가/수정/삭제/순서변경.
 *
 * 이벤트 처리는 카드마다 onclick을 문자열로 심던 예전 방식 대신, 컨테이너 한 곳에
 * 이벤트 위임(delegation)을 걸어 data-id / data-action 속성으로 처리합니다.
 */

// ------------------------------------------------------------------------------
// 1. 전역 상태 관리 (State Management)
// ------------------------------------------------------------------------------
let state = {
  allProjects: [],        // 구글 시트에서 불러온 전체 프로젝트 목록
  categories: [],         // 탭(카테고리) 목록
  filteredProjects: [],   // 현재 검색어 및 카테고리/상태 필터가 적용된 데이터

  selectedCategory: "전체",
  selectedStatus: "전체",
  searchQuery: "",

  currentPage: 1,
  itemsPerPage: localStorage.getItem("soocheon_per_page") || "12",
  gridCols: localStorage.getItem("soocheon_grid_cols") || "3",   // 가로 열 개수 ('auto' 또는 1~5)

  viewMode: localStorage.getItem("soocheon_view_mode") || "grid",
  theme: localStorage.getItem("soocheon_theme") || "light",
  sheetUrl: localStorage.getItem("soocheon_sheet_url") || (typeof CONFIG !== "undefined" ? CONFIG.SHEET_API_URL : "") || "",

  formMode: "create",          // "create" | "edit"
  editingProjectId: null,
  confirmAction: null          // 확인 모달에서 [삭제] 눌렀을 때 실행할 함수
};

const CACHE_KEY = "soocheon_cache_v3";
const FALLBACK_THUMBNAIL = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60";

// ------------------------------------------------------------------------------
// 2. DOM 요소 참조 객체 (UI Elements)
// ------------------------------------------------------------------------------
const DOM = {
  projectGrid: document.getElementById("projectGrid"),
  emptyState: document.getElementById("emptyState"),
  currentCount: document.getElementById("currentCount"),
  displayRangeInfo: document.getElementById("displayRangeInfo"),
  paginationContainer: document.getElementById("paginationContainer"),

  statsBar: document.getElementById("statsBar"),

  searchInput: document.getElementById("searchInput"),
  btnClearSearch: document.getElementById("btnClearSearch"),
  categoryTabs: document.getElementById("categoryTabs"),
  btnManageCategories: document.getElementById("btnManageCategories"),
  statusFilter: document.getElementById("statusFilter"),
  btnResetFilters: document.getElementById("btnResetFilters"),
  btnReloadData: document.getElementById("btnReloadData"),

  columnSelect: document.getElementById("columnSelect"),
  itemsPerPageSelect: document.getElementById("itemsPerPageSelect"),
  btnViewGrid: document.getElementById("btnViewGrid"),
  btnViewList: document.getElementById("btnViewList"),

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

  // 알림 토스트
  toast: document.getElementById("toast"),
  toastText: document.getElementById("toastText"),
  toastIcon: document.getElementById("toastIcon"),

  // 프로젝트 등록/수정 모달
  projectFormModal: document.getElementById("projectFormModal"),
  btnAddProject: document.getElementById("btnAddProject"),
  btnAddProjectFloat: document.getElementById("btnAddProjectFloat"),
  btnCloseProjectForm: document.getElementById("btnCloseProjectForm"),
  btnCancelProjectForm: document.getElementById("btnCancelProjectForm"),
  btnSubmitProjectForm: document.getElementById("btnSubmitProjectForm"),
  projectFormIcon: document.getElementById("projectFormIcon"),
  projectFormTitle: document.getElementById("projectFormTitle"),
  projectFormDesc: document.getElementById("projectFormDesc"),
  projectFormSubmitText: document.getElementById("projectFormSubmitText"),
  fUrl: document.getElementById("fUrl"),
  fTitle: document.getElementById("fTitle"),
  fDesc: document.getElementById("fDesc"),
  fCategory: document.getElementById("fCategory"),
  fStatus: document.getElementById("fStatus"),
  fThumbnail: document.getElementById("fThumbnail"),
  fDriveUrl: document.getElementById("fDriveUrl"),
  fTechStack: document.getElementById("fTechStack"),

  // 탭(카테고리) 관리 모달
  categoryModal: document.getElementById("categoryModal"),
  btnCloseCategoryModal: document.getElementById("btnCloseCategoryModal"),
  categoryManageList: document.getElementById("categoryManageList"),
  newCategoryName: document.getElementById("newCategoryName"),
  newCategoryColor: document.getElementById("newCategoryColor"),
  btnAddCategory: document.getElementById("btnAddCategory"),

  // 삭제 확인 모달
  confirmModal: document.getElementById("confirmModal"),
  confirmModalTitle: document.getElementById("confirmModalTitle"),
  confirmModalDesc: document.getElementById("confirmModalDesc"),
  confirmModalExtra: document.getElementById("confirmModalExtra"),
  btnConfirmCancel: document.getElementById("btnConfirmCancel"),
  btnConfirmOk: document.getElementById("btnConfirmOk")
};

// ------------------------------------------------------------------------------
// 3. 앱 초기화 (Initialization)
// ------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(state.theme);
  applyInitialViewControls();
  setupEventListeners();
  loadProjectData();
});

function applyInitialViewControls() {
  if (DOM.itemsPerPageSelect) DOM.itemsPerPageSelect.value = state.itemsPerPage;
  if (DOM.columnSelect) DOM.columnSelect.value = state.gridCols;
  updateViewModeButtons();
}

// ------------------------------------------------------------------------------
// 4. 캐시 헬퍼 (즉시 로딩을 위한 로컬 저장)
// ------------------------------------------------------------------------------
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.categories)) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      projects: payload.projects,
      categories: payload.categories,
      savedAt: Date.now()
    }));
  } catch (err) {
    // 저장 공간이 부족하거나 접근 불가한 경우 조용히 무시 (기능에 필수는 아님)
  }
}

// ------------------------------------------------------------------------------
// 5. 데이터 로드 (즉시 캐시 표시 → 백그라운드 동기화)
// ------------------------------------------------------------------------------
async function loadProjectData(options) {
  const manual = !!(options && options.manual);
  const sheetApiUrl = (state.sheetUrl || "").trim();
  const cached = readCache();

  // 1) 캐시가 있으면 fetch를 기다리지 않고 즉시 화면에 표시합니다.
  if (cached && cached.projects.length > 0) {
    state.allProjects = cached.projects;
    state.categories = cached.categories.length ? cached.categories : getDefaultCategories();
    renderAll();
  } else if (!cached) {
    // 캐시가 전혀 없는 첫 방문: 스켈레톤으로 "로딩 중"임을 보여줍니다.
    state.categories = getDefaultCategories();
    renderCategoryTabs();
    renderStatsBar();
    renderSkeleton();
  }

  if (!sheetApiUrl) {
    updateSyncIndicator(false);
    if (!cached) {
      state.allProjects = [];
      renderAll();
    }
    if (manual) showToast("연동된 구글 시트가 없습니다. 우측 상단 [시트 연동]을 설정해주세요.", "warning");
    return;
  }

  if (manual && DOM.btnReloadData) DOM.btnReloadData.classList.add("is-spinning");

  try {
    const response = await fetch(sheetApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);

    const data = await response.json();
    if (!data || data.ok === false || data.error) {
      throw new Error((data && data.message) || "시트에서 올바른 데이터를 받지 못했습니다.");
    }

    const projects = normalizeProjectsData(data.projects || []);
    const categories = normalizeCategoriesData(data.categories || []);
    const finalCategories = categories.length ? categories : getDefaultCategories();

    const isSameAsCache = cached &&
      JSON.stringify(projects) === JSON.stringify(cached.projects) &&
      JSON.stringify(finalCategories) === JSON.stringify(cached.categories);

    state.allProjects = projects;
    state.categories = finalCategories;
    writeCache({ projects, categories: finalCategories });
    updateSyncIndicator(true);

    if (!isSameAsCache || manual) {
      if (state.currentPage !== 1 && !isSameAsCache) state.currentPage = 1;
      renderAll();
    }

    if (manual) showToast("최신 데이터로 동기화했습니다. ✨", "success");
  } catch (error) {
    console.warn("구글 시트 연동 실패:", error);
    updateSyncIndicator(false);

    if (!cached) {
      state.allProjects = [];
      renderAll();
    }

    showToast(
      cached
        ? "최신 정보를 불러오지 못해 이전 데이터를 표시하고 있습니다."
        : "시트 연동에 실패했습니다. [시트 연동] 설정을 확인해주세요.",
      "warning"
    );
  } finally {
    if (DOM.btnReloadData) DOM.btnReloadData.classList.remove("is-spinning");
  }
}

function getDefaultCategories() {
  return (typeof CONFIG !== "undefined" && Array.isArray(CONFIG.DEFAULT_CATEGORIES))
    ? CONFIG.DEFAULT_CATEGORIES.map(c => Object.assign({}, c))
    : [];
}

/**
 * 서버(혹은 캐시) 원본 데이터를 내부 표준 규격으로 정제합니다.
 */
function normalizeProjectsData(rawList) {
  return rawList.map((item, index) => {
    let techStack = [];
    if (Array.isArray(item.techStack)) {
      techStack = item.techStack.filter(Boolean);
    } else if (typeof item.techStack === "string") {
      techStack = item.techStack.split(",").map(t => t.trim()).filter(Boolean);
    }

    const tag = item.tag || item.category || "웹사이트";

    return {
      id: item.id ? String(item.id) : ("local_" + index + "_" + Date.now()),
      title: item.title || "무제 프로젝트",
      description: item.description || "프로젝트 설명이 등록되지 않았습니다.",
      thumbnail: (item.thumbnail && /^https?:\/\//.test(item.thumbnail)) ? item.thumbnail : FALLBACK_THUMBNAIL,
      tag: tag,
      status: item.status || "운영 중",
      url: item.url || "",
      driveUrl: item.driveUrl || "",
      techStack: techStack.length > 0 ? techStack : [tag]
    };
  });
}

function normalizeCategoriesData(rawList) {
  const list = rawList.map((item, index) => ({
    id: item.id ? String(item.id) : ("cat_local_" + index),
    name: item.name || "미분류",
    icon: item.icon || "fa-solid fa-folder",
    color: /^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : "#00704A",
    order: (typeof item.order === "number" && !isNaN(item.order)) ? item.order : (index + 1)
  }));
  list.sort((a, b) => a.order - b.order);
  return list;
}

function updateSyncIndicator(isConnected) {
  if (!DOM.syncIndicator) return;
  if (isConnected) {
    DOM.syncIndicator.className = "sync-dot connected";
    DOM.syncIndicator.title = "구글 시트 실시간 연결 완료";
  } else {
    DOM.syncIndicator.className = "sync-dot demo";
    DOM.syncIndicator.title = "시트와 아직 연결되지 않았습니다";
  }
}

/** 카테고리/통계/필터/목록을 한 번에 다시 그립니다. */
function renderAll() {
  renderStatsBar();
  renderCategoryTabs();
  applyFilterAndRender();
}

// ------------------------------------------------------------------------------
// 6. 통계 바 & 카테고리 탭 렌더링 (동적 카테고리 기반)
// ------------------------------------------------------------------------------
function renderStatsBar() {
  if (!DOM.statsBar) return;

  const total = state.allProjects.length;

  let html = `
    <div class="stat-card ${state.selectedCategory === "전체" ? "is-selected" : ""}" data-filter="전체">
      <div class="stat-icon"><i class="fa-solid fa-layer-group"></i></div>
      <div class="stat-info">
        <span class="stat-value">${total}</span>
        <span class="stat-label">총 프로젝트</span>
      </div>
    </div>
  `;

  state.categories.forEach(cat => {
    const count = state.allProjects.filter(p => p.tag === cat.name).length;
    const selected = state.selectedCategory === cat.name ? "is-selected" : "";
    html += `
      <div class="stat-card ${selected}" data-filter="${escapeHtml(cat.name)}">
        <div class="stat-icon" style="background:${hexToRgba(cat.color, 0.15)}; color:${escapeHtml(cat.color)};">
          <i class="${escapeHtml(cat.icon)}"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">${count}</span>
          <span class="stat-label">${escapeHtml(cat.name)}</span>
        </div>
      </div>
    `;
  });

  DOM.statsBar.innerHTML = html;
}

function renderCategoryTabs() {
  if (!DOM.categoryTabs) return;

  let html = `
    <button class="tab-btn ${state.selectedCategory === "전체" ? "active" : ""}" data-category="전체">
      <i class="fa-solid fa-border-all"></i> 전체보기
    </button>
  `;

  state.categories.forEach(cat => {
    const active = state.selectedCategory === cat.name ? "active" : "";
    html += `
      <button class="tab-btn ${active}" data-category="${escapeHtml(cat.name)}">
        <i class="${escapeHtml(cat.icon)}"></i> ${escapeHtml(cat.name)}
      </button>
    `;
  });

  DOM.categoryTabs.innerHTML = html;
}

function getCategoryByName(name) {
  return state.categories.find(c => c.name === name) || {
    name: name || "미분류",
    color: "#5A554C",
    icon: "fa-solid fa-folder"
  };
}

// ------------------------------------------------------------------------------
// 7. 검색, 필터링 및 페이지네이션 슬라이싱 로직
// ------------------------------------------------------------------------------
function applyFilterAndRender() {
  const query = state.searchQuery.toLowerCase().trim();

  state.filteredProjects = state.allProjects.filter(project => {
    const matchCategory = (state.selectedCategory === "전체") || (project.tag === state.selectedCategory);
    const matchStatus = (state.selectedStatus === "전체") || (project.status === state.selectedStatus);

    let matchQuery = true;
    if (query) {
      const inTitle = (project.title || "").toLowerCase().includes(query);
      const inDesc = (project.description || "").toLowerCase().includes(query);
      const inTech = (project.techStack || []).some(t => t.toLowerCase().includes(query));
      const inTag = (project.tag || "").toLowerCase().includes(query);
      matchQuery = inTitle || inDesc || inTech || inTag;
    }

    return matchCategory && matchStatus && matchQuery;
  });

  const totalCount = state.filteredProjects.length;
  DOM.currentCount.textContent = totalCount;

  if (totalCount === 0) {
    DOM.projectGrid.innerHTML = "";
    DOM.projectGrid.style.gridTemplateColumns = "";
    DOM.emptyState.classList.remove("hidden");
    DOM.paginationContainer.classList.add("hidden");
    DOM.displayRangeInfo.textContent = "0-0";
    return;
  }

  DOM.emptyState.classList.add("hidden");

  let pagedProjects = [];
  let totalPages = 1;

  if (state.itemsPerPage === "all") {
    pagedProjects = state.filteredProjects;
    totalPages = 1;
    state.currentPage = 1;
    DOM.displayRangeInfo.textContent = `1-${totalCount}`;
  } else {
    const perPage = parseInt(state.itemsPerPage, 10) || 12;
    totalPages = Math.ceil(totalCount / perPage);

    if (state.currentPage > totalPages) state.currentPage = 1;

    const startIndex = (state.currentPage - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalCount);

    pagedProjects = state.filteredProjects.slice(startIndex, endIndex);
    DOM.displayRangeInfo.textContent = `${startIndex + 1}-${endIndex}`;
  }

  renderProjects(pagedProjects);
  renderPagination(totalPages, state.currentPage);
}

// ------------------------------------------------------------------------------
// 8. 프로젝트 목록 렌더링 (카드 그리드 뷰 vs 리스트 뷰)
// ------------------------------------------------------------------------------
function renderProjects(projects) {
  if (state.viewMode === "list") {
    DOM.projectGrid.className = "project-grid list-view";
    DOM.projectGrid.style.gridTemplateColumns = "";
    DOM.projectGrid.innerHTML = projects.map(p => createListItemHtml(p)).join("");
  } else {
    DOM.projectGrid.className = "project-grid";
    applyGridColumns();
    DOM.projectGrid.innerHTML = projects.map(p => createCardItemHtml(p)).join("");
  }
}

/** 가로 열 개수 선택값을 실제 그리드 컬럼 수로 적용합니다. */
function applyGridColumns() {
  if (!DOM.projectGrid) return;
  if (state.gridCols === "auto") {
    DOM.projectGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(260px, 1fr))";
  } else {
    DOM.projectGrid.style.gridTemplateColumns = `repeat(${parseInt(state.gridCols, 10) || 3}, 1fr)`;
  }
}

function renderSkeleton() {
  DOM.projectGrid.className = "project-grid";
  applyGridColumns();
  DOM.emptyState.classList.add("hidden");
  DOM.paginationContainer.classList.add("hidden");

  let html = "";
  for (let i = 0; i < 6; i++) {
    html += `
      <div class="project-card skeleton-card" aria-hidden="true">
        <div class="skeleton-block skeleton-thumb"></div>
        <div class="card-body">
          <div class="skeleton-block skeleton-line" style="width:70%;"></div>
          <div class="skeleton-block skeleton-line" style="width:100%;"></div>
          <div class="skeleton-block skeleton-line" style="width:85%;"></div>
        </div>
      </div>
    `;
  }
  DOM.projectGrid.innerHTML = html;
}

function categoryBadgeStyle(colorHex) {
  return `background:${hexToRgba(colorHex, 0.16)}; color:${colorHex}; border:1px solid ${hexToRgba(colorHex, 0.35)};`;
}

function createCardItemHtml(project) {
  const cat = getCategoryByName(project.tag);
  const statusClass = `status-${project.status.replace(/\s+/g, "")}`;

  const displayTech = (project.techStack || []).slice(0, 3);
  const techMoreCount = (project.techStack || []).length - displayTech.length;
  const techChipsHtml = displayTech.map(tech => `<span class="tech-chip">#${escapeHtml(tech)}</span>`).join("")
    + (techMoreCount > 0 ? `<span class="tech-chip">+${techMoreCount}</span>` : "");

  let linkActionHtml = "";
  if (project.url) {
    linkActionHtml = `
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer" class="btn-card-action primary" data-action="link">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> 바로가기
      </a>
    `;
  } else if (project.driveUrl) {
    linkActionHtml = `
      <a href="${escapeHtml(project.driveUrl)}" target="_blank" rel="noopener noreferrer" class="btn-card-action download" data-action="link">
        <i class="fa-solid fa-cloud-arrow-down"></i> 다운로드
      </a>
    `;
  } else {
    linkActionHtml = `
      <button class="btn-card-action primary" data-action="detail">
        <i class="fa-solid fa-circle-info"></i> 상세 정보
      </button>
    `;
  }

  return `
    <article class="project-card" data-id="${escapeHtml(project.id)}">
      <div class="card-thumbnail-box">
        <img src="${escapeHtml(project.thumbnail)}"
             alt="${escapeHtml(project.title)}"
             class="card-img"
             loading="lazy"
             onerror="this.onerror=null; this.src='${FALLBACK_THUMBNAIL}';">

        <div class="card-badges">
          <span class="card-badge" style="${categoryBadgeStyle(cat.color)}">
            <i class="${escapeHtml(cat.icon)}"></i> ${escapeHtml(project.tag)}
          </span>
          <span class="status-badge ${statusClass}">
            <span class="dot"></span> ${escapeHtml(project.status)}
          </span>
        </div>

        <div class="card-quick-actions">
          <button class="btn-quick-action" data-action="edit" title="수정"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-quick-action danger" data-action="delete" title="삭제"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>

      <div class="card-body">
        <h3 class="card-title" data-action="detail">${escapeHtml(project.title)}</h3>
        <p class="card-desc">${escapeHtml(project.description)}</p>
        <div class="card-tech-list">${techChipsHtml}</div>
      </div>

      <div class="card-footer">
        ${linkActionHtml}
        <button class="btn-card-detail" title="자세히 보기" data-action="detail">
          <i class="fa-solid fa-expand"></i>
        </button>
      </div>
    </article>
  `;
}

function createListItemHtml(project) {
  const cat = getCategoryByName(project.tag);
  const statusClass = `status-${project.status.replace(/\s+/g, "")}`;

  const displayTech = (project.techStack || []).slice(0, 2);
  const techChipsHtml = displayTech.map(tech => `<span class="tech-chip">#${escapeHtml(tech)}</span>`).join("");

  let linkActionHtml = "";
  if (project.url) {
    linkActionHtml = `
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer" class="btn-list-action primary" data-action="link">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> <span class="btn-label-text">바로가기</span>
      </a>
    `;
  } else if (project.driveUrl) {
    linkActionHtml = `
      <a href="${escapeHtml(project.driveUrl)}" target="_blank" rel="noopener noreferrer" class="btn-list-action download" data-action="link">
        <i class="fa-solid fa-cloud-arrow-down"></i> <span class="btn-label-text">다운로드</span>
      </a>
    `;
  }

  return `
    <div class="project-list-item" data-id="${escapeHtml(project.id)}">
      <div class="list-thumb-box">
        <img src="${escapeHtml(project.thumbnail)}"
             alt="${escapeHtml(project.title)}"
             class="list-thumb-img"
             loading="lazy"
             onerror="this.onerror=null; this.src='${FALLBACK_THUMBNAIL}';">
      </div>

      <div class="list-content-box" data-action="detail">
        <div class="list-header">
          <h3 class="list-title">${escapeHtml(project.title)}</h3>
          <div class="list-badges">
            <span class="card-badge" style="${categoryBadgeStyle(cat.color)}">${escapeHtml(project.tag)}</span>
            <span class="status-badge ${statusClass}">
              <span class="dot"></span> ${escapeHtml(project.status)}
            </span>
          </div>
        </div>
        <p class="list-desc">${escapeHtml(project.description)}</p>
        <div class="list-tags">${techChipsHtml}</div>
      </div>

      <div class="list-actions-box">
        ${linkActionHtml}
        <button class="btn-list-action detail" title="자세히 보기" data-action="detail">
          <i class="fa-solid fa-expand"></i>
        </button>
        <button class="btn-list-action edit" title="수정" data-action="edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn-list-action delete" title="삭제" data-action="delete">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------------------
// 9. 페이지네이션 컨트롤러 렌더링
// ------------------------------------------------------------------------------
function renderPagination(totalPages, currentPage) {
  if (totalPages <= 1 || state.itemsPerPage === "all") {
    DOM.paginationContainer.classList.add("hidden");
    DOM.paginationContainer.innerHTML = "";
    return;
  }

  DOM.paginationContainer.classList.remove("hidden");

  let html = "";
  const prevDisabled = currentPage === 1 ? "disabled" : "";
  html += `
    <button class="btn-page-nav" ${prevDisabled} data-page="${currentPage - 1}" aria-label="이전 페이지">
      <i class="fa-solid fa-chevron-left"></i> 이전
    </button>
  `;

  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) startPage = Math.max(1, endPage - maxButtons + 1);

  if (startPage > 1) {
    html += `<button class="btn-page-number" data-page="1">1</button>`;
    if (startPage > 2) html += `<span class="page-ellipsis">...</span>`;
  }

  for (let p = startPage; p <= endPage; p++) {
    html += `<button class="btn-page-number ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
    html += `<button class="btn-page-number" data-page="${totalPages}">${totalPages}</button>`;
  }

  const nextDisabled = currentPage === totalPages ? "disabled" : "";
  html += `
    <button class="btn-page-nav" ${nextDisabled} data-page="${currentPage + 1}" aria-label="다음 페이지">
      다음 <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  DOM.paginationContainer.innerHTML = html;
}

function goToPage(pageNum) {
  state.currentPage = pageNum;
  applyFilterAndRender();
  DOM.projectGrid.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ------------------------------------------------------------------------------
// 10. 보기 모드 전환 (카드 뷰 ↔ 리스트 뷰)
// ------------------------------------------------------------------------------
function setViewMode(mode) {
  if (state.viewMode === mode) return;
  state.viewMode = mode;
  localStorage.setItem("soocheon_view_mode", mode);
  updateViewModeButtons();
  applyFilterAndRender();
}

function updateViewModeButtons() {
  if (!DOM.btnViewGrid || !DOM.btnViewList) return;
  if (state.viewMode === "list") {
    DOM.btnViewList.classList.add("active");
    DOM.btnViewGrid.classList.remove("active");
  } else {
    DOM.btnViewGrid.classList.add("active");
    DOM.btnViewList.classList.remove("active");
  }
}

// ------------------------------------------------------------------------------
// 11. 공용 모달 열기/닫기
// ------------------------------------------------------------------------------
function openModal(el) {
  if (!el) return;
  el.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(el) {
  if (!el) return;
  el.classList.add("hidden");
  document.body.style.overflow = "";
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay:not(.hidden)").forEach(m => closeModal(m));
}

// ------------------------------------------------------------------------------
// 12. 프로젝트 상세 보기 모달
// ------------------------------------------------------------------------------
function openDetailModal(projectId) {
  const project = state.allProjects.find(p => p.id === projectId);
  if (!project) return;

  const cat = getCategoryByName(project.tag);

  DOM.modalTitle.textContent = project.title;
  DOM.modalDescription.textContent = project.description;
  DOM.modalThumbnail.src = project.thumbnail;
  DOM.modalThumbnail.onerror = () => { DOM.modalThumbnail.src = FALLBACK_THUMBNAIL; };

  DOM.modalCategoryBadge.textContent = project.tag;
  DOM.modalCategoryBadge.setAttribute("style", categoryBadgeStyle(cat.color));

  DOM.modalStatusBadge.textContent = project.status;
  DOM.modalStatusBadge.className = `card-badge status-badge status-${project.status.replace(/\s+/g, "")}`;

  DOM.modalTechStack.innerHTML = (project.techStack || [])
    .map(tech => `<span class="tech-tag-pill">#${escapeHtml(tech)}</span>`)
    .join("");

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
  actionsHtml += `
    <button type="button" class="btn-secondary" id="modalEditBtn">
      <i class="fa-solid fa-pen"></i> 수정
    </button>
    <button type="button" class="btn-danger" id="modalDeleteBtn">
      <i class="fa-solid fa-trash-can"></i> 삭제
    </button>
  `;
  DOM.modalActions.innerHTML = actionsHtml;

  document.getElementById("modalEditBtn").addEventListener("click", () => {
    closeModal(DOM.detailModal);
    openProjectForm("edit", project.id);
  });
  document.getElementById("modalDeleteBtn").addEventListener("click", () => {
    closeModal(DOM.detailModal);
    requestDeleteProject(project.id);
  });

  openModal(DOM.detailModal);
}

// ------------------------------------------------------------------------------
// 13. 구글 시트 연동 설정 모달
// ------------------------------------------------------------------------------
function openSettingsModal() {
  DOM.inputSheetUrl.value = state.sheetUrl;
  openModal(DOM.settingsModal);
}

// ------------------------------------------------------------------------------
// 14. 테마(다크/라이트) 전환
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
}

// ------------------------------------------------------------------------------
// 15. 구글 시트 통신 헬퍼
// ------------------------------------------------------------------------------
async function postToSheet(bodyObj) {
  if (!state.sheetUrl) {
    throw new Error("먼저 [시트 연동]에서 Apps Script URL을 등록해주세요.");
  }

  const response = await fetch(state.sheetUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(bodyObj)
  });

  if (!response.ok) {
    throw new Error("서버 응답 오류 (HTTP " + response.status + ")");
  }

  return await response.json();
}

// ------------------------------------------------------------------------------
// 16. 프로젝트 등록 / 수정 폼 모달
// ------------------------------------------------------------------------------
function populateCategorySelect(selectEl, selectedName) {
  if (!selectEl) return;
  selectEl.innerHTML = state.categories.map(cat =>
    `<option value="${escapeHtml(cat.name)}">${escapeHtml(cat.name)}</option>`
  ).join("");
  if (selectedName) selectEl.value = selectedName;
}

function openProjectForm(mode, projectId) {
  state.formMode = mode;
  state.editingProjectId = projectId || null;

  populateCategorySelect(DOM.fCategory);

  if (mode === "edit") {
    const project = state.allProjects.find(p => p.id === projectId);
    if (!project) return;

    DOM.projectFormTitle.textContent = "프로젝트 수정";
    DOM.projectFormDesc.textContent = "수정한 내용은 구글 시트에도 즉시 반영됩니다.";
    DOM.projectFormIcon.className = "fa-solid fa-pen";
    DOM.projectFormSubmitText.textContent = "수정 내용 저장!";

    DOM.fUrl.value = project.url || "";
    DOM.fTitle.value = project.title || "";
    DOM.fDesc.value = project.description || "";
    DOM.fCategory.value = project.tag || "";
    DOM.fStatus.value = project.status || "운영 중";
    DOM.fThumbnail.value = project.thumbnail === FALLBACK_THUMBNAIL ? "" : (project.thumbnail || "");
    DOM.fDriveUrl.value = project.driveUrl || "";
    DOM.fTechStack.value = (project.techStack || []).join(", ");
  } else {
    DOM.projectFormTitle.textContent = "새 프로젝트 등록";
    DOM.projectFormDesc.textContent = "여기서 입력한 내용은 구글 시트에 자동으로 쏙! 추가됩니다.";
    DOM.projectFormIcon.className = "fa-solid fa-pen-to-square";
    DOM.projectFormSubmitText.textContent = "구글 시트로 전송!";

    DOM.fUrl.value = "";
    DOM.fTitle.value = "";
    DOM.fDesc.value = "";
    DOM.fCategory.value = state.selectedCategory !== "전체" ? state.selectedCategory : (state.categories[0] ? state.categories[0].name : "");
    DOM.fStatus.value = "운영 중";
    DOM.fThumbnail.value = "";
    DOM.fDriveUrl.value = "";
    DOM.fTechStack.value = "";
  }

  openModal(DOM.projectFormModal);
}

async function submitProjectForm() {
  const url = DOM.fUrl.value.trim();
  const title = DOM.fTitle.value.trim();

  if (!url || !title) {
    showToast("URL과 프로젝트 제목은 필수입니다!", "error");
    return;
  }

  if (!state.sheetUrl) {
    showToast("먼저 우측 상단 [시트 연동]에 Apps Script URL을 등록해주세요.", "error");
    closeModal(DOM.projectFormModal);
    openSettingsModal();
    return;
  }

  const payload = {
    url,
    title,
    description: DOM.fDesc.value.trim(),
    tag: DOM.fCategory.value,
    status: DOM.fStatus.value,
    thumbnail: DOM.fThumbnail.value.trim(),
    driveUrl: DOM.fDriveUrl.value.trim(),
    techStack: DOM.fTechStack.value.trim()
  };

  const btn = DOM.btnSubmitProjectForm;
  const originalHtml = btn.innerHTML;
  btn.disabled = true;

  if (state.formMode === "edit") {
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';
    const id = state.editingProjectId;
    closeModal(DOM.projectFormModal);
    await submitProjectEdit(id, payload);
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    return;
  }

  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 등록 중...';
  try {
    await submitProjectCreate(payload);
    showToast("새 프로젝트가 등록되었습니다! 🎉", "success");
    closeModal(DOM.projectFormModal);
  } catch (error) {
    console.error(error);
    showToast("등록 실패: " + error.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function submitProjectCreate(payload) {
  const res = await postToSheet({ action: "project.create", project: payload });
  if (!res.success) throw new Error(res.message || "등록에 실패했습니다.");

  const newId = res.data && res.data.id;
  const newProject = normalizeProjectsData([Object.assign({}, payload, { id: newId })])[0];
  state.allProjects.push(newProject);
  writeCache({ projects: state.allProjects, categories: state.categories });
  renderAll();
}

/** 수정은 낙관적(optimistic) 업데이트: 화면을 먼저 바꾸고, 실패하면 되돌립니다. */
async function submitProjectEdit(id, payload) {
  const idx = state.allProjects.findIndex(p => p.id === id);
  const previous = idx >= 0 ? Object.assign({}, state.allProjects[idx]) : null;

  if (idx >= 0) {
    const merged = normalizeProjectsData([Object.assign({}, payload, { id })])[0];
    state.allProjects[idx] = merged;
    writeCache({ projects: state.allProjects, categories: state.categories });
    renderAll();
  }

  try {
    const res = await postToSheet({ action: "project.update", project: Object.assign({ id }, payload) });
    if (!res.success) throw new Error(res.message || "수정에 실패했습니다.");
    showToast("프로젝트가 수정되었습니다. ✏️", "success");
  } catch (error) {
    console.error(error);
    if (previous && idx >= 0) {
      state.allProjects[idx] = previous;
      writeCache({ projects: state.allProjects, categories: state.categories });
      renderAll();
    }
    showToast("수정 실패: " + error.message, "error");
  }
}

function requestDeleteProject(id) {
  const project = state.allProjects.find(p => p.id === id);
  if (!project) return;

  openConfirmModal({
    title: "프로젝트를 삭제할까요?",
    desc: `'${project.title}' 항목이 구글 시트에서도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
    onConfirm: () => performDeleteProject(id)
  });
}

/** 삭제도 낙관적 업데이트: 즉시 화면에서 지우고, 실패 시 되돌립니다. */
async function performDeleteProject(id) {
  const idx = state.allProjects.findIndex(p => p.id === id);
  const removed = idx >= 0 ? state.allProjects[idx] : null;

  if (idx >= 0) {
    state.allProjects.splice(idx, 1);
    writeCache({ projects: state.allProjects, categories: state.categories });
    renderAll();
  }

  try {
    const res = await postToSheet({ action: "project.delete", id });
    if (!res.success) throw new Error(res.message || "삭제에 실패했습니다.");
    showToast("프로젝트가 삭제되었습니다. 🗑", "success");
  } catch (error) {
    console.error(error);
    if (removed) {
      state.allProjects.splice(idx, 0, removed);
      writeCache({ projects: state.allProjects, categories: state.categories });
      renderAll();
    }
    showToast("삭제 실패: " + error.message, "error");
  }
}

// ------------------------------------------------------------------------------
// 17. 탭(카테고리) 관리 모달
// ------------------------------------------------------------------------------
function openCategoryModal() {
  renderCategoryManageList();
  DOM.newCategoryName.value = "";
  DOM.newCategoryColor.value = "#00704A";
  openModal(DOM.categoryModal);
}

function renderCategoryManageList() {
  const sorted = [...state.categories].sort((a, b) => a.order - b.order);

  DOM.categoryManageList.innerHTML = sorted.map((cat, idx) => `
    <div class="category-manage-row" data-id="${escapeHtml(cat.id)}">
      <input type="color" class="color-input" value="${escapeHtml(cat.color)}" data-field="color" title="탭 색상">
      <input type="text" class="form-input cat-name-input" value="${escapeHtml(cat.name)}" data-field="name">
      <div class="cat-manage-actions">
        <button class="btn-icon-mini" data-action="cat-up" ${idx === 0 ? "disabled" : ""} title="위로"><i class="fa-solid fa-arrow-up"></i></button>
        <button class="btn-icon-mini" data-action="cat-down" ${idx === sorted.length - 1 ? "disabled" : ""} title="아래로"><i class="fa-solid fa-arrow-down"></i></button>
        <button class="btn-icon-mini" data-action="cat-save" title="이 탭 저장"><i class="fa-solid fa-check"></i></button>
        <button class="btn-icon-mini danger" data-action="cat-delete" title="탭 삭제"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </div>
  `).join("");
}

async function saveCategoryRow(id) {
  const row = DOM.categoryManageList.querySelector(`[data-id="${cssEscape(id)}"]`);
  if (!row) return;

  const name = row.querySelector('[data-field="name"]').value.trim();
  const color = row.querySelector('[data-field="color"]').value;

  if (!name) {
    showToast("탭 이름을 입력해주세요.", "error");
    return;
  }

  try {
    const res = await postToSheet({ action: "category.update", category: { id, name, color } });
    if (!res.success) throw new Error(res.message || "탭 수정에 실패했습니다.");

    const cat = state.categories.find(c => c.id === id);
    const oldName = cat ? cat.name : null;

    if (cat) {
      cat.name = name;
      cat.color = color;
    }

    if (oldName && oldName !== name) {
      state.allProjects.forEach(p => { if (p.tag === oldName) p.tag = name; });
      if (state.selectedCategory === oldName) state.selectedCategory = name;
    }

    writeCache({ projects: state.allProjects, categories: state.categories });
    renderAll();
    renderCategoryManageList();
    showToast("탭 정보가 저장되었습니다.", "success");
  } catch (error) {
    console.error(error);
    showToast("탭 저장 실패: " + error.message, "error");
  }
}

function requestDeleteCategory(id) {
  if (state.categories.length <= 1) {
    showToast("탭은 최소 1개는 있어야 합니다.", "error");
    return;
  }

  const cat = state.categories.find(c => c.id === id);
  if (!cat) return;

  const others = state.categories.filter(c => c.id !== id);
  const count = state.allProjects.filter(p => p.tag === cat.name).length;
  const optionsHtml = others.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");

  openConfirmModal({
    title: `'${cat.name}' 탭을 삭제할까요?`,
    desc: count > 0
      ? `이 탭에 속한 프로젝트 ${count}개를 아래에서 고른 탭으로 옮긴 뒤 삭제합니다.`
      : "이 탭에는 등록된 프로젝트가 없습니다.",
    extraHtml: count > 0
      ? `<label class="form-label">프로젝트를 옮길 탭</label>
         <select id="fallbackCategorySelect" class="form-input">${optionsHtml}</select>`
      : "",
    onConfirm: () => {
      const fallbackSelect = document.getElementById("fallbackCategorySelect");
      const fallbackName = fallbackSelect ? fallbackSelect.value : (others[0] && others[0].name);
      performDeleteCategory(id, fallbackName);
    }
  });
}

async function performDeleteCategory(id, fallbackName) {
  try {
    const res = await postToSheet({ action: "category.delete", id, fallbackName });
    if (!res.success) throw new Error(res.message || "탭 삭제에 실패했습니다.");

    const cat = state.categories.find(c => c.id === id);
    state.categories = state.categories.filter(c => c.id !== id);

    if (cat && fallbackName) {
      state.allProjects.forEach(p => { if (p.tag === cat.name) p.tag = fallbackName; });
    }
    if (state.selectedCategory === (cat && cat.name)) state.selectedCategory = "전체";

    writeCache({ projects: state.allProjects, categories: state.categories });
    renderAll();
    renderCategoryManageList();
    showToast("탭이 삭제되었습니다.", "success");
  } catch (error) {
    console.error(error);
    showToast("탭 삭제 실패: " + error.message, "error");
  }
}

async function moveCategoryOrder(id, direction) {
  const sorted = [...state.categories].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(c => c.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

  const tmp = sorted[idx].order;
  sorted[idx].order = sorted[swapIdx].order;
  sorted[swapIdx].order = tmp;
  sorted.sort((a, b) => a.order - b.order);

  renderCategoryManageList();

  try {
    const res = await postToSheet({ action: "category.reorder", order: sorted.map(c => c.id) });
    if (!res.success) throw new Error(res.message || "순서 변경에 실패했습니다.");
    state.categories = sorted;
    writeCache({ projects: state.allProjects, categories: state.categories });
    renderAll();
    renderCategoryManageList();
  } catch (error) {
    console.error(error);
    showToast("탭 순서 변경 실패: " + error.message, "error");
  }
}

async function addCategory() {
  const name = DOM.newCategoryName.value.trim();
  const color = DOM.newCategoryColor.value || "#00704A";

  if (!name) {
    showToast("새 탭 이름을 입력해주세요.", "error");
    return;
  }

  try {
    const res = await postToSheet({ action: "category.create", category: { name, color, icon: "fa-solid fa-folder" } });
    if (!res.success) throw new Error(res.message || "탭 추가에 실패했습니다.");

    state.categories.push({
      id: res.data && res.data.id,
      name,
      color,
      icon: "fa-solid fa-folder",
      order: state.categories.length + 1
    });

    writeCache({ projects: state.allProjects, categories: state.categories });
    DOM.newCategoryName.value = "";
    renderAll();
    renderCategoryManageList();
    showToast(`'${name}' 탭이 추가되었습니다. 🎉`, "success");
  } catch (error) {
    console.error(error);
    showToast("탭 추가 실패: " + error.message, "error");
  }
}

// ------------------------------------------------------------------------------
// 18. 공용 삭제/확인 모달
// ------------------------------------------------------------------------------
function openConfirmModal({ title, desc, extraHtml, onConfirm }) {
  DOM.confirmModalTitle.textContent = title;
  DOM.confirmModalDesc.textContent = desc;

  if (extraHtml) {
    DOM.confirmModalExtra.innerHTML = extraHtml;
    DOM.confirmModalExtra.classList.remove("hidden");
  } else {
    DOM.confirmModalExtra.innerHTML = "";
    DOM.confirmModalExtra.classList.add("hidden");
  }

  state.confirmAction = onConfirm;
  openModal(DOM.confirmModal);
}

// ------------------------------------------------------------------------------
// 19. 전체 이벤트 리스너 등록
// ------------------------------------------------------------------------------
function setupEventListeners() {
  // 테마 전환
  DOM.btnToggleTheme.addEventListener("click", toggleTheme);

  // 실시간 검색
  DOM.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    DOM.btnClearSearch.classList.toggle("hidden", !state.searchQuery);
    state.currentPage = 1;
    applyFilterAndRender();
  });

  DOM.btnClearSearch.addEventListener("click", () => {
    DOM.searchInput.value = "";
    state.searchQuery = "";
    DOM.btnClearSearch.classList.add("hidden");
    state.currentPage = 1;
    applyFilterAndRender();
    DOM.searchInput.focus();
  });

  // 카테고리 탭 클릭 (이벤트 위임)
  DOM.categoryTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    state.selectedCategory = btn.dataset.category;
    state.currentPage = 1;
    renderCategoryTabs();
    renderStatsBar();
    applyFilterAndRender();
  });

  // 탭 관리 버튼
  if (DOM.btnManageCategories) {
    DOM.btnManageCategories.addEventListener("click", openCategoryModal);
  }

  // 상태 드롭다운 필터
  DOM.statusFilter.addEventListener("change", (e) => {
    state.selectedStatus = e.target.value;
    state.currentPage = 1;
    applyFilterAndRender();
  });

  // 필터 초기화
  DOM.btnResetFilters.addEventListener("click", () => {
    DOM.searchInput.value = "";
    state.searchQuery = "";
    DOM.btnClearSearch.classList.add("hidden");
    state.selectedCategory = "전체";
    state.selectedStatus = "전체";
    DOM.statusFilter.value = "전체";
    state.currentPage = 1;
    renderCategoryTabs();
    renderStatsBar();
    applyFilterAndRender();
  });

  // 통계 카드 클릭 → 해당 카테고리로 필터링 (이벤트 위임)
  DOM.statsBar.addEventListener("click", (e) => {
    const card = e.target.closest(".stat-card");
    if (!card) return;
    const targetCategory = card.dataset.filter;
    if (!targetCategory) return;

    state.selectedCategory = targetCategory;
    state.currentPage = 1;
    renderCategoryTabs();
    renderStatsBar();
    applyFilterAndRender();
    DOM.projectGrid.scrollIntoView({ behavior: "smooth" });
  });

  // 가로 열 개수 선택
  if (DOM.columnSelect) {
    DOM.columnSelect.addEventListener("change", (e) => {
      state.gridCols = e.target.value;
      localStorage.setItem("soocheon_grid_cols", state.gridCols);
      if (state.viewMode === "grid") applyGridColumns();
    });
  }

  // 표시 개수(세로) 선택
  if (DOM.itemsPerPageSelect) {
    DOM.itemsPerPageSelect.addEventListener("change", (e) => {
      state.itemsPerPage = e.target.value;
      localStorage.setItem("soocheon_per_page", state.itemsPerPage);
      state.currentPage = 1;
      applyFilterAndRender();
    });
  }

  // 보기 형태 전환
  if (DOM.btnViewGrid) DOM.btnViewGrid.addEventListener("click", () => setViewMode("grid"));
  if (DOM.btnViewList) DOM.btnViewList.addEventListener("click", () => setViewMode("list"));

  // 새로고침 (수동 새로고침이므로 토스트를 띄웁니다)
  DOM.btnReloadData.addEventListener("click", () => loadProjectData({ manual: true }));

  // 프로젝트 카드/리스트 목록 영역 이벤트 위임 (상세보기 / 수정 / 삭제 / 바로가기)
  DOM.projectGrid.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    const container = e.target.closest("[data-id]");
    if (!container) return;
    const id = container.dataset.id;

    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action === "edit") {
        e.preventDefault(); e.stopPropagation();
        openProjectForm("edit", id);
      } else if (action === "delete") {
        e.preventDefault(); e.stopPropagation();
        requestDeleteProject(id);
      } else if (action === "detail") {
        e.preventDefault(); e.stopPropagation();
        openDetailModal(id);
      } else if (action === "link") {
        e.stopPropagation(); // 새 탭 이동은 그대로 허용, 카드 클릭(상세보기)만 막음
      }
      return;
    }

    openDetailModal(id);
  });

  // 상세 모달
  DOM.btnCloseModal.addEventListener("click", () => closeModal(DOM.detailModal));

  // 시트 연동 설정 모달
  DOM.btnOpenSettings.addEventListener("click", openSettingsModal);
  DOM.btnCloseSettings.addEventListener("click", () => closeModal(DOM.settingsModal));
  DOM.btnSaveSettings.addEventListener("click", () => {
    const newUrl = DOM.inputSheetUrl.value.trim();
    state.sheetUrl = newUrl;
    localStorage.setItem("soocheon_sheet_url", newUrl);
    closeModal(DOM.settingsModal);
    loadProjectData({ manual: true });
  });

  // 새 프로젝트 등록 (헤더 버튼 + 모바일 플로팅 버튼)
  if (DOM.btnAddProject) DOM.btnAddProject.addEventListener("click", () => openProjectForm("create"));
  if (DOM.btnAddProjectFloat) DOM.btnAddProjectFloat.addEventListener("click", () => openProjectForm("create"));
  if (DOM.btnCloseProjectForm) DOM.btnCloseProjectForm.addEventListener("click", () => closeModal(DOM.projectFormModal));
  if (DOM.btnCancelProjectForm) DOM.btnCancelProjectForm.addEventListener("click", () => closeModal(DOM.projectFormModal));
  if (DOM.btnSubmitProjectForm) DOM.btnSubmitProjectForm.addEventListener("click", submitProjectForm);

  // 탭(카테고리) 관리 모달
  if (DOM.btnCloseCategoryModal) DOM.btnCloseCategoryModal.addEventListener("click", () => closeModal(DOM.categoryModal));
  if (DOM.btnAddCategory) DOM.btnAddCategory.addEventListener("click", addCategory);
  if (DOM.categoryManageList) {
    DOM.categoryManageList.addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;
      const row = actionEl.closest("[data-id]");
      if (!row) return;
      const id = row.dataset.id;
      const action = actionEl.dataset.action;

      if (action === "cat-up") moveCategoryOrder(id, "up");
      else if (action === "cat-down") moveCategoryOrder(id, "down");
      else if (action === "cat-save") saveCategoryRow(id);
      else if (action === "cat-delete") requestDeleteCategory(id);
    });
  }

  // 삭제/확인 모달
  DOM.btnConfirmCancel.addEventListener("click", () => closeModal(DOM.confirmModal));
  DOM.btnConfirmOk.addEventListener("click", () => {
    const action = state.confirmAction;
    state.confirmAction = null;
    closeModal(DOM.confirmModal);
    if (typeof action === "function") action();
  });

  // 모달 바깥(오버레이) 클릭 시 닫기 - 모든 모달 공통
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // ESC 키로 모든 모달 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });
}

// ------------------------------------------------------------------------------
// 20. 알림 토스트 (Toast Message)
// ------------------------------------------------------------------------------
let toastTimer = null;
function showToast(message, type = "success") {
  if (toastTimer) clearTimeout(toastTimer);

  DOM.toastText.textContent = message;

  if (type === "warning") {
    DOM.toastIcon.className = "fa-solid fa-triangle-exclamation";
  } else if (type === "info") {
    DOM.toastIcon.className = "fa-solid fa-circle-info";
  } else if (type === "error") {
    DOM.toastIcon.className = "fa-solid fa-circle-xmark";
  } else {
    DOM.toastIcon.className = "fa-solid fa-circle-check";
  }

  DOM.toast.classList.remove("hidden");
  toastTimer = setTimeout(() => DOM.toast.classList.add("hidden"), 3200);
}

// ------------------------------------------------------------------------------
// 21. 공용 유틸리티
// ------------------------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** data-id 값을 querySelector 속성 셀렉터에 안전하게 쓰기 위한 최소한의 이스케이프 */
function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

/** "#00704A" + 0.15 -> "rgba(0,112,74,0.15)" */
function hexToRgba(hex, alpha) {
  const clean = (hex || "#00704A").replace("#", "");
  const bigint = parseInt(clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
