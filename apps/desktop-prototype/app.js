const storageKey = "leaves.prototype.trips.v2";

const modeColors = {
  flight: "#2f80ed",
  rail: "#0f8b6f",
  road: "#c56b2c"
};

// 瓦片源列表：主源失败（连续 tileerror）时自动切换到下一个
const tileSources = [
  {
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  },
  {
    label: "高德地图",
    url: "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    options: {
      maxZoom: 18,
      subdomains: ["1", "2", "3", "4"],
      attribution: "&copy; 高德地图"
    }
  }
];

const places = {
  "北京": { lat: 39.9042, lng: 116.4074 },
  "北京首都": { lat: 40.0801, lng: 116.5846 },
  "上海": { lat: 31.2304, lng: 121.4737 },
  "上海虹桥": { lat: 31.1968, lng: 121.3260 },
  "上海浦东": { lat: 31.1443, lng: 121.8083 },
  "杭州": { lat: 30.2741, lng: 120.1551 },
  "杭州东": { lat: 30.2891, lng: 120.2120 },
  "广州": { lat: 23.1291, lng: 113.2644 },
  "广州南": { lat: 22.9892, lng: 113.2695 },
  "深圳": { lat: 22.5431, lng: 114.0579 },
  "深圳北": { lat: 22.6090, lng: 114.0294 },
  "成都": { lat: 30.5728, lng: 104.0668 },
  "西安": { lat: 34.3416, lng: 108.9398 },
  "南京": { lat: 32.0603, lng: 118.7969 },
  "武汉": { lat: 30.5928, lng: 114.3055 },
  "重庆": { lat: 29.5630, lng: 106.5516 },
  "嘉兴": { lat: 30.7461, lng: 120.7555 },
  "虎门": { lat: 22.8266, lng: 113.6730 }
};

const knownRoutes = {
  "rail:上海:杭州": ["上海虹桥", "嘉兴", "杭州东"],
  "rail:杭州:上海": ["杭州东", "嘉兴", "上海虹桥"],
  "road:杭州:上海": ["杭州", "嘉兴", "上海"],
  "road:上海:杭州": ["上海", "嘉兴", "杭州"],
  "rail:广州:深圳": ["广州南", "虎门", "深圳北"],
  "rail:深圳:广州": ["深圳北", "虎门", "广州南"],
  "flight:北京:上海": ["北京首都", "上海虹桥"],
  "flight:上海:北京": ["上海虹桥", "北京首都"]
};

const seedTrips = [
  {
    id: "seed-flight-1",
    mode: "flight",
    title: "CA1234",
    operator: "中国国际航空",
    origin: "北京",
    destination: "上海",
    date: "2026-06-19",
    departureTime: "08:20",
    arrivalTime: "10:35",
    distanceKm: 1088,
    status: "completed",
    notes: "示例航班行程。地图上用弧线表达大圆航路，正式版本可替换为真实 ADS-B/航班轨迹。"
  },
  {
    id: "seed-rail-1",
    mode: "rail",
    title: "G1234",
    operator: "中国铁路",
    origin: "上海",
    destination: "杭州",
    date: "2026-06-20",
    departureTime: "13:10",
    arrivalTime: "14:05",
    distanceKm: 169,
    status: "completed",
    notes: "示例高铁行程。地图上使用上海虹桥、嘉兴、杭州东生成近似铁路轨迹。"
  },
  {
    id: "seed-road-1",
    mode: "road",
    title: "打车",
    operator: "手动记录",
    origin: "杭州",
    destination: "上海",
    date: "2026-06-21",
    departureTime: "18:30",
    arrivalTime: "21:10",
    distanceKm: 176,
    status: "completed",
    notes: "示例道路行程。正式版本可接入 routing provider 获取道路级轨迹。"
  }
];

let trips = loadTripsFromLocal();
let activeFilter = "all";
let selectedTripId = trips[0]?.id;
let editingTripId = null;
let map;
let tileLayer;
let baseGeoJsonLayer;
let tilesWorking = false;
let tileErrorCount = 0;
let currentTileIndex = 0;
let routeLayer;
let markerLayer;
let routeByTripId = new Map();
let markerByTripId = new Map();

const form = document.querySelector("#quickAddForm");
const input = document.querySelector("#tripInput");
const dateInput = document.querySelector("#tripDate");
const tripStrip = document.querySelector("#tripStrip");
const heroOverlay = document.querySelector("#heroOverlay");
const statsLine = document.querySelector("#statsLine");
const mapFallback = document.querySelector("#mapFallback");
const tileSourceLabel = document.querySelector("#tileSourceLabel");
const exportButtons = document.querySelectorAll(".export-json");
const importButtons = document.querySelectorAll(".import-json");
const importFile = document.querySelector("#importFile");

// 登记日期：只能选择今天及以后（12306 预售期限制），使用本地日期避免 UTC 时区偏差
function localToday() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

dateInput.value = localToday();
dateInput.min = localToday();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const rawText = input.value.trim();
  if (!rawText) return;

  const draft = createTripDraft(rawText, dateInput.value);
  trips = [draft, ...trips];
  selectedTripId = draft.id;
  persistTrips();
  input.value = "";
  render();
  handleRailStationSelection(draft.id);
});

exportButtons.forEach((button) => button.addEventListener("click", () => {
  exportTrips();
}));

importButtons.forEach((button) => button.addEventListener("click", () => {
  importFile.click();
}));

importFile.addEventListener("change", () => {
  importTrips(importFile.files[0]);
  importFile.value = "";
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    render();
  });
});

initMap();
render();
syncTripsFromServer();

