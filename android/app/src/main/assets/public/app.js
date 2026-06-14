/* ==========================================================================
   SKVods Proxy - Android App Client
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // ========================================================================
  // 1. STATE MANAGEMENT
  // ========================================================================
  const state = {
    currentPage: 1,
    totalPages: 1,
    videosPerPage: 12,
    videos: [],
    users: [],
    usersMap: new Map(),
    tags: [],
    activePage: 'home',
    
    // Filters
    selectedUser: null,
    selectedTag: null,
    selectedSort: 'recent',
    searchQuery: '',
    
    // Local storage persistence
    history: JSON.parse(localStorage.getItem('skvods_history') || '[]'),
    favorites: JSON.parse(localStorage.getItem('skvods_favorites') || '[]'),
    settings: JSON.parse(localStorage.getItem('skvods_settings') || '{"defaultQuality":"auto","autoplay":true}'),
    theme: localStorage.getItem('skvods_theme') || 'dark',

    // Player
    hlsPlayer: null,
    currentVideo: null,
    currentStreamUrl: null
  };

  // API Base URLs - Direct connection to skvods.lol
  const API_BASE = 'https://skvods.lol/api';
  const CDN_BASE = 'https://cdn.skvods.lol';
  const DATA_BASE = 'https://skvods.lol/data';
  const STREAMS_BASE = 'https://cdn2.skvods.lol/test_streams';

  // ========================================================================
  // 2. DOM ELEMENTS CACHE
  // ========================================================================
  const el = {
    appSidebar: document.getElementById('app-sidebar'),
    menuToggleBtn: document.getElementById('menu-toggle-btn'),
    closeSidebarBtn: document.getElementById('close-sidebar-btn'),
    sidebarNavLinks: document.querySelectorAll('.sidebar-nav .nav-item'),
    streamersSidebarList: document.getElementById('streamers-sidebar-list'),
    sidebarSettingsBtn: document.getElementById('sidebar-settings-btn'),
    headerSettingsBtn: document.getElementById('header-settings-btn'),
    
    pageTitle: document.getElementById('page-title'),
    pageSubtitle: document.getElementById('page-subtitle'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    searchSuggestions: document.getElementById('search-suggestions'),
    filterToggleBtn: document.getElementById('filter-toggle-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeIcon: document.getElementById('theme-icon'),
    
    filterDrawer: document.getElementById('filter-drawer'),
    closeFiltersBtn: document.getElementById('close-filters-btn'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    filterStreamers: document.getElementById('filter-streamers'),
    filterSort: document.getElementById('filter-sort'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    applyFiltersBtn: document.getElementById('apply-filters-btn'),
    filterChips: document.querySelectorAll('.filter-chip'),
    
    contentBody: document.getElementById('content-body'),
    dashboardView: document.getElementById('dashboard-view'),
    seriesView: document.getElementById('series-view'),
    channelsView: document.getElementById('channels-view'),
    
    liveBannersSection: document.getElementById('live-banners-section'),
    liveChannelsGrid: document.getElementById('live-channels-grid'),
    gridTitle: document.getElementById('grid-title'),
    videosGrid: document.getElementById('videos-grid'),
    
    paginationContainer: document.getElementById('pagination-container'),
    paginationInfo: document.getElementById('pagination-info'),
    prevPageBtn: document.getElementById('prev-page-btn'),
    nextPageBtn: document.getElementById('next-page-btn'),
    
    seriesGrid: document.getElementById('series-grid'),
    channelsGrid: document.getElementById('channels-grid'),
    
    // Player Modal
    playerModal: document.getElementById('player-modal'),
    closePlayerBtn: document.getElementById('close-player-btn'),
    mainVideo: document.getElementById('main-video'),
    videoLoader: document.getElementById('video-loader'),
    
    videoInfoTag: document.getElementById('video-info-tag'),
    videoInfoViewsCount: document.getElementById('video-info-views-count'),
    videoInfoDurationTime: document.getElementById('video-info-duration-time'),
    videoFavoriteBtn: document.getElementById('video-favorite-btn'),
    videoShareBtn: document.getElementById('video-share-btn'),
    videoInfoTitle: document.getElementById('video-info-title'),
    videoInfoAvatar: document.getElementById('video-info-avatar'),
    videoInfoStreamer: document.getElementById('video-info-streamer'),
    videoInfoSocials: document.getElementById('video-info-socials'),
    
    videoDescriptionBox: document.getElementById('video-description-box'),
    videoDescriptionText: document.getElementById('video-description-text'),
    videoImdbCard: document.getElementById('video-imdb-card'),
    videoImdbRating: document.getElementById('video-imdb-rating'),
    videoImdbTitle: document.getElementById('video-imdb-title'),
    videoImdbGenres: document.getElementById('video-imdb-genres'),
    videoImdbYear: document.getElementById('video-imdb-year'),
    videoImdbPlot: document.getElementById('video-imdb-plot'),
    
    streamsList: document.getElementById('streams-list'),
    iaFilesWidget: document.getElementById('ia-files-widget'),
    iaFilesList: document.getElementById('ia-files-list'),
    imdbTimestampsWidget: document.getElementById('imdb-timestamps-widget'),
    imdbTimestampsList: document.getElementById('imdb-timestamps-list'),
    
    // Settings Modal
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    settingsDefaultQuality: document.getElementById('settings-default-quality'),
    settingsAutoplay: document.getElementById('settings-autoplay'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    toastContainer: document.getElementById('toast-container')
  };

  // ========================================================================
  // 3. TOAST SYSTEM
  // ========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';
    if (type === 'warning') icon = 'alert-circle';
    
    toast.innerHTML = `
      <i data-lucide="${icon}"></i>
      <span>${message}</span>
    `;
    
    el.toastContainer.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ========================================================================
  // 4. THEME & INITIALIZATION
  // ========================================================================
  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    state.theme = themeName;
    localStorage.setItem('skvods_theme', themeName);
    
    if (themeName === 'light') {
      el.themeIcon.setAttribute('data-lucide', 'sun');
    } else {
      el.themeIcon.setAttribute('data-lucide', 'moon');
    }
    lucide.createIcons();
  }

  // Initialize theme
  applyTheme(state.theme);

  // Initialize settings in modal
  el.settingsDefaultQuality.value = state.settings.defaultQuality || 'auto';
  el.settingsAutoplay.checked = state.settings.autoplay !== false;

  // Run app startup loads
  loadAppVer();
  initApp();

  async function initApp() {
    try {
      // 1. Fetch channels/users first so we can map IDs to names/images
      await fetchUsers();
      // 2. Fetch tags
      await fetchTags();
      // 3. Check for any query params (simple routing)
      parseUrlParams();
      // 4. Fetch initial videos
      await fetchVideos();
      // 5. Fetch live channels if available
      await fetchLiveChannels();
    } catch (err) {
      console.error("Erro na inicializacao do app:", err);
      showToast("Nao foi possivel carregar os dados iniciais.", "error");
    }
  }

  // ========================================================================
  // 5. ROUTING & QUERY PARAMS
  // ========================================================================
  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const tag = params.get('tag');
    const user = params.get('user');
    const sort = params.get('views');
    
    if (page === 'channels') {
      navigateToPage('channels');
    } else if (page === 'series') {
      navigateToPage('series');
    } else if (tag) {
      state.selectedTag = tag;
      navigateToPage('home');
      state.activePage = tag === 'live' ? 'lives' : 'home';
    } else if (user) {
      state.selectedUser = user;
      navigateToPage('home');
    }
    
    if (sort === 'top') {
      state.selectedSort = 'views';
    }
    
    updateActiveNavHighlight();
  }

  function navigateToPage(pageName) {
    state.activePage = pageName;
    state.currentPage = 1;
    
    // Hide all main views
    el.dashboardView.style.display = 'none';
    el.seriesView.style.display = 'none';
    el.channelsView.style.display = 'none';
    el.paginationContainer.style.display = 'none';
    
    // Reset specific search/filter if not on home
    if (pageName !== 'home' && pageName !== 'lives') {
      state.selectedTag = null;
      state.selectedUser = null;
    }
    
    // Clear search query
    state.searchQuery = '';
    el.searchInput.value = '';
    el.clearSearchBtn.style.display = 'none';
    
    updateActiveNavHighlight();

    if (pageName === 'home') {
      el.dashboardView.style.display = 'block';
      el.pageTitle.textContent = 'Inicio';
      el.pageSubtitle.textContent = 'Navegue pelos videos mais recentes';
      el.gridTitle.textContent = 'Videos Recentes';
      fetchVideos();
    } else if (pageName === 'lives') {
      el.dashboardView.style.display = 'block';
      el.pageTitle.textContent = 'Lives Recentes';
      el.pageSubtitle.textContent = 'Assista as ultimas transmissoes gravadas';
      el.gridTitle.textContent = 'Transmissoes Gravadas';
      state.selectedTag = 'live';
      fetchVideos();
    } else if (pageName === 'series') {
      el.seriesView.style.display = 'block';
      el.pageTitle.textContent = 'Series';
      el.pageSubtitle.textContent = 'Filtrar videos por serie ou temporada';
      renderSeriesGrid();
    } else if (pageName === 'channels') {
      el.channelsView.style.display = 'block';
      el.pageTitle.textContent = 'Canais';
      el.pageSubtitle.textContent = 'Streamers cadastrados no acervo';
      renderChannelsGrid();
    } else if (pageName === 'history') {
      el.dashboardView.style.display = 'block';
      el.pageTitle.textContent = 'Historico';
      el.pageSubtitle.textContent = 'Videos assistidos recentemente';
      el.gridTitle.textContent = 'Seu Historico';
      renderLocalVideosGrid(state.history);
    } else if (pageName === 'favorites') {
      el.dashboardView.style.display = 'block';
      el.pageTitle.textContent = 'Favoritos';
      el.pageSubtitle.textContent = 'Seus videos marcados com estrela';
      el.gridTitle.textContent = 'Videos Favoritos';
      renderLocalVideosGrid(state.favorites);
    }
  }

  function updateActiveNavHighlight() {
    el.sidebarNavLinks.forEach(link => {
      link.classList.remove('active');
      const page = link.getAttribute('data-page');
      if (page === state.activePage) {
        link.classList.add('active');
      }
    });
  }

  // ========================================================================
  // 6. API FETCH SERVICES
  // ========================================================================
  async function loadAppVer() {
    try {
      const res = await fetch(`${API_BASE}/app_ver`);
      if (res.ok) {
        const data = await res.json();
        console.log("Servidor versao:", data);
      }
    } catch (e) {
      console.warn("Nao foi possivel verificar a versao da API.");
    }
  }

  async function fetchUsers() {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error("Falha ao buscar usuarios");
    
    const data = await res.json();
    state.users = data;
    
    // Clear and build maps
    state.usersMap.clear();
    data.forEach(user => {
      state.usersMap.set(user.id, user);
    });
    
    // Populate Sidebar
    renderSidebarStreamers(data);
    
    // Populate Filters
    renderFilterStreamers(data);
  }

  async function fetchTags() {
    try {
      const res = await fetch(`${API_BASE}/tags?marked=true`);
      if (res.ok) {
        state.tags = await res.json();
      }
    } catch (e) {
      console.error("Erro ao buscar tags:", e);
    }
  }

  async function fetchLiveChannels() {
    try {
      const res = await fetch(`${DATA_BASE}/now_live.json`);
      if (!res.ok) return;
      const data = await res.json();
      
      const liveChannels = data.channels || [];
      if (liveChannels.length > 0) {
        el.liveBannersSection.style.display = 'block';
        el.liveChannelsGrid.innerHTML = '';
        
        liveChannels.forEach(ch => {
          const userObj = state.users.find(u => {
            const twitch = u.socials?.twitch?.toLowerCase();
            const kick = u.socials?.kick?.toLowerCase();
            const chName = ch.name.toLowerCase();
            return twitch === chName || kick === chName || u.name.toLowerCase() === chName;
          });
          
          const avatarUrl = userObj ? userObj.image : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&q=80';
          const card = document.createElement('div');
          card.className = 'live-channel-card';
          card.innerHTML = `
            <div class="live-avatar-box">
              <img src="${avatarUrl}" alt="${ch.name}" class="live-avatar" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&q=80'">
            </div>
            <div class="live-channel-info">
              <span class="live-channel-name">${userObj ? userObj.name : ch.name}</span>
              <span class="live-channel-title">${ch.title || 'Transmitindo ao vivo'}</span>
            </div>
          `;
          
          card.addEventListener('click', () => {
            if (ch.url) {
              openLiveStream(ch, userObj);
            } else {
              showToast("Stream ao vivo indisponivel no momento.", "warning");
            }
          });
          el.liveChannelsGrid.appendChild(card);
        });
      } else {
        el.liveBannersSection.style.display = 'none';
      }
    } catch (e) {
      console.warn("Erro ao buscar canais ao vivo:", e);
      el.liveBannersSection.style.display = 'none';
    }
  }

  async function fetchVideos() {
    showSkeletons();
    el.paginationContainer.style.display = 'none';
    
    try {
      let url = `${API_BASE}/list?limit=${state.videosPerPage}&page=${state.currentPage}`;
      
      if (state.selectedTag) {
        url = `${API_BASE}/list?tag=${state.selectedTag}&limit=100`;
      } else if (state.selectedUser) {
        url = `${API_BASE}/list?user=${state.selectedUser}&limit=${state.videosPerPage}&page=${state.currentPage}`;
      } else if (state.searchQuery) {
        url = `${API_BASE}/search?term=${encodeURIComponent(state.searchQuery)}&limit=30`;
      }
      
      if (state.selectedSort === 'views') {
        url += '&views=top';
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro de rede ao buscar videos");
      
      const data = await res.json();
      
      // The API format changes if it's search results vs list
      let videoList = [];
      let totalItems = 0;
      
      if (Array.isArray(data)) {
        videoList = data;
        totalItems = data.length;
      } else if (data.videos) {
        videoList = data.videos;
        totalItems = data.total_items || videoList.length;
      } else if (data.results) {
        videoList = data.results;
        totalItems = videoList.length;
      } else {
        videoList = [];
      }
      
      state.videos = videoList;
      
      // Calculate pagination
      if (state.selectedTag || state.searchQuery) {
        // Mock pagination for all results
        state.totalPages = 1;
      } else {
        state.totalPages = Math.ceil(totalItems / state.videosPerPage) || 1;
      }
      
      renderVideosGrid(videoList);
      
      if (state.totalPages > 1 && !state.selectedTag && !state.searchQuery) {
        el.paginationContainer.style.display = 'flex';
        el.paginationInfo.textContent = `Pagina ${state.currentPage} de ${state.totalPages}`;
        el.prevPageBtn.disabled = state.currentPage === 1;
        el.nextPageBtn.disabled = state.currentPage === state.totalPages;
      }
      
    } catch (err) {
      console.error(err);
      el.videosGrid.innerHTML = `
        <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger)">
          <i data-lucide="alert-triangle" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
          <h3>Erro ao carregar videos</h3>
          <p>${err.message}</p>
          <button class="btn btn-secondary" id="retry-btn" style="margin-top: 16px;">Tentar Novamente</button>
        </div>
      `;
      lucide.createIcons();
      document.getElementById('retry-btn')?.addEventListener('click', fetchVideos);
    }
  }

  // ========================================================================
  // 7. RENDERING LOGIC
  // ========================================================================
  function showSkeletons() {
    el.videosGrid.innerHTML = Array(state.videosPerPage).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-details">
          <div class="skeleton-title"></div>
          <div class="skeleton-text"></div>
        </div>
      </div>
    `).join('');
  }

  function renderSidebarStreamers(streamers) {
    el.streamersSidebarList.innerHTML = streamers.map(s => `
      <div class="streamer-sidebar-item" data-id="${s.id}">
        <div class="avatar-container-sidebar">
          <img src="${s.image}" alt="${s.name}" class="avatar-sidebar" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&q=80'">
          <span class="status-indicator offline" id="sidebar-status-${s.id}"></span>
        </div>
        <span>${s.name}</span>
      </div>
    `).join('');
    
    // Add click events
    el.streamersSidebarList.querySelectorAll('.streamer-sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        state.selectedUser = item.getAttribute('data-id');
        state.selectedTag = null;
        navigateToPage('home');
        el.pageTitle.textContent = `Clips de ${state.usersMap.get(state.selectedUser)?.name}`;
        el.gridTitle.textContent = `Videos de ${state.usersMap.get(state.selectedUser)?.name}`;
        if (window.innerWidth <= 768) {
          el.appSidebar.classList.remove('open');
        }
      });
    });
  }

  function renderFilterStreamers(streamers) {
    el.filterStreamers.innerHTML = streamers.map(s => `
      <button class="filter-chip" data-user-id="${s.id}">${s.name}</button>
    `).join('');
    
    // Filter chip clicks
    el.filterStreamers.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        el.filterStreamers.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  function formatDuration(sec) {
    if (!sec || isNaN(sec)) return "00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    
    const mm = m < 10 ? `0${m}` : m;
    const ss = s < 10 ? `0${s}` : s;
    
    if (h > 0) {
      return `${h}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch(e) {
      return "";
    }
  }

  function renderVideosGrid(videos) {
    if (videos.length === 0) {
      el.videosGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted)">
          <i data-lucide="folder-open" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
          <h3>Nenhum video encontrado</h3>
          <p>Tente alterar seus filtros de pesquisa.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    el.videosGrid.innerHTML = '';
    
    videos.forEach(v => {
      const user = state.usersMap.get(v.user);
      const userAvatar = user ? user.image : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&q=80';
      const userName = user ? user.name : (v.user_display_name || 'Streamer');
      const badgeClass = v.tag === 'live' ? 'badge-live' : (v.tag === 'filme' ? 'badge-movie' : 'badge-vod');
      const hasImdb = v.imdb && Object.keys(v.imdb).length > 0;
      
      const card = document.createElement('div');
      card.className = 'video-card';
      card.innerHTML = `
        <div class="card-thumbnail-wrapper">
          <img src="${v.poster || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'}" alt="${v.title}" class="card-thumbnail" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'">
          <span class="card-duration">${formatDuration(v.duration)}</span>
          <span class="badge ${badgeClass} card-badge-tag">${v.tag || 'VOD'}</span>
        </div>
        <div class="card-content">
          <div class="card-title-row">
            <img src="${userAvatar}" alt="${userName}" class="card-streamer-avatar" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&q=80'">
            <h3 class="card-title" title="${v.title}">${v.title}</h3>
          </div>
          <div class="card-meta">
            <span class="card-creator">${userName}</span>
            <div class="card-info-bottom">
              ${hasImdb ? '<span class="badge badge-movie" style="padding: 1px 6px; font-size: 0.6rem;"><i data-lucide="clapperboard" style="width: 10px; height: 10px;"></i> IMDb</span>' : ''}
              <span>${v.views || 0} views</span>
            </div>
          </div>
        </div>
      `;
      
      // Bind Player trigger
      card.querySelector('.card-thumbnail-wrapper').addEventListener('click', () => openVideoPlayer(v));
      card.querySelector('.card-title').addEventListener('click', () => openVideoPlayer(v));
      
      el.videosGrid.appendChild(card);
    });
    
    lucide.createIcons();
  }

  function renderLocalVideosGrid(videos) {
    if (videos.length === 0) {
      el.videosGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted)">
          <i data-lucide="video" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
          <h3>Nenhum video salvo localmente</h3>
          <p>Videos visualizados ou marcados aparecerao aqui.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }
    renderVideosGrid(videos);
  }

  function renderSeriesGrid() {
    // Group tags representing series
    const seriesTags = state.tags.filter(t => t.season !== null || t.slug.includes('-s') || t.slug.includes('season'));
    
    if (seriesTags.length === 0) {
      el.seriesGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color: var(--text-muted);">Nenhuma serie indexada encontrada.</p>`;
      return;
    }
    
    el.seriesGrid.innerHTML = seriesTags.map(t => {
      const creatorName = t.users?.map(id => state.usersMap.get(id)?.name).filter(Boolean).join(', ') || 'Streamer';
      return `
        <div class="series-card" data-slug="${t.slug}">
          <span class="series-badge">T ${t.season || '1'}</span>
          <h3 class="series-title">${t.name}</h3>
          <span class="series-meta">${t.video_count || 0} Episodios &bull; ${creatorName}</span>
          ${t.imdb_id ? `<span class="series-imdb-link"><i data-lucide="star" style="width: 12px; height:12px;"></i> IMDb ID: ${t.imdb_id}</span>` : ''}
        </div>
      `;
    }).join('');
    
    // Add Click listener
    el.seriesGrid.querySelectorAll('.series-card').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.getAttribute('data-slug');
        state.selectedTag = slug;
        navigateToPage('home');
        const sTag = state.tags.find(t => t.slug === slug);
        el.pageTitle.textContent = sTag ? sTag.name : 'Serie';
        el.gridTitle.textContent = `Episodios da serie`;
      });
    });
    
    lucide.createIcons();
  }

  function renderChannelsGrid() {
    el.channelsGrid.innerHTML = state.users.map(u => {
      const socials = u.socials || {};
      const socialBadges = Object.keys(socials).map(key => `
        <span class="social-icon-badge">${key}: ${socials[key]}</span>
      `).join('');
      
      return `
        <div class="channel-card" data-id="${u.id}">
          <img src="${u.image}" alt="${u.name}" class="channel-card-avatar" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&q=80'">
          <h3 class="channel-card-name">${u.name}</h3>
          <div class="channel-card-socials">
            ${socialBadges || '<span class="social-icon-badge">Apenas VODs</span>'}
          </div>
        </div>
      `;
    }).join('');
    
    // Click listeners
    el.channelsGrid.querySelectorAll('.channel-card').forEach(card => {
      card.addEventListener('click', () => {
        const userId = card.getAttribute('data-id');
        state.selectedUser = userId;
        state.selectedTag = null;
        navigateToPage('home');
        el.pageTitle.textContent = `${state.usersMap.get(userId)?.name} - VODs`;
        el.gridTitle.textContent = `Videos de ${state.usersMap.get(userId)?.name}`;
      });
    });
  }

  // ========================================================================
  // 8. THE VIDEO PLAYER ENGINE (HLS.js & MP4)
  // ========================================================================
  async function openVideoPlayer(video) {
    state.currentVideo = video;
    
    // Show modal & set loader
    el.playerModal.classList.add('open');
    el.videoLoader.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Basic Details
    el.videoInfoTitle.textContent = video.title;
    el.videoInfoTag.textContent = video.tag ? video.tag.toUpperCase() : 'VOD';
    el.videoInfoViewsCount.textContent = video.views || '0';
    el.videoInfoDurationTime.textContent = formatDuration(video.duration);
    
    // Streamer Details
    const streamer = state.usersMap.get(video.user);
    if (streamer) {
      el.videoInfoAvatar.src = streamer.image;
      el.videoInfoStreamer.textContent = streamer.name;
      
      // Render social links
      el.videoInfoSocials.innerHTML = '';
      if (streamer.socials) {
        Object.keys(streamer.socials).forEach(net => {
          let handle = streamer.socials[net];
          let url = '#';
          if (net === 'youtube') url = `https://youtube.com/${handle}`;
          if (net === 'twitch') url = `https://twitch.tv/${handle}`;
          if (net === 'kick') url = `https://kick.com/${handle}`;
          if (net === 'instagram') url = `https://instagram.com/${handle}`;
          if (net === 'twitter') url = `https://twitter.com/${handle}`;
          
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.className = 'streamer-social-btn';
          a.title = `${net}: ${handle}`;
          a.textContent = net.charAt(0).toUpperCase();
          el.videoInfoSocials.appendChild(a);
        });
      }
    } else {
      el.videoInfoAvatar.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&q=80';
      el.videoInfoStreamer.textContent = video.user_display_name || 'Desconhecido';
      el.videoInfoSocials.innerHTML = '';
    }
    
    // Favorite Button Status
    updateFavoriteButtonUI(video.id);
    
    // Description plot
    if (video.description) {
      el.videoDescriptionBox.style.display = 'block';
      el.videoDescriptionText.textContent = video.description;
    } else {
      el.videoDescriptionBox.style.display = 'none';
    }
    
    // Reset secondary panels
    el.iaFilesWidget.style.display = 'none';
    el.videoImdbCard.style.display = 'none';
    el.imdbTimestampsWidget.style.display = 'none';
    el.streamsList.innerHTML = `<div class="sidebar-loader"></div>`;
    
    // Log to Local History
    addToHistory(video);
    
    try {
      // 1. Fetch available stream URLs
      const res = await fetch(`${STREAMS_BASE}/${video.id}`);
      if (!res.ok) throw new Error("Erro ao obter fontes de transmissao.");
      
      const streamData = await res.json();
      const streams = streamData.available_streams || [];
      
      if (streams.length === 0) {
        throw new Error("Nenhum link de video disponivel.");
      }
      
      // Render stream list buttons
      renderStreamsSelectionList(streams);
      
      // Select quality based on settings
      let selectedStream = selectStreamByPreference(streams);
      if (selectedStream) {
        playStreamUrl(selectedStream.url, selectedStream.type);
      }
      
      // 2. Fetch Internet Archive details
      fetchIaFiles(video.id);
      
      // 3. Render IMDb timestamps inside stream if available
      renderImdbTimestamps(video);
      
    } catch(err) {
      console.error(err);
      el.videoLoader.style.display = 'none';
      el.streamsList.innerHTML = `<p style="color:var(--danger); font-size:0.85rem; padding:10px;">${err.message}</p>`;
      showToast(err.message, "error");
    }
  }

  function openLiveStream(liveInfo, userObj) {
    // Custom live streamer mock payload for player
    const mockVideo = {
      id: `live-${liveInfo.name}`,
      title: liveInfo.title || `Live de ${liveInfo.name}`,
      user: userObj ? userObj.id : '',
      user_display_name: liveInfo.name,
      views: 0,
      duration: 0,
      tag: 'live'
    };
    
    // Open player modal directly on this live URL
    state.currentVideo = mockVideo;
    el.playerModal.classList.add('open');
    el.videoLoader.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    el.videoInfoTitle.textContent = mockVideo.title;
    el.videoInfoTag.textContent = 'LIVE';
    el.videoInfoViewsCount.textContent = 'Ao vivo';
    el.videoInfoDurationTime.textContent = 'Ao vivo';
    
    if (userObj) {
      el.videoInfoAvatar.src = userObj.image;
      el.videoInfoStreamer.textContent = userObj.name;
    } else {
      el.videoInfoAvatar.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&q=80';
      el.videoInfoStreamer.textContent = liveInfo.name;
    }
    
    el.videoDescriptionBox.style.display = 'none';
    el.iaFilesWidget.style.display = 'none';
    el.videoImdbCard.style.display = 'none';
    el.imdbTimestampsWidget.style.display = 'none';
    
    // Live stream button
    el.streamsList.innerHTML = `
      <button class="stream-btn active" data-url="${liveInfo.url}">
        <span class="stream-name">Servidor Live Principal</span>
        <span class="stream-tag badge badge-live">HLS</span>
      </button>
    `;
    
    playStreamUrl(liveInfo.url, 'hls');
  }

  function renderStreamsSelectionList(streams) {
    el.streamsList.innerHTML = '';
    
    streams.forEach((st, idx) => {
      const btn = document.createElement('button');
      btn.className = 'stream-btn';
      btn.setAttribute('data-idx', idx);
      
      const badgeClass = st.type === 'hls' ? 'badge-live' : 'badge-vod';
      const label = st.type === 'hls' ? `Stream HLS (${st.quality})` : `Download MP4 (${st.quality})`;
      
      btn.innerHTML = `
        <span class="stream-name">${label}</span>
        <span class="stream-tag badge ${badgeClass}">${st.type.toUpperCase()}</span>
      `;
      
      btn.addEventListener('click', () => {
        el.streamsList.querySelectorAll('.stream-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playStreamUrl(st.url, st.type);
      });
      
      el.streamsList.appendChild(btn);
    });
  }

  function selectStreamByPreference(streams) {
    const pref = state.settings.defaultQuality || 'auto';
    
    // Find HLS streams first if default is auto
    if (pref === 'auto') {
      const hlsSource = streams.find(s => s.type === 'hls' && s.quality === 'source');
      if (hlsSource) return hlsSource;
      const hlsAny = streams.find(s => s.type === 'hls');
      if (hlsAny) return hlsAny;
    } else {
      // Find quality matching preference
      const match = streams.find(s => s.quality === pref);
      if (match) return match;
    }
    
    // Fallback to first available stream
    return streams[0];
  }

  function playStreamUrl(url, type) {
    state.currentStreamUrl = url;
    el.videoLoader.style.display = 'flex';
    
    // Destroy previous HLS instance
    if (state.hlsPlayer) {
      state.hlsPlayer.destroy();
      state.hlsPlayer = null;
    }
    
    // Active highlight in list
    el.streamsList.querySelectorAll('.stream-btn').forEach(btn => {
      const idx = btn.getAttribute('data-idx');
      if (idx !== null) {
        const streamObj = state.currentVideo.available_streams?.[idx];
        if (streamObj && streamObj.url === url) {
          btn.classList.add('active');
        }
      }
    });

    if (type === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxMaxBufferLength: 30,
          enableWorker: true
        });
        state.hlsPlayer = hls;
        hls.loadSource(url);
        hls.attachMedia(el.mainVideo);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          el.videoLoader.style.display = 'none';
          if (state.settings.autoplay !== false) {
            el.mainVideo.play().catch(e => console.log("Bloqueio de autoplay:", e));
          }
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error("HLS fatal network error, trying to recover...", data);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error("HLS fatal media error, trying to recover...", data);
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS fatal unrecoverable error:", data);
                destroyHlsAndShowFallback(url);
                break;
            }
          }
        });
      } else if (el.mainVideo.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari / iOS)
        el.mainVideo.src = url;
        el.mainVideo.addEventListener('loadedmetadata', () => {
          el.videoLoader.style.display = 'none';
          if (state.settings.autoplay !== false) el.mainVideo.play();
        });
      } else {
        // Fallback
        destroyHlsAndShowFallback(url);
      }
    } else {
      // Normal direct MP4 source
      el.mainVideo.src = url;
      el.mainVideo.load();
      el.mainVideo.addEventListener('loadeddata', () => {
        el.videoLoader.style.display = 'none';
        if (state.settings.autoplay !== false) {
          el.mainVideo.play().catch(e => console.log("Autoplay blocked:", e));
        }
      });
    }
  }

  function destroyHlsAndShowFallback(url) {
    if (state.hlsPlayer) {
      state.hlsPlayer.destroy();
      state.hlsPlayer = null;
    }
    el.mainVideo.src = url;
    el.videoLoader.style.display = 'none';
    showToast("Usando fallback de reproducao nativa.", "warning");
  }

  function closeVideoPlayer() {
    el.mainVideo.pause();
    el.mainVideo.src = '';
    
    if (state.hlsPlayer) {
      state.hlsPlayer.destroy();
      state.hlsPlayer = null;
    }
    
    el.playerModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  async function fetchIaFiles(videoId) {
    try {
      const res = await fetch(`${API_BASE}/video/${videoId}/ia_files`);
      if (!res.ok) return;
      const data = await res.json();
      
      const files = data.files || [];
      const mp4Files = files.filter(f => f.name && f.name.endsWith('.mp4'));
      
      if (mp4Files.length > 0) {
        el.iaFilesWidget.style.display = 'block';
        el.iaFilesList.innerHTML = mp4Files.map(f => `
          <div class="ia-file-item" data-url="${f.url}">
            <span class="ia-file-name">${f.name}</span>
            <span class="ia-file-size">${formatBytes(f.size || 0)}</span>
          </div>
        `).join('');
        
        el.iaFilesList.querySelectorAll('.ia-file-item').forEach(item => {
          item.addEventListener('click', () => {
            playStreamUrl(item.getAttribute('data-url'), 'mp4');
          });
        });
      }
    } catch (e) {
      console.warn("Erro ao buscar arquivos IA:", e);
    }
  }

  function renderImdbTimestamps(video) {
    if (!video.imdb || !video.imdb.timestamps || video.imdb.timestamps.length === 0) {
      return;
    }
    
    el.imdbTimestampsWidget.style.display = 'block';
    el.imdbTimestampsList.innerHTML = video.imdb.timestamps.map((t, idx) => `
      <div class="timestamp-item" data-time="${t.time}">
        <span class="timestamp-num">#${idx + 1}</span>
        <div class="timestamp-info">
          <span class="timestamp-title">${t.title || 'Filme'}</span>
          <span class="timestamp-time">${formatDuration(t.time)}</span>
        </div>
      </div>
    `).join('');
    
    el.imdbTimestampsList.querySelectorAll('.timestamp-item').forEach(item => {
      item.addEventListener('click', () => {
        const time = parseInt(item.getAttribute('data-time'));
        el.mainVideo.currentTime = time;
        el.mainVideo.play();
      });
    });
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ========================================================================
  // 9. FAVORITES & HISTORY MANAGEMENT
  // ========================================================================
  function addToHistory(video) {
    // Remove if exists to push to top
    state.history = state.history.filter(v => v.id !== video.id);
    state.history.unshift(video);
    
    // Keep max 100 items
    if (state.history.length > 100) {
      state.history = state.history.slice(0, 100);
    }
    
    localStorage.setItem('skvods_history', JSON.stringify(state.history));
  }

  function toggleFavorite(video) {
    const idx = state.favorites.findIndex(v => v.id === video.id);
    if (idx >= 0) {
      state.favorites.splice(idx, 1);
      showToast("Removido dos favoritos", "info");
    } else {
      state.favorites.unshift(video);
      showToast("Adicionado aos favoritos!", "success");
    }
    localStorage.setItem('skvods_favorites', JSON.stringify(state.favorites));
    updateFavoriteButtonUI(video.id);
  }

  function updateFavoriteButtonUI(videoId) {
    const isFav = state.favorites.some(v => v.id === videoId);
    if (isFav) {
      el.videoFavoriteBtn.innerHTML = '<i data-lucide="star"></i> Favoritado';
      el.videoFavoriteBtn.classList.add('active');
    } else {
      el.videoFavoriteBtn.innerHTML = '<i data-lucide="star"></i> Favoritar';
      el.videoFavoriteBtn.classList.remove('active');
    }
    lucide.createIcons();
  }

  function clearHistory() {
    state.history = [];
    localStorage.removeItem('skvods_history');
    showToast("Historico limpo!", "success");
    if (state.activePage === 'history') {
      renderLocalVideosGrid([]);
    }
  }

  function saveSettings() {
    state.settings.defaultQuality = el.settingsDefaultQuality.value;
    state.settings.autoplay = el.settingsAutoplay.checked;
    localStorage.setItem('skvods_settings', JSON.stringify(state.settings));
    showToast("Configuracoes salvas!", "success");
    el.settingsModal.classList.remove('open');
  }

  // ========================================================================
  // 10. EVENT LISTENERS
  // ========================================================================
  
  // Sidebar toggle
  el.menuToggleBtn.addEventListener('click', () => {
    el.appSidebar.classList.add('open');
    el.drawerOverlay.classList.add('open');
  });
  
  el.closeSidebarBtn.addEventListener('click', () => {
    el.appSidebar.classList.remove('open');
    el.drawerOverlay.classList.remove('open');
  });
  
  el.drawerOverlay.addEventListener('click', () => {
    el.appSidebar.classList.remove('open');
    el.filterDrawer.classList.remove('open');
    el.drawerOverlay.classList.remove('open');
  });

  // Nav links
  el.sidebarNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      if (page) {
        navigateToPage(page);
        el.appSidebar.classList.remove('open');
        el.drawerOverlay.classList.remove('open');
      }
    });
  });

  // Search
  let searchTimeout;
  el.searchInput.addEventListener('input', () => {
    const query = el.searchInput.value.trim();
    el.clearSearchBtn.style.display = query ? 'flex' : 'none';
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = query;
      if (query) {
        navigateToPage('home');
        el.pageTitle.textContent = 'Busca';
        el.pageSubtitle.textContent = `Resultados para "${query}"`;
        el.gridTitle.textContent = 'Resultados';
      }
      fetchVideos();
    }, 500);
  });

  el.clearSearchBtn.addEventListener('click', () => {
    el.searchInput.value = '';
    state.searchQuery = '';
    el.clearSearchBtn.style.display = 'none';
    fetchVideos();
  });

  // Filters
  el.filterToggleBtn.addEventListener('click', () => {
    el.filterDrawer.classList.add('open');
    el.drawerOverlay.classList.add('open');
  });

  el.closeFiltersBtn.addEventListener('click', () => {
    el.filterDrawer.classList.remove('open');
    el.drawerOverlay.classList.remove('open');
  });

  el.applyFiltersBtn.addEventListener('click', () => {
    // Get selected streamer
    const activeStreamerChip = el.filterStreamers.querySelector('.filter-chip.active');
    if (activeStreamerChip) {
      state.selectedUser = activeStreamerChip.getAttribute('data-user-id');
    }
    
    // Get selected type
    const activeTypeChip = document.querySelector('.filter-chip[data-type].active');
    if (activeTypeChip) {
      const type = activeTypeChip.getAttribute('data-type');
      state.selectedTag = type === 'all' ? null : type;
    }
    
    // Get sort
    state.selectedSort = el.filterSort.value;
    
    navigateToPage('home');
    el.filterDrawer.classList.remove('open');
    el.drawerOverlay.classList.remove('open');
    fetchVideos();
  });

  el.clearFiltersBtn.addEventListener('click', () => {
    el.filterStreamers.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.filterChips.forEach(c => c.classList.remove('active'));
    el.filterChips[0].classList.add('active'); // Select "Todos"
    el.filterSort.value = 'recent';
    
    state.selectedUser = null;
    state.selectedTag = null;
    state.selectedSort = 'recent';
    
    navigateToPage('home');
    el.filterDrawer.classList.remove('open');
    el.drawerOverlay.classList.remove('open');
    fetchVideos();
  });

  // Filter chips (type)
  el.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      el.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Theme toggle
  el.themeToggleBtn.addEventListener('click', () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  });

  // Pagination
  el.prevPageBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      fetchVideos();
    }
  });

  el.nextPageBtn.addEventListener('click', () => {
    if (state.currentPage < state.totalPages) {
      state.currentPage++;
      fetchVideos();
    }
  });

  // Player modal
  el.closePlayerBtn.addEventListener('click', closeVideoPlayer);

  // Close player on backdrop click (but not content)
  el.playerModal.addEventListener('click', (e) => {
    if (e.target === el.playerModal) {
      closeVideoPlayer();
    }
  });

  // Favorite button
  el.videoFavoriteBtn.addEventListener('click', () => {
    if (state.currentVideo) {
      toggleFavorite(state.currentVideo);
    }
  });

  // Share button
  el.videoShareBtn.addEventListener('click', async () => {
    if (state.currentVideo) {
      const shareData = {
        title: state.currentVideo.title,
        text: `Assista "${state.currentVideo.title}" no SKVods Proxy`,
        url: window.location.href
      };
      
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // Fallback to clipboard
          const text = `${shareData.title} - ${shareData.url}`;
          await navigator.clipboard.writeText(text);
          showToast("Link copiado para a area de transferencia!", "success");
        }
      } catch (e) {
        console.log("Share cancelled or failed", e);
      }
    }
  });

  // Settings modal
  function openSettings() {
    el.settingsModal.classList.add('open');
  }

  function closeSettings() {
    el.settingsModal.classList.remove('open');
  }

  el.sidebarSettingsBtn.addEventListener('click', openSettings);
  el.headerSettingsBtn.addEventListener('click', openSettings);
  el.closeSettingsBtn.addEventListener('click', closeSettings);
  el.saveSettingsBtn.addEventListener('click', saveSettings);
  el.clearHistoryBtn.addEventListener('click', clearHistory);

  // Close settings on backdrop click
  el.settingsModal.addEventListener('click', (e) => {
    if (e.target === el.settingsModal) {
      closeSettings();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (el.playerModal.classList.contains('open')) {
        closeVideoPlayer();
      }
      if (el.settingsModal.classList.contains('open')) {
        closeSettings();
      }
    }
  });

  // ========================================================================
  // 11. MOBILE TOUCH GESTURES
  // ========================================================================
  let touchStartX = 0;
  let touchEndX = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 80;
    const diff = touchEndX - touchStartX;
    
    // Swipe right to open sidebar (from left edge)
    if (diff > swipeThreshold && touchStartX < 30) {
      el.appSidebar.classList.add('open');
      el.drawerOverlay.classList.add('open');
    }
    
    // Swipe left to close sidebar
    if (diff < -swipeThreshold && el.appSidebar.classList.contains('open')) {
      el.appSidebar.classList.remove('open');
      el.drawerOverlay.classList.remove('open');
    }
  }

  // Prevent zoom on double-tap for mobile
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  console.log("SKVods Proxy Android App iniciado com sucesso!");
});