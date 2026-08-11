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

let trips = loadTrips();
let activeFilter = "all";
let selectedTripId = trips[0]?.id;
let editingTripId = null;
let map;
let tileLayer;
let tileErrorCount = 0;
let currentTileIndex = 0;
let routeLayer;
let markerLayer;
let routeByTripId = new Map();
let markerByTripId = new Map();

const form = document.querySelector("#quickAddForm");
const input = document.querySelector("#tripInput");
const dateInput = document.querySelector("#tripDate");
const tripList = document.querySelector("#tripList");
const detail = document.querySelector("#tripDetail");
const storedCount = document.querySelector("#storedCount");
const totalDistance = document.querySelector("#totalDistance");
const cityCount = document.querySelector("#cityCount");
const flightCount = document.querySelector("#flightCount");
const railCount = document.querySelector("#railCount");
const fitAllButton = document.querySelector("#fitAllButton");
const mapFallback = document.querySelector("#mapFallback");
const tileSourceLabel = document.querySelector("#tileSourceLabel");
const exportButtons = document.querySelectorAll(".export-json");
const importButtons = document.querySelectorAll(".import-json");
const importFile = document.querySelector("#importFile");

dateInput.value = new Date().toISOString().slice(0, 10);

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
});

fitAllButton.addEventListener("click", () => {
  fitMapToVisibleTrips();
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

  applyTileLayer(0);

  routeLayer = L.layerGroup().addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  // 地图就绪后补上首次 render 时错过的路线绘制
  render();
  setTimeout(() => map.invalidateSize(), 0);
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
  });

  tileLayer.on("tileerror", () => {
    tileErrorCount += 1;
    if (tileErrorCount >= 6 && currentTileIndex < tileSources.length - 1) {
      applyTileLayer(currentTileIndex + 1);
    } else if (tileErrorCount >= 12) {
      // 所有在线瓦片源都不可用：进入离线示意模式，保留路线与点位
      tileSourceLabel.textContent = "底图：离线示意模式（无瓦片）";
    }
  });

  tileSourceLabel.textContent = `底图：${source.label}`;
}

function loadTrips() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return seedTrips;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : seedTrips;
  } catch {
    return seedTrips;
  }
}

function persistTrips() {
  localStorage.setItem(storageKey, JSON.stringify(trips));
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
  if (/^[A-Z]{2}\d{3,4}$/.test(normalized)) return "flight";
  if (/^[GDCZTK]\d{1,5}$/.test(normalized)) return "rail";
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
      destination: normalizePlace(cleanPlace(routeMatch[2]))
    };
  }

  if (mode === "flight") return { origin: "北京", destination: "上海" };
  if (mode === "rail") return { origin: "上海", destination: "杭州" };
  return { origin: "杭州", destination: "上海" };
}

function cleanPlace(value) {
  return value.replace(/打车|自驾|公交|大巴/g, "").trim() || "待确认";
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

  renderTripList(visibleTrips);
  renderMap(visibleTrips);
  renderDetail();
  renderStats();
}

function getVisibleTrips() {
  return trips.filter((trip) => activeFilter === "all" || trip.mode === activeFilter);
}

function renderTripList(visibleTrips) {
  tripList.innerHTML = "";

  visibleTrips.forEach((trip) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `trip-card ${trip.mode}${trip.id === selectedTripId ? " active" : ""}`;
    card.dataset.tripId = trip.id;
    card.setAttribute("aria-pressed", String(trip.id === selectedTripId));
    card.innerHTML = `
      <div class="trip-title">
        <span>${escapeHtml(trip.title)}</span>
        <span>${modeLabel(trip.mode)}</span>
      </div>
      <div class="trip-meta">
        <span>${escapeHtml(trip.origin)} -> ${escapeHtml(trip.destination)}</span>
        <span>${escapeHtml(trip.date)} ${escapeHtml(trip.departureTime)} - ${escapeHtml(trip.arrivalTime)}</span>
        <span>${escapeHtml(trip.operator)} · ${trip.distanceKm || 0} km</span>
      </div>
      <span class="trip-action">查看地图轨迹</span>
    `;
    card.addEventListener("click", () => {
      selectTrip(trip.id, { focusMap: true });
    });
    tripList.appendChild(card);
  });
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
  renderTripList(getVisibleTrips());
  renderMap(getVisibleTrips());
  renderDetail();

  const card = tripList.querySelector(`[data-trip-id="${CSS.escape(tripId)}"]`);
  card?.scrollIntoView({ block: "nearest" });

  if (options.focusMap) {
    fitMapToTrip(tripId);
  }
}