// Leaflet 本地 vendor 同步加载；若失败（如文件缺失），降级到 CDN 并继续轮询
function initMap(attempt = 0) {
  if (window.L) {
    setupMap();
    return;
  }

  if (attempt === 4) {
    loadLeafletFromCdn();
  }

  if (attempt < 30) {
    setTimeout(() => initMap(attempt + 1), 500);
    return;
  }

  mapFallback.hidden = false;
  mapFallback.querySelector("span").textContent =
    "Leaflet 本地资源加载失败，请强制刷新页面（Ctrl+F5）或确认 vendor/leaflet/ 目录完整。";
}

function loadLeafletFromCdn() {
  const cdnSources = [
    { css: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css", js: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js" },
    { css: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css", js: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" },
    { css: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", js: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" },
    { css: "https://cdn.bootcdn.net/ajax/libs/leaflet/1.9.4/leaflet.css", js: "https://cdn.bootcdn.net/ajax/libs/leaflet/1.9.4/leaflet.js" }
  ];

  function loadCss(href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function tryLoad(index) {
    if (index >= cdnSources.length || window.L) return;
    const script = document.createElement("script");
    script.src = cdnSources[index].js;
    script.onload = () => loadCss(cdnSources[index].css);
    script.onerror = () => tryLoad(index + 1);
    document.head.appendChild(script);
  }

  tryLoad(0);
}

function setupMap() {
  map = L.map("leafletMap", {
    zoomControl: true,
    attributionControl: true
  }).setView([31.5, 120.8], 6);

  // 本地矢量底图放在瓦片层之下：在线瓦片可用时会被覆盖，离线时成为底图
  const basePane = map.createPane("offlineBase");
  basePane.style.zIndex = 150;

  loadChinaBaseGeoJson();

  // 调试入口：URL 带 #offline 时模拟完全离线，验证本地矢量底图
  if (location.hash.includes("offline")) {
    tileSourceLabel.textContent = "底图：离线矢量底图（本地内置·模拟）";
  } else {
    applyTileLayer(0);
  }

  routeLayer = L.layerGroup().addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  // 地图就绪后补上首次 render 时错过的路线绘制
  render();
  setTimeout(() => map.invalidateSize(), 0);
}

// 优先用 script 注入的全局数据（兼容 file:// 双击打开），其次 fetch 本地 geojson
function loadChinaBaseGeoJson() {
  const addLayer = (geojson) => {
    if (!geojson || !map) return;
    baseGeoJsonLayer = L.geoJSON(geojson, {
      pane: "offlineBase",
      style: () => offlineBaseStyle()
    }).addTo(map);
    // 若加入时在线瓦片已确认可用，切换为浅色描边样式
    refreshBaseLayerStyle();
  };

  if (window.LEAVES_CHINA_GEOJSON) {
    addLayer(window.LEAVES_CHINA_GEOJSON);
    return;
  }

  fetch("./vendor/china-provinces.geojson")
    .then((response) => {
      if (!response.ok) throw new Error("geojson missing");
      return response.json();
    })
    .then(addLayer)
    .catch(() => {});
}

function offlineBaseStyle() {
  return tilesWorking
    ? { color: "#b6aa93", weight: 0.5, fill: false, opacity: 0.5 }
    : { color: "#93a7a2", weight: 1, fillColor: "#e9e4d3", fillOpacity: 0.85 };
}

function refreshBaseLayerStyle() {
  if (baseGeoJsonLayer) {
    baseGeoJsonLayer.setStyle(offlineBaseStyle());
  }
}

function applyTileLayer(index) {
  if (!map || index >= tileSources.length) return;

  if (tileLayer) {
    tileLayer.remove();
  }

  const source = tileSources[index];
  currentTileIndex = index;
  tileErrorCount = 0;

  tileLayer = L.tileLayer(source.url, source.options).addTo(map);

  tileLayer.on("tileload", () => {
    tileErrorCount = 0;
    if (!tilesWorking) {
      tilesWorking = true;
      refreshBaseLayerStyle();
    }
  });

  tileLayer.on("tileerror", () => {
    tileErrorCount += 1;
    if (tileErrorCount >= 6 && currentTileIndex < tileSources.length - 1) {
      applyTileLayer(currentTileIndex + 1);
    } else if (tileErrorCount >= 12 && tilesWorking === false) {
      // 所有在线瓦片源不可用：显示本地矢量底图，保留路线与点位
      tileSourceLabel.textContent = "底图：离线矢量底图（本地内置）";
    }
  });

  tileSourceLabel.textContent = `底图：${source.label}`;
}

function loadTripsFromLocal() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return seedTrips;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : seedTrips;
  } catch {
    return seedTrips;
  }
}

/** 启动时用服务器文件数据校准（本地文件是最终权威，浏览器清缓存/换环境也不丢数据）。 */
function syncTripsFromServer() {
  fetch("/api/data/trips")
    .then((resp) => (resp.ok ? resp.json() : null))
    .then((serverTrips) => {
      if (!Array.isArray(serverTrips) || !serverTrips.length) return;
      trips = serverTrips;
      selectedTripId = trips[0]?.id;
      editingTripId = null;
      persistTrips();
      render();
    })
    .catch(() => {});
}

function persistTrips() {
  localStorage.setItem(storageKey, JSON.stringify(trips));
  persistTripsToServer();
}

/** 行程写入本地文件（fire-and-forget，离线/file:// 打开时静默失败）。 */
function persistTripsToServer() {
  try {
    fetch("/api/data/trips", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trips)
    }).catch(() => {});
  } catch (e) {
    /* 静默 */
  }
}

function createTripDraft(rawText, date) {
  const mode = detectMode(rawText);
  const route = inferRoute(rawText, mode);
  const serviceNumber = extractServiceNumber(rawText, mode);

  return {
    id: `trip-${Date.now()}`,
    mode,
    title: serviceNumber || rawText,
    operator: mode === "flight" ? "待补全航司" : mode === "rail" ? "中国铁路" : "手动记录",
    origin: route.origin,
    destination: route.destination,
    routeUserProvided: route.userProvided,
    date,
    departureTime: "待确认",
    arrivalTime: "待确认",
    distanceKm: estimateDistance(route.origin, route.destination),
    status: "draft",
    notes: `由输入 "${rawText}" 生成，等待用户确认和数据源补全。`
  };
}

function detectMode(text) {
  const normalized = text.trim().toUpperCase();
  // 前缀匹配：支持 "CA1234 北京到上海"、"G7254 合肥南到上海" 这类带区间的车次输入
  if (/^[A-Z]{2}\d{3,4}/.test(normalized)) return "flight";
  if (/^[GDCZTK]\d{1,5}/.test(normalized)) return "rail";
  if (text.includes("打车") || text.includes("自驾") || text.includes("到") || text.includes("->")) return "road";
  return "road";
}

function extractServiceNumber(text, mode) {
  const normalized = text.trim().toUpperCase();
  if (mode === "flight") return normalized.match(/[A-Z]{2}\d{3,4}/)?.[0];
  if (mode === "rail") return normalized.match(/[GDCZTK]\d{1,5}/)?.[0];
  return "";
}

function inferRoute(text, mode) {
  const routeMatch = text.match(/(.+?)(?:到|->|至)(.+)/);
  if (routeMatch) {
    return {
      origin: normalizePlace(cleanPlace(routeMatch[1])),
      destination: normalizePlace(cleanPlace(routeMatch[2])),
      userProvided: true
    };
  }

  // 未提供区间：标记 userProvided=false，铁路登记时引导用户补充区间，不默认匹配
  if (mode === "flight") return { origin: "北京", destination: "上海", userProvided: false };
  if (mode === "rail") return { origin: "待确认", destination: "待确认", userProvided: false };
  return { origin: "杭州", destination: "上海", userProvided: false };
}

function cleanPlace(value) {
  return value
    .replace(/打车|自驾|公交|大巴/g, "")
    .replace(/^[A-Z]{1,3}\d{1,5}/, "") // 去掉残留在起点里的车次号（如 "G7254 合肥南" → "合肥南"）
    .trim() || "待确认";
}

function normalizePlace(value) {
  if (places[value]) return value;
  if (value.includes("北京")) return "北京";
  if (value.includes("上海")) return "上海";
  if (value.includes("杭州")) return "杭州";
  if (value.includes("广州")) return "广州";
  if (value.includes("深圳")) return "深圳";
  if (value.includes("成都")) return "成都";
  if (value.includes("西安")) return "西安";
  if (value.includes("南京")) return "南京";
  if (value.includes("武汉")) return "武汉";
  if (value.includes("重庆")) return "重庆";
  return value;
}

function estimateDistance(origin, destination) {
  const from = places[origin];
  const to = places[destination];
  if (!from || !to) return 0;
  return Math.round(haversineKm(from, to));
}