function renderDetail() {
  const trip = trips.find((item) => item.id === selectedTripId);
  if (!trip) {
    detail.innerHTML = "<p>还没有行程。</p>";
    return;
  }

  if (editingTripId === trip.id) {
    renderEditForm(trip);
    return;
  }

  detail.innerHTML = `
    <div>
      <h3 class="detail-title">${escapeHtml(trip.title)}</h3>
      <p class="trip-meta">${escapeHtml(trip.origin)} -> ${escapeHtml(trip.destination)}</p>
    </div>
    ${detailRow("方式", modeLabel(trip.mode))}
    ${detailRow("日期", trip.date)}
    ${detailRow("时间", `${trip.departureTime} - ${trip.arrivalTime}`)}
    ${detailRow("运营方", trip.operator)}
    ${detailRow("状态", statusLabel(trip.status))}
    ${detailRow("里程", `${trip.distanceKm || 0} km`)}
    ${detailRow("轨迹", routeDescription(trip))}
    ${detailRow("备注", trip.notes)}
    <div class="detail-actions">
      <button class="ghost-button" data-action="edit" type="button">编辑</button>
      <button class="danger-button" data-action="delete" type="button">删除</button>
    </div>
  `;

  detail.querySelector('[data-action="edit"]').addEventListener("click", () => {
    editingTripId = trip.id;
    renderDetail();
  });

  detail.querySelector('[data-action="delete"]').addEventListener("click", () => {
    deleteTrip(trip.id);
  });
}

function renderEditForm(trip) {
  detail.innerHTML = `
    <form class="edit-form" id="editForm">
      <h3 class="detail-title">编辑行程</h3>
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
      <div class="detail-actions">
        <button class="primary-button" type="submit">保存</button>
        <button class="ghost-button" data-action="cancel" type="button">取消</button>
      </div>
    </form>
  `;

  detail.querySelector("#editForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveTripEdit(trip.id);
  });

  detail.querySelector('[data-action="cancel"]').addEventListener("click", () => {
    editingTripId = null;
    renderDetail();
  });
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

  trip.mode = detail.querySelector("#editMode").value;
  trip.title = detail.querySelector("#editTitle").value.trim() || trip.title;
  trip.origin = normalizePlace(detail.querySelector("#editOrigin").value.trim()) || trip.origin;
  trip.destination = normalizePlace(detail.querySelector("#editDestination").value.trim()) || trip.destination;
  trip.date = detail.querySelector("#editDate").value || trip.date;
  trip.departureTime = detail.querySelector("#editDeparture").value.trim() || "待确认";
  trip.arrivalTime = detail.querySelector("#editArrival").value.trim() || "待确认";
  trip.operator = detail.querySelector("#editOperator").value.trim() || trip.operator;
  trip.distanceKm = Number(detail.querySelector("#editDistance").value) || estimateDistance(trip.origin, trip.destination);
  trip.status = detail.querySelector("#editStatus").value;
  trip.notes = detail.querySelector("#editNotes").value.trim();

  editingTripId = null;
  persistTrips();
  render();
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

function routeDescription(trip) {
  if (trip.mode === "flight") return "弧线航路，连接起降机场/城市";
  if (trip.mode === "rail") return "近似铁路轨迹，包含主要中间点";
  return "近似道路轨迹，后续可由路线服务补全";
}

function detailRow(label, value) {
  return `<div class="detail-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(String(value || "待确认"))}</span></div>`;
}

function renderStats() {
  const cities = new Set();
  trips.forEach((trip) => {
    if (trip.origin !== "待确认") cities.add(trip.origin);
    if (trip.destination !== "待确认") cities.add(trip.destination);
  });

  storedCount.textContent = `${trips.length} 条记录`;
  totalDistance.textContent = `${trips.reduce((sum, trip) => sum + (trip.distanceKm || 0), 0)} km`;
  cityCount.textContent = String(cities.size);
  flightCount.textContent = String(trips.filter((trip) => trip.mode === "flight").length);
  railCount.textContent = String(trips.filter((trip) => trip.mode === "rail").length);
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