function haversineKm(from, to) {
  const radius = 6371;
  const dLat = degreesToRadians(to.lat - from.lat);
  const dLng = degreesToRadians(to.lng - from.lng);
  const lat1 = degreesToRadians(from.lat);
  const lat2 = degreesToRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function render() {
  const visibleTrips = getVisibleTrips();
  if (!visibleTrips.some((trip) => trip.id === selectedTripId)) {
    selectedTripId = visibleTrips[0]?.id || trips[0]?.id;
  }

  renderTripStrip(visibleTrips);
  renderMap(visibleTrips);
  renderHero();
  renderStats();
}

function getVisibleTrips() {
  return trips.filter((trip) => activeFilter === "all" || trip.mode === activeFilter);
}

function renderTripStrip(visibleTrips) {
  tripStrip.innerHTML = "";

  if (!visibleTrips.length) {
    const empty = document.createElement("p");
    empty.className = "trip-meta";
    empty.textContent = "暂无行程，先在上方登记一条吧。";
    tripStrip.appendChild(empty);
    return;
  }

  visibleTrips.forEach((trip) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `trip-card ${trip.mode}${trip.id === selectedTripId ? " active" : ""}`;
    card.dataset.tripId = trip.id;
    card.setAttribute("aria-pressed", String(trip.id === selectedTripId));
    card.innerHTML = `
      <div class="trip-title">
        <span>${escapeHtml(trip.title)}</span>
        <span class="mode-label">${modeLabel(trip.mode)}</span>
      </div>
      <div class="trip-meta">
        <span class="route">${escapeHtml(trip.origin)} → ${escapeHtml(trip.destination)}</span>
        <span>${escapeHtml(trip.date)} · ${trip.distanceKm || 0} km</span>
      </div>
    `;
    card.addEventListener("click", () => {
      selectTrip(trip.id, { focusMap: true });
    });
    tripStrip.appendChild(card);
  });

  tripStrip.querySelector(".trip-card.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function renderMap(visibleTrips) {
  if (!map) return;

  routeLayer.clearLayers();
  markerLayer.clearLayers();
  routeByTripId = new Map();
  markerByTripId = new Map();

  visibleTrips.forEach((trip) => {
    const points = getRoutePoints(trip);
    if (points.length < 2) return;

    const isActive = trip.id === selectedTripId;
    const route = L.polyline(points, {
      color: modeColors[trip.mode] || "#536268",
      weight: isActive ? 7 : 5,
      opacity: isActive ? 0.95 : 0.72,
      dashArray: trip.mode === "flight" ? "10 12" : undefined,
      className: `map-route route-${trip.mode}${isActive ? " selected" : ""}`
    }).addTo(routeLayer);

    route.bindTooltip(`${trip.title} ${trip.origin} -> ${trip.destination}`, {
      sticky: true
    });
    route.on("click", () => selectTrip(trip.id, { focusMap: true }));
    routeByTripId.set(trip.id, route);

    const endpointMarkers = [points[0], points[points.length - 1]].map((point, index) => {
      const label = index === 0 ? trip.origin : trip.destination;
      const marker = L.circleMarker(point, {
        radius: isActive ? 8 : 6,
        color: "#ffffff",
        weight: 3,
        fillColor: isActive ? "#b44335" : modeColors[trip.mode] || "#263237",
        fillOpacity: 1,
        className: "trip-marker"
      }).addTo(markerLayer);

      marker.bindTooltip(label, { permanent: isActive, direction: "top", offset: [0, -8] });
      marker.on("click", () => selectTrip(trip.id, { focusMap: true }));
      return marker;
    });
    markerByTripId.set(trip.id, endpointMarkers);
  });

  const selectedRoute = routeByTripId.get(selectedTripId);
  if (selectedRoute) {
    selectedRoute.bringToFront();
    fitMapToTrip(selectedTripId);
  } else {
    fitMapToVisibleTrips();
  }
}

function getRoutePoints(trip) {
  const routeKey = `${trip.mode}:${trip.origin}:${trip.destination}`;
  const routeNames = knownRoutes[routeKey];

  if (routeNames) {
    return routeNames.map((name) => places[name]).filter(Boolean);
  }

  const from = places[trip.origin];
  const to = places[trip.destination];
  if (!from || !to) return [];

  if (trip.mode === "flight") return createFlightArc(from, to);
  if (trip.mode === "rail") return createBentGroundRoute(from, to, 0.18);
  return createBentGroundRoute(from, to, -0.12);
}

function createFlightArc(from, to) {
  const points = [];
  const latDiff = to.lat - from.lat;
  const lngDiff = to.lng - from.lng;
  const lift = Math.min(4.5, Math.max(1.2, Math.abs(lngDiff) * 0.22));

  for (let step = 0; step <= 32; step += 1) {
    const t = step / 32;
    const curve = Math.sin(Math.PI * t) * lift;
    points.push({
      lat: from.lat + latDiff * t + curve,
      lng: from.lng + lngDiff * t
    });
  }

  return points;
}

function createBentGroundRoute(from, to, offset) {
  const mid = {
    lat: (from.lat + to.lat) / 2 + offset,
    lng: (from.lng + to.lng) / 2 - offset
  };
  return [from, mid, to];
}

function fitMapToTrip(tripId) {
  if (!map) return;
  const route = routeByTripId.get(tripId);
  if (!route) return;
  map.fitBounds(route.getBounds(), {
    padding: [42, 42],
    maxZoom: 9
  });
}

function fitMapToVisibleTrips() {
  if (!map) return;
  const routes = [...routeByTripId.values()];
  if (!routes.length) return;

  const bounds = routes.reduce((currentBounds, route) => {
    return currentBounds.extend(route.getBounds());
  }, L.latLngBounds([]));

  map.fitBounds(bounds, {
    padding: [42, 42],
    maxZoom: 8
  });
}

function selectTrip(tripId, options = {}) {
  selectedTripId = tripId;
  renderTripStrip(getVisibleTrips());
  renderMap(getVisibleTrips());
  renderHero();

  if (options.focusMap) {
    fitMapToTrip(tripId);
  }
}

function renderHero() {
  const trip = trips.find((item) => item.id === selectedTripId);
  if (!trip) {
    heroOverlay.innerHTML = `<p class="hero-route">暂无行程</p>`;
    return;
  }

  if (editingTripId === trip.id) {
    renderEditForm(trip);
    return;
  }

  heroOverlay.innerHTML = `
    <div class="hero-topline">
      <span class="mode-badge ${trip.mode}"><i class="mode-dot"></i>${modeLabel(trip.mode)} · ${statusLabel(trip.status)}</span>
      <div class="hero-actions">
        ${trip.mode === "rail" && trip.origin !== "待确认" && trip.destination !== "待确认" ? `<button class="ghost-button small" data-action="tickets" type="button">实时余票</button>` : ""}
        <button class="ghost-button small" data-action="edit" type="button">编辑</button>
        <button class="danger-button small" data-action="delete" type="button">删除</button>
      </div>
    </div>
    <div>
      <p class="hero-route">${escapeHtml(trip.origin)}<span class="arrow">→</span>${escapeHtml(trip.destination)}</p>
      <div class="hero-meta">
        <span><strong>${escapeHtml(trip.title)}</strong></span>
        <span>${escapeHtml(trip.operator)}</span>
        <span>${escapeHtml(trip.date)}</span>
        <span>${escapeHtml(trip.departureTime)} - ${escapeHtml(trip.arrivalTime)}</span>
        <span>${trip.distanceKm || 0} km</span>
      </div>
    </div>
  `;

  heroOverlay.querySelector('[data-action="edit"]').addEventListener("click", () => {
    editingTripId = trip.id;
    renderHero();
  });

  heroOverlay.querySelector('[data-action="tickets"]')?.addEventListener("click", () => {
    showTicketPanel(trip);
  });

  heroOverlay.querySelector('[data-action="delete"]').addEventListener("click", () => {
    deleteTrip(trip.id);
  });
}

function renderEditForm(trip) {
  heroOverlay.innerHTML = `
    <form class="edit-form" id="editForm">
      <h3>编辑行程</h3>
      ${editField("editMode", "方式", modeSelectOptions(trip.mode))}
      ${editField("editTitle", "标题", `<input id="editTitle" value="${escapeHtml(trip.title)}" required>`)}
      ${editField("editOrigin", "起点", `<input id="editOrigin" value="${escapeHtml(trip.origin)}" required>`)}
      ${editField("editDestination", "终点", `<input id="editDestination" value="${escapeHtml(trip.destination)}" required>`)}
      ${editField("editDate", "日期", `<input id="editDate" type="date" value="${escapeHtml(trip.date)}" required>`)}
      ${editField("editDeparture", "出发", `<input id="editDeparture" value="${escapeHtml(trip.departureTime)}">`)}
      ${editField("editArrival", "到达", `<input id="editArrival" value="${escapeHtml(trip.arrivalTime)}">`)}
      ${editField("editOperator", "运营方", `<input id="editOperator" value="${escapeHtml(trip.operator)}">`)}
      ${editField("editDistance", "里程(km)", `<input id="editDistance" type="number" min="0" value="${trip.distanceKm || 0}">`)}
      ${editField("editStatus", "状态", statusSelectOptions(trip.status))}
      ${editField("editNotes", "备注", `<textarea id="editNotes" rows="3">${escapeHtml(trip.notes || "")}</textarea>`)}
      <div class="edit-actions">
        <button class="primary-button" type="submit">保存</button>
        <button class="ghost-button" data-action="cancel" type="button">取消</button>
      </div>
    </form>
  `;

  heroOverlay.querySelector("#editForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveTripEdit(trip.id);
  });

  heroOverlay.querySelector('[data-action="cancel"]').addEventListener("click", () => {
    editingTripId = null;
    renderHero();
  });

  // 铁路车次：异步查询经停站，成功后把起点/终点输入切换为经停站下拉列表
  upgradeEditStationsToSelect(trip);
}

/** 编辑表单增强：铁路车次查询到经停站后，起点/终点切换为下拉选择。 */
async function upgradeEditStationsToSelect(trip) {
  if (trip.mode !== "rail" || !/^[GDCZTK]\d{1,5}$/i.test(trip.title)) return;
  const originInput = heroOverlay.querySelector("#editOrigin");
  const destInput = heroOverlay.querySelector("#editDestination");
  if (!originInput || !destInput) return;
  if (trip.origin === "待确认" || trip.destination === "待确认") return;

  try {
    const response = await fetch("/api/12306/train-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        train_no: trip.title,
        from_station: trip.origin,
        to_station: trip.destination,
        train_date: trip.date
      })
    });
    const result = await response.json();
    if (!result.success || !result.stations || result.stations.length < 2) return;

    const options = result.stations
      .map((s, index) => {
        const text = `${index + 1}. ${s.station_name}  ${s.arrive_time !== "----" ? `到 ${s.arrive_time}` : ""} ${s.start_time !== "----" ? `发 ${s.start_time}` : ""}`.trim();
        return `<option value="${escapeHtml(s.station_name)}">${escapeHtml(text)}</option>`;
      })
      .join("");

    const fromSelect = document.createElement("select");
    fromSelect.id = "editOrigin";
    fromSelect.innerHTML = options;
    const fromIndex = result.stations.findIndex((s) => s.station_name === trip.origin);
    fromSelect.value = fromIndex >= 0 ? result.stations[fromIndex].station_name : result.stations[0].station_name;
    originInput.replaceWith(fromSelect);

    const destSelect = document.createElement("select");
    destSelect.id = "editDestination";
    destSelect.innerHTML = options;
    const toIndex = result.stations.findIndex((s) => s.station_name === trip.destination);
    destSelect.value = toIndex >= 0 ? result.stations[toIndex].station_name : result.stations[result.stations.length - 1].station_name;
    destInput.replaceWith(destSelect);

    const successHint = document.createElement("p");
    successHint.className = "ticket-success";
    successHint.textContent = `已查询到 ${trip.title} 车次信息（${result.stations.length} 站），起点/终点已切换为经停站下拉选择。`;
    heroOverlay.querySelector("#editForm h3").after(successHint);
  } catch (e) {
    /* 查询失败保持文本输入 */
  }
}

function editField(id, label, controlHtml) {
  return `<label class="edit-field" for="${id}"><span>${escapeHtml(label)}</span>${controlHtml}</label>`;
}

function modeSelectOptions(currentMode) {
  return ["flight", "rail", "road"]
    .map((mode) => `<option value="${mode}"${mode === currentMode ? " selected" : ""}>${modeLabel(mode)}</option>`)
    .join("");
}

function statusSelectOptions(currentStatus) {
  return ["draft", "planned", "completed", "cancelled"]
    .map((status) => `<option value="${status}"${status === currentStatus ? " selected" : ""}>${statusLabel(status)}</option>`)
    .join("");
}

function saveTripEdit(tripId) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) return;

  // 起点/终点控件可能是文本输入（普通行程）或经停站下拉（铁路已查询到车次），取值方式一致
  const originEl = heroOverlay.querySelector("#editOrigin");
  const destEl = heroOverlay.querySelector("#editDestination");

  trip.mode = heroOverlay.querySelector("#editMode").value;
  trip.title = heroOverlay.querySelector("#editTitle").value.trim() || trip.title;
  trip.origin = originEl.tagName === "SELECT" ? originEl.value : normalizePlace(originEl.value.trim()) || trip.origin;
  trip.destination = destEl.tagName === "SELECT" ? destEl.value : normalizePlace(destEl.value.trim()) || trip.destination;
  trip.date = heroOverlay.querySelector("#editDate").value || trip.date;
  trip.departureTime = heroOverlay.querySelector("#editDeparture").value.trim() || "待确认";
  trip.arrivalTime = heroOverlay.querySelector("#editArrival").value.trim() || "待确认";
  trip.operator = heroOverlay.querySelector("#editOperator").value.trim() || trip.operator;
  trip.distanceKm = Number(heroOverlay.querySelector("#editDistance").value) || estimateDistance(trip.origin, trip.destination);
  trip.status = heroOverlay.querySelector("#editStatus").value;
  trip.notes = heroOverlay.querySelector("#editNotes").value.trim();

  editingTripId = null;
  persistTrips();
  render();
}

// ---------- 12306 集成：车次经停站选择与自动补全 ----------

// 车次区间记忆：记住每个车次成功确认过的起讫区间，下次登记直接自动查询
const routeMemoryKey = "leaves.prototype.routes";

function getRouteMemory() {
  try {
    return JSON.parse(localStorage.getItem(routeMemoryKey)) || {};
  } catch {
    return {};
  }
}

function rememberRoute(trainCode, from, to) {
  const memory = getRouteMemory();
  memory[trainCode] = `${from}|${to}`;
  try {
    localStorage.setItem(routeMemoryKey, JSON.stringify(memory));
  } catch (e) {
    /* 静默 */
  }
}

function getRememberedRoute(trainCode) {
  const value = getRouteMemory()[trainCode];
  if (!value) return null;
  const parts = value.split("|");
  return parts.length === 2 ? parts : null;
}

/** 登记铁路车次后：优先自动查询经停站（有记忆区间/输入区间），否则车站联想引导。 */
async function handleRailStationSelection(tripId) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip || trip.mode !== "rail") return;
  if (!/^[GDCZTK]\d{1,5}$/i.test(trip.title)) return;

  // 纯车次号：尝试用历史记忆区间自动定位车次，直达下拉列表体验
  if (!trip.routeUserProvided) {
    const remembered = getRememberedRoute(trip.title);
    if (remembered) {
      trip.origin = remembered[0];
      trip.destination = remembered[1];
      trip.routeUserProvided = true;
    }
  }

  await openStationSelector(tripId);
}

/** 在 Hero 卡片内查询车次全部经停站，并让用户选择上车站与到达站。 */
async function openStationSelector(tripId) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) return;

  // 首次打开时渲染面板框架；区间修正重试时仅刷新列表区
  if (!heroOverlay.querySelector(".station-panel")) {
    heroOverlay.innerHTML = `
      <div class="ticket-panel station-panel">
        <div class="ticket-panel-head">
          <div>
            <p class="ticket-title">${escapeHtml(trip.title)} 站点选择</p>
            <p class="ticket-sub">${escapeHtml(trip.date)} · 请选择上车站与到达站</p>
          </div>
          <button class="ghost-button small" data-action="skip" type="button">跳过</button>
        </div>
        <div class="station-list"></div>
      </div>
    `;

    heroOverlay.querySelector('[data-action="skip"]').addEventListener("click", () => {
      autoCompleteRailTrip(tripId);
    });
  }

  const listEl = heroOverlay.querySelector(".station-list");

  // 无有效区间：车站联想引导输入（不默认匹配）
  if (!trip.routeUserProvided || trip.origin === "待确认" || trip.destination === "待确认") {
    renderRouteInput(trip);
    return;
  }

  listEl.innerHTML = '<p class="ticket-loading">正在查询 12306 经停站…</p>';

  try {
    const response = await fetch("/api/12306/train-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        train_no: trip.title,
        from_station: trip.origin,
        to_station: trip.destination,
        train_date: trip.date
      })
    });
    const result = await response.json();

    if (!result.success || !result.stations || result.stations.length < 2) {
      renderRouteInput(trip, result.error || "无法获取经停站信息");
      return;
    }

    // 查询成功：记住该车次区间，下次登记直达下拉列表
    rememberRoute(trip.title, trip.origin, trip.destination);
    renderStationSelector(trip, result.stations);
  } catch (e) {
    renderRouteInput(trip, "网络不可用，无法查询 12306 经停站。");
  }
}

/** 起讫区间输入表单：车站联想下拉列表（输入即查，点击选择），查询失败时也复用此表单并提示错误。 */
function renderRouteInput(trip, errorMsg = "") {
  const listEl = heroOverlay.querySelector(".station-list");
  const prefillFrom = trip.origin && trip.origin !== "待确认" ? trip.origin : "";
  const prefillTo = trip.destination && trip.destination !== "待确认" ? trip.destination : "";
  listEl.innerHTML = `
    ${errorMsg ? `<p class="ticket-error">${escapeHtml(errorMsg)}</p>` : ""}
    <p class="ticket-sub">${escapeHtml(trip.title)} 需要起讫区间才能定位车次，请输入出发站与到达站（输入时下方出现车站下拉列表）：</p>
    <div class="station-pick">
      <div class="suggest-field">
        <label class="edit-field"><span>出发</span><input id="routeFrom" placeholder="如 合肥南" autocomplete="off" value="${escapeHtml(prefillFrom)}"></label>
        <div class="suggest-list" id="suggestFrom" hidden></div>
      </div>
      <div class="suggest-field">
        <label class="edit-field"><span>到达</span><input id="routeTo" placeholder="如 上海" autocomplete="off" value="${escapeHtml(prefillTo)}"></label>
        <div class="suggest-list" id="suggestTo" hidden></div>
      </div>
    </div>
    <div class="edit-actions">
      <button class="primary-button" data-action="go" type="button">查询经停站</button>
    </div>
  `;

  const goButton = listEl.querySelector('[data-action="go"]');
  const hintEl = listEl.querySelector(".ticket-sub");
  goButton.addEventListener("click", async () => {
    const from = listEl.querySelector("#routeFrom").value.trim();
    const to = listEl.querySelector("#routeTo").value.trim();
    if (!from || !to) {
      hintEl.textContent = "请填写出发站和到达站后重试";
      return;
    }
    trip.origin = normalizePlace(from);
    trip.destination = normalizePlace(to);
    trip.routeUserProvided = true;
    persistTrips();
    await openStationSelector(trip.id);
  });

  // 车站联想下拉：输入即查（防抖），点击选项填充
  const attachSuggest = (inputId, listId) => {
    const inputEl = listEl.querySelector(`#${inputId}`);
    const listEl2 = listEl.querySelector(`#${listId}`);
    let timer = null;

    const renderMatches = (stations) => {
      if (!stations.length) {
        listEl2.hidden = true;
        return;
      }
      listEl2.innerHTML = stations
        .map(
          (s) =>
            `<button class="suggest-item" type="button" data-name="${escapeHtml(s.name)}">` +
            `<span>${escapeHtml(s.name)}</span>` +
            `<span class="suggest-sub">${escapeHtml(s.code)} · ${escapeHtml(s.pinyin)}</span>` +
            `</button>`
        )
        .join("");
      listEl2.hidden = false;
      listEl2.querySelectorAll(".suggest-item").forEach((item) => {
        item.addEventListener("click", () => {
          inputEl.value = item.dataset.name;
          listEl2.hidden = true;
        });
      });
    };

    inputEl.addEventListener("input", () => {
      clearTimeout(timer);
      const query = inputEl.value.trim();
      if (query.length < 1) {
        listEl2.hidden = true;
        return;
      }
      timer = setTimeout(async () => {
        try {
          const resp = await fetch(`/api/12306/search-stations?query=${encodeURIComponent(query)}&limit=8`);
          const result = await resp.json();
          renderMatches(result.success ? result.stations : []);
        } catch (e) {
          listEl2.hidden = true;
        }
      }, 250);
    });

    inputEl.addEventListener("focus", () => {
      if (inputEl.value.trim()) inputEl.dispatchEvent(new Event("input"));
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        listEl2.hidden = true;
      }, 150);
    });
  };

  attachSuggest("routeFrom", "suggestFrom");
  attachSuggest("routeTo", "suggestTo");
}

/** 渲染经停站选择器：上车/到达下拉 + 区间预览 + 确认。 */
function renderStationSelector(trip, stations) {
  const listEl = heroOverlay.querySelector(".station-list");
  const optionText = (s, index) =>
    `${index + 1}. ${s.station_name}  ${s.arrive_time !== "----" ? `到 ${s.arrive_time}` : ""} ${s.start_time !== "----" ? `发 ${s.start_time}` : ""}`.trim();
  const options = stations
    .map((s, index) => `<option value="${index}">${escapeHtml(optionText(s, index))}</option>`)
    .join("");

  // 默认选中与用户输入区间匹配的站；不匹配时取首站与末站
  const fromIndex = stations.findIndex((s) => s.station_name === trip.origin);
  const toIndex = stations.findIndex((s) => s.station_name === trip.destination);
  const from = fromIndex >= 0 ? fromIndex : 0;
  const to = toIndex >= 0 ? toIndex : stations.length - 1;

  listEl.innerHTML = `
    <p class="ticket-success">已查询到 ${escapeHtml(trip.title)} 车次信息（共 ${stations.length} 个经停站），请选择上车站与到达站：</p>
    <div class="station-pick">
      <label class="edit-field"><span>上车</span>
        <select id="pickFrom">${options}</select>
      </label>
      <label class="edit-field"><span>到达</span>
        <select id="pickTo">${options}</select>
      </label>
    </div>
    <div class="station-preview"></div>
    <div class="edit-actions">
      <button class="primary-button" data-action="confirm" type="button">确认登记</button>
    </div>
  `;

  const pickFrom = listEl.querySelector("#pickFrom");
  const pickTo = listEl.querySelector("#pickTo");
  pickFrom.value = String(from);
  pickTo.value = String(to);

  const updatePreview = () => {
    const previewEl = listEl.querySelector(".station-preview");
    const f = stations[Number(pickFrom.value)];
    const t = stations[Number(pickTo.value)];
    if (Number(pickFrom.value) >= Number(pickTo.value)) {
      previewEl.innerHTML = '<p class="ticket-error">上车站必须早于到达站</p>';
      return;
    }
    previewEl.innerHTML =
      `<p class="station-route">${escapeHtml(f.station_name)} ${escapeHtml(f.start_time)} → ${escapeHtml(t.station_name)} ${escapeHtml(t.arrive_time)}</p>` +
      `<p class="ticket-sub">${escapeHtml(trip.title)} · ${escapeHtml(trip.date)}</p>`;
  };

  pickFrom.addEventListener("change", updatePreview);
  pickTo.addEventListener("change", updatePreview);
  updatePreview();

  listEl.querySelector('[data-action="confirm"]').addEventListener("click", () => {
    saveStationSelection(trip, stations);
  });
}

/** 用户确认上下车站后写入正式行程。 */
function saveStationSelection(trip, stations) {
  const fromIndex = Number(heroOverlay.querySelector("#pickFrom").value);
  const toIndex = Number(heroOverlay.querySelector("#pickTo").value);
  if (fromIndex >= toIndex) {
    heroOverlay.querySelector(".station-preview").innerHTML = '<p class="ticket-error">上车站必须早于到达站</p>';
    return;
  }

  const from = stations[fromIndex];
  const to = stations[toIndex];
  trip.origin = from.station_name;
  trip.destination = to.station_name;
  if (from.start_time !== "----") trip.departureTime = from.start_time;
  if (to.arrive_time !== "----") trip.arrivalTime = to.arrive_time;
  trip.status = "completed";
  trip.notes = `已通过 12306 确认区间：${from.station_name} → ${to.station_name}。`;
  rememberRoute(trip.title, trip.origin, trip.destination);
  editingTripId = null;
  persistTrips();
  render();
}

/** 登记铁路车次后，自动向本地 12306 代理查询真实发到时刻补全草稿（失败静默）。 */
async function autoCompleteRailTrip(tripId) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip || trip.mode !== "rail") return;
  if (!/^[GDCZTK]\d{1,5}$/i.test(trip.title)) return;
  if (trip.origin === "待确认" || trip.destination === "待确认") return;

  try {
    const response = await fetch("/api/12306/query-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_station: trip.origin,
        to_station: trip.destination,
        train_date: trip.date
      })
    });
    const result = await response.json();
    if (!result.success || !result.trains) return;

    const train = result.trains.find((t) => t.train_no.toUpperCase() === trip.title.toUpperCase());
    if (!train) return;

    let changed = false;
    if (train.start_time && train.start_time !== "----") {
      trip.departureTime = train.start_time;
      changed = true;
    }
    if (train.arrive_time && train.arrive_time !== "----") {
      trip.arrivalTime = train.arrive_time;
      changed = true;
    }
    if (changed) {
      trip.notes = `${trip.notes || ""} 已通过 12306 自动补全时刻（历时 ${train.duration}）。`.trim();
      persistTrips();
      render();
    }
  } catch (e) {
    // 离线或服务不可用时静默保留手工草稿
  }
}

/** 在 Hero 卡片内展示指定线路的实时余票列表。 */
async function showTicketPanel(trip) {
  heroOverlay.innerHTML = `
    <div class="ticket-panel">
      <div class="ticket-panel-head">
        <div>
          <p class="ticket-title">${escapeHtml(trip.origin)} → ${escapeHtml(trip.destination)}</p>
          <p class="ticket-sub">${escapeHtml(trip.date)} · 12306 实时余票</p>
        </div>
        <button class="ghost-button small" data-action="close" type="button">返回</button>
      </div>
      <p class="ticket-loading">正在查询 12306…</p>
      <div class="ticket-list"></div>
    </div>
  `;

  heroOverlay.querySelector('[data-action="close"]').addEventListener("click", () => {
    renderHero();
  });

  const loadingEl = heroOverlay.querySelector(".ticket-loading");
  const listEl = heroOverlay.querySelector(".ticket-list");

  try {
    const response = await fetch("/api/12306/query-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_station: trip.origin,
        to_station: trip.destination,
        train_date: trip.date
      })
    });
    const result = await response.json();
    loadingEl.hidden = true;

    if (!result.success || !result.trains || !result.trains.length) {
      listEl.innerHTML = `<p class="ticket-error">${escapeHtml(result.error || "未查询到余票信息")}</p>`;
      return;
    }

    const trains = result.trains.slice(0, 40);
    listEl.innerHTML = trains
      .map(
        (t) => `
        <div class="ticket-row ${t.train_no.toUpperCase() === trip.title.toUpperCase() ? " match" : ""}">
          <span class="ticket-code">${escapeHtml(t.train_no)}</span>
          <span class="ticket-times">${escapeHtml(t.start_time)} → ${escapeHtml(t.arrive_time)} · ${escapeHtml(t.duration)}</span>
          <span class="ticket-stations">${escapeHtml(t.from_station)} → ${escapeHtml(t.to_station)}</span>
          <span class="ticket-seats">${seatSummary(t.seats)}</span>
        </div>
      `
      )
      .join("");
  } catch (e) {
    loadingEl.hidden = true;
    listEl.innerHTML = '<p class="ticket-error">网络不可用，无法查询 12306 余票（离线模式）。</p>';
  }
}

function seatSummary(seats) {
  const entries = Object.entries(seats || {}).filter(([, value]) => value && value !== "无" && value !== "--");
  if (!entries.length) return "无票";
  return entries.slice(0, 3).map(([key, value]) => `${key} ${value}`).join(" · ");
}

function deleteTrip(tripId) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) return;
  if (!window.confirm(`确认删除行程「${trip.title} ${trip.origin} -> ${trip.destination}」？`)) return;

  trips = trips.filter((item) => item.id !== tripId);
  if (selectedTripId === tripId) {
    selectedTripId = getVisibleTrips()[0]?.id || trips[0]?.id;
  }
  editingTripId = null;
  persistTrips();
  render();
}

function exportTrips() {
  const payload = JSON.stringify({ app: "leaves", version: 1, exportedAt: new Date().toISOString(), trips }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leaves-trips-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importTrips(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const imported = Array.isArray(parsed) ? parsed : parsed.trips;
      if (!Array.isArray(imported) || !imported.every((trip) => trip && trip.id && trip.mode)) {
        throw new Error("invalid format");
      }
      if (!window.confirm(`导入 ${imported.length} 条行程，将覆盖当前本地数据，是否继续？`)) return;

      trips = imported;
      selectedTripId = trips[0]?.id;
      editingTripId = null;
      persistTrips();
      render();
    } catch {
      window.alert("导入失败：请选择 Leaves 导出的 JSON 文件。");
    }
  };
  reader.readAsText(file);
}

function renderStats() {
  const cities = new Set();
  trips.forEach((trip) => {
    if (trip.origin !== "待确认") cities.add(trip.origin);
    if (trip.destination !== "待确认") cities.add(trip.destination);
  });

  const totalKm = trips.reduce((sum, trip) => sum + (trip.distanceKm || 0), 0);
  const flightCount = trips.filter((trip) => trip.mode === "flight").length;
  const railCount = trips.filter((trip) => trip.mode === "rail").length;
  statsLine.innerHTML =
    `${trips.length} 条 · <strong>${totalKm} km</strong> · ${cities.size} 城 · 飞 ${flightCount} · 铁 ${railCount}`;
}

function modeLabel(mode) {
  return {
    flight: "航班",
    rail: "铁路",
    road: "道路"
  }[mode] || "其他";
}

function statusLabel(status) {
  return {
    draft: "草稿",
    planned: "计划",
    completed: "已完成",
    cancelled: "已取消",
    unknown: "未知"
  }[status] || status;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
