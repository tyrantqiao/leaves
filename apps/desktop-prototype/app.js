const storageKey = "leaves.prototype.trips.v2";
const serviceProfileMemoryKey = "leaves.prototype.serviceProfiles";

const commonRailPrefixes = new Set(["G", "D", "C", "Z", "T", "K"]);

const commonFlightAirlines = {
  CA: "中国国际航空",
  MU: "中国东方航空",
  CZ: "中国南方航空",
  HU: "海南航空",
  HO: "吉祥航空",
  KN: "中国联合航空",
  JD: "首都航空",
  Y8: "金鹏航空",
  MF: "厦门航空",
  "3U": "四川航空",
  ZH: "深圳航空",
  "9C": "春秋航空",
  SC: "山东航空",
  GS: "天津航空",
  FM: "上海航空",
  BK: "奥凯航空",
  EU: "成都航空",
  TV: "西藏航空",
  G5: "华夏航空",
  AQ: "九元航空",
  RY: "江西航空",
  NS: "河北航空",
  GJ: "长龙航空",
  DR: "瑞丽航空",
  KY: "昆明航空",
  DZ: "东海航空",
  QW: "青岛航空",
  LT: "龙江航空",
  OQ: "重庆航空",
  PN: "西部航空",
  UQ: "乌鲁木齐航空",
  GT: "桂林航空",
  "8L": "祥鹏航空"
};

const modeColors = {
  flight: "#2f80ed",
  rail: "#0f8b6f",
  ship: "#8a63d2",
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
  "北京首都机场": { lat: 40.0801, lng: 116.5846 },
  "北京南": { lat: 39.8652, lng: 116.3785 },
  "上海": { lat: 31.2304, lng: 121.4737 },
  "上海虹桥": { lat: 31.1968, lng: 121.3260 },
  "上海虹桥机场": { lat: 31.1968, lng: 121.3260 },
  "上海南": { lat: 31.1548, lng: 121.4299 },
  "上海浦东": { lat: 31.1443, lng: 121.8083 },
  "上海浦东机场": { lat: 31.1443, lng: 121.8083 },
  "惠州": { lat: 23.1118, lng: 114.4168 },
  "惠州平潭": { lat: 23.0498, lng: 114.5997 },
  "惠州平潭机场": { lat: 23.0498, lng: 114.5997 },
  "杭州": { lat: 30.2741, lng: 120.1551 },
  "杭州萧山": { lat: 30.2295, lng: 120.4345 },
  "杭州萧山机场": { lat: 30.2295, lng: 120.4345 },
  "杭州东": { lat: 30.2891, lng: 120.2120 },
  "杭州南": { lat: 30.1715, lng: 120.3100 },
  "广州": { lat: 23.1291, lng: 113.2644 },
  "广州白云": { lat: 23.3924, lng: 113.2988 },
  "广州白云机场": { lat: 23.3924, lng: 113.2988 },
  "广州南": { lat: 22.9892, lng: 113.2695 },
  "深圳": { lat: 22.5431, lng: 114.0579 },
  "深圳宝安": { lat: 22.6393, lng: 113.8107 },
  "深圳宝安机场": { lat: 22.6393, lng: 113.8107 },
  "深圳北": { lat: 22.6090, lng: 114.0294 },
  "成都": { lat: 30.5728, lng: 104.0668 },
  "成都天府": { lat: 30.3190, lng: 104.4450 },
  "成都天府机场": { lat: 30.3190, lng: 104.4450 },
  "成都双流": { lat: 30.5785, lng: 103.9471 },
  "成都双流机场": { lat: 30.5785, lng: 103.9471 },
  "成都东": { lat: 30.6310, lng: 104.1430 },
  "西安": { lat: 34.3416, lng: 108.9398 },
  "西安咸阳": { lat: 34.4471, lng: 108.7516 },
  "西安咸阳机场": { lat: 34.4471, lng: 108.7516 },
  "西安北": { lat: 34.3760, lng: 108.9340 },
  "南京": { lat: 32.0603, lng: 118.7969 },
  "南京禄口": { lat: 31.7359, lng: 118.8665 },
  "南京禄口机场": { lat: 31.7359, lng: 118.8665 },
  "南京南": { lat: 31.9705, lng: 118.7958 },
  "武汉": { lat: 30.5928, lng: 114.3055 },
  "武汉天河": { lat: 30.7838, lng: 114.2081 },
  "武汉天河机场": { lat: 30.7838, lng: 114.2081 },
  "重庆": { lat: 29.5630, lng: 106.5516 },
  "重庆江北": { lat: 29.7192, lng: 106.6417 },
  "重庆江北机场": { lat: 29.7192, lng: 106.6417 },
  "重庆北": { lat: 29.6090, lng: 106.5460 },
  "嘉兴": { lat: 30.7461, lng: 120.7555 },
  "虎门": { lat: 22.8266, lng: 113.6730 },
  "合肥": { lat: 31.8206, lng: 117.2272 },
  "合肥南": { lat: 31.8006, lng: 117.3020 },
  "庐江西": { lat: 31.2800, lng: 117.2800 },
  "无锡": { lat: 31.4912, lng: 120.3119 },
  "无锡东": { lat: 31.5883, lng: 120.4360 },
  "苏州": { lat: 31.2989, lng: 120.5853 },
  "苏州北": { lat: 31.4030, lng: 120.6400 },
  "常州": { lat: 31.8107, lng: 119.9741 },
  "常州北": { lat: 31.8620, lng: 119.9800 },
  "徐州": { lat: 34.2044, lng: 117.2857 },
  "徐州东": { lat: 34.2830, lng: 117.3100 },
  "宁波": { lat: 29.8683, lng: 121.5440 },
  "温州": { lat: 27.9938, lng: 120.6994 },
  "温州南": { lat: 27.9900, lng: 120.6600 },
  "福州": { lat: 26.0745, lng: 119.2965 },
  "福州南": { lat: 25.9900, lng: 119.3800 },
  "厦门": { lat: 24.4798, lng: 118.0894 },
  "厦门北": { lat: 24.6700, lng: 118.1300 },
  "长沙": { lat: 28.2282, lng: 112.9388 },
  "长沙南": { lat: 28.1500, lng: 113.0600 },
  "郑州": { lat: 34.7466, lng: 113.6254 },
  "郑州东": { lat: 34.7200, lng: 113.7800 },
  "济南": { lat: 36.6512, lng: 117.1201 },
  "济南西": { lat: 36.6700, lng: 116.8900 },
  "青岛": { lat: 36.0671, lng: 120.3826 },
  "青岛北": { lat: 36.2300, lng: 120.3600 },
  "桂林": { lat: 25.2736, lng: 110.2900 },
  "桂林两江": { lat: 25.2181, lng: 110.0392 },
  "天津": { lat: 39.3434, lng: 117.3616 },
  "天津西": { lat: 39.1600, lng: 117.1600 },
  "石家庄": { lat: 38.0428, lng: 114.5149 },
  "太原": { lat: 37.8706, lng: 112.5489 },
  "太原南": { lat: 37.7800, lng: 112.6000 },
  "哈尔滨": { lat: 45.8038, lng: 126.5349 },
  "哈尔滨西": { lat: 45.7000, lng: 126.5800 },
  "沈阳": { lat: 41.8057, lng: 123.4315 },
  "沈阳北": { lat: 41.8100, lng: 123.4300 },
  "大连": { lat: 38.9140, lng: 121.6147 },
  "大连北": { lat: 39.0500, lng: 121.6200 },
  "昆明": { lat: 24.8801, lng: 102.8329 },
  "昆明南": { lat: 24.8800, lng: 102.8300 },
  "贵阳": { lat: 26.6470, lng: 106.6302 },
  "贵阳北": { lat: 26.6500, lng: 106.6300 },
  "南昌": { lat: 28.6820, lng: 115.8579 },
  "南昌西": { lat: 28.6800, lng: 115.8600 },
  "兰州": { lat: 36.0611, lng: 103.8343 },
  "兰州西": { lat: 36.0600, lng: 103.8300 },
  "乌鲁木齐": { lat: 43.8256, lng: 87.6168 },
  "南宁": { lat: 22.8170, lng: 108.3665 },
  "南宁东": { lat: 22.8200, lng: 108.3700 },
  "海口": { lat: 20.0444, lng: 110.1999 },
  "三亚": { lat: 18.2528, lng: 109.5119 },
  "扬州": { lat: 32.3942, lng: 119.4129 },
  "镇江": { lat: 32.1878, lng: 119.4258 },
  "南通": { lat: 31.9802, lng: 120.8943 },
  "盐城": { lat: 33.3495, lng: 120.1616 },
  "绍兴": { lat: 30.0303, lng: 120.5802 },
  "金华": { lat: 29.0792, lng: 119.6474 },
  "义乌": { lat: 29.3068, lng: 120.0751 },
  "台州": { lat: 28.6564, lng: 121.4208 },
  "湖州": { lat: 30.8945, lng: 120.0868 },
  "芜湖": { lat: 31.3525, lng: 118.4331 },
  "安庆": { lat: 30.5434, lng: 117.0635 },
  "蚌埠": { lat: 32.9163, lng: 117.3897 },
  "六安": { lat: 31.7347, lng: 116.5078 },
  "黄山": { lat: 29.7147, lng: 118.3376 }
};

const coreAirportFallbacks = [
  { city: "北京", name: "北京首都机场", place: "北京首都机场", code: "PEK", aliases: ["首都机场", "北京首都国际机场"], lat: 40.0801, lng: 116.5846 },
  { city: "北京", name: "北京大兴机场", place: "北京大兴机场", code: "PKX", aliases: ["大兴机场", "北京大兴国际机场"], lat: 39.5098, lng: 116.4105 },
  { city: "上海", name: "上海虹桥机场", place: "上海虹桥机场", code: "SHA", aliases: ["虹桥机场", "上海虹桥国际机场"], lat: 31.1968, lng: 121.3260 },
  { city: "上海", name: "上海浦东机场", place: "上海浦东机场", code: "PVG", aliases: ["浦东机场", "上海浦东国际机场"], lat: 31.1443, lng: 121.8083 },
  { city: "广州", name: "广州白云机场", place: "广州白云机场", code: "CAN", aliases: ["白云机场", "广州白云国际机场"], lat: 23.3924, lng: 113.2988 },
  { city: "深圳", name: "深圳宝安机场", place: "深圳宝安机场", code: "SZX", aliases: ["宝安机场", "深圳宝安国际机场"], lat: 22.6393, lng: 113.8107 },
  { city: "杭州", name: "杭州萧山机场", place: "杭州萧山机场", code: "HGH", aliases: ["萧山机场", "杭州萧山国际机场"], lat: 30.2295, lng: 120.4345 },
  { city: "厦门", name: "厦门高崎机场", place: "厦门高崎机场", code: "XMN", aliases: ["厦门机场", "高崎机场", "厦门高崎国际机场"], lat: 24.5440, lng: 118.1277 },
  { city: "泉州", name: "泉州晋江机场", place: "泉州晋江机场", code: "JJN", aliases: ["泉州机场", "晋江机场", "泉州晋江国际机场"], lat: 24.7964, lng: 118.5890 }
];

const airportData = Array.isArray(window.LEAVES_AIRPORTS) && window.LEAVES_AIRPORTS.length
  ? window.LEAVES_AIRPORTS
  : coreAirportFallbacks;

const commonAirports = airportData.map(normalizeAirportRecord);

function inferChineseAirportCity(name = "", city = "") {
  if (/[\u4e00-\u9fa5]/.test(city)) return city;
  const airportName = String(name || "").replace(/国际机场$/, "").replace(/机场$/, "");
  if (!/[\u4e00-\u9fa5]/.test(airportName)) return "";
  return airportName
    .replace(/(首都|大兴|虹桥|浦东|白云|宝安|萧山|高崎|晋江|天府|双流|咸阳|禄口|天河|江北|两江)$/, "")
    .trim();
}

function normalizeAirportRecord(airport) {
  const chineseCity = inferChineseAirportCity(airport.name, airport.city);
  const displayCity = chineseCity || airport.city || "";
  const aliases = new Set([
    airport.name,
    airport.place,
    airport.name?.replace(/国际机场$/, "机场"),
    airport.name?.replace(/机场$/, ""),
    airport.code,
    airport.icao,
    airport.city,
    chineseCity,
    chineseCity && `${chineseCity}机场`,
    ...(airport.aliases || [])
  ].filter(Boolean));

  return {
    ...airport,
    city: displayCity,
    place: airport.place || airport.name,
    searchAliases: [...aliases]
  };
}

commonAirports.forEach((airport) => {
  if (!airport || !Number.isFinite(airport.lat) || !Number.isFinite(airport.lng)) return;
  const coordinate = { lat: airport.lat, lng: airport.lng };
  airport.searchAliases.forEach((alias) => {
    if (alias && !places[alias]) places[alias] = coordinate;
  });
});

const airportAliasMap = commonAirports.reduce((map, airport) => {
  airport.searchAliases.flatMap((alias) => {
    if (!alias) return [];
    return [alias, alias.replace(/国际机场$/, ""), alias.replace(/机场$/, "")];
  }).forEach((alias) => {
    if (!alias) return;
    if (!map.has(alias)) map.set(alias, airport);
    const uppercaseAlias = alias.toUpperCase();
    if (/^[A-Z0-9]+$/.test(uppercaseAlias) && !map.has(uppercaseAlias)) map.set(uppercaseAlias, airport);
  });
  return map;
}, new Map());

/** 站名 → 坐标：精确匹配车站/城市，找不到时去掉方位后缀回退到城市（如 合肥南→合肥）。 */
function resolvePlace(name) {
  if (!name) return null;
  if (places[name]) return places[name];
  const airport = airportAliasMap.get(name);
  if (airport && places[airport.place]) return places[airport.place];
  const candidates = [
    name.replace(/站$/, ""),
    name.replace(/(南|北|东|西|虹桥|机场)$/, ""),
    name.replace(/(南|北|东|西|虹桥|机场)站$/, "")
  ];
  for (const candidate of candidates) {
    if (candidate && candidate !== name && places[candidate]) {
      return places[candidate];
    }
  }
  return null;
}

const knownRoutes = {
  "rail:上海:杭州": ["上海虹桥", "嘉兴", "杭州东"],
  "rail:杭州:上海": ["杭州东", "嘉兴", "上海虹桥"],
  "road:杭州:上海": ["杭州", "嘉兴", "上海"],
  "road:上海:杭州": ["上海", "嘉兴", "杭州"],
  "rail:广州:深圳": ["广州南", "虎门", "深圳北"],
  "rail:深圳:广州": ["深圳北", "虎门", "广州南"],
  "flight:北京:上海": ["北京首都", "上海虹桥"],
  "flight:上海:北京": ["上海虹桥", "北京首都"],
  "flight:惠州平潭:上海浦东": ["惠州平潭", "上海浦东"]
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

const achievementDefinitions = [
  {
    id: "first-trip",
    mark: "01",
    title: "第一片叶",
    detail: "完成 1 条行程记录",
    target: 1,
    getValue: (stats) => stats.totalTrips
  },
  {
    id: "weekend-run",
    mark: "WE",
    title: "周末出发",
    detail: "记录 3 次周末行程",
    target: 3,
    getValue: (stats) => stats.weekendTrips
  },
  {
    id: "air-track",
    mark: "FL",
    title: "云端航迹",
    detail: "记录 3 次航班",
    target: 3,
    getValue: (stats) => stats.modeCounts.flight
  },
  {
    id: "rail-line",
    mark: "CR",
    title: "铁路纵横",
    detail: "记录 3 次铁路",
    target: 3,
    getValue: (stats) => stats.modeCounts.rail
  },
  {
    id: "sea-route",
    mark: "SH",
    title: "海上路线",
    detail: "记录 1 次轮船",
    target: 1,
    getValue: (stats) => stats.modeCounts.ship
  },
  {
    id: "city-collector",
    mark: "CT",
    title: "城市收藏",
    detail: "点亮 8 个城市",
    target: 8,
    getValue: (stats) => stats.cityCount
  },
  {
    id: "multi-mode",
    mark: "MX",
    title: "多方式旅行",
    detail: "使用 3 种交通方式",
    target: 3,
    getValue: (stats) => stats.activeModeCount
  },
  {
    id: "five-thousand",
    mark: "5K",
    title: "五千公里",
    detail: "累计 5000 km",
    target: 5000,
    getValue: (stats) => stats.totalKm
  },
  {
    id: "ten-thousand",
    mark: "10K",
    title: "万里长线",
    detail: "累计 10000 km",
    target: 10000,
    getValue: (stats) => stats.totalKm
  },
  {
    id: "night-window",
    mark: "NT",
    title: "夜间窗口",
    detail: "记录 1 次夜间出发",
    target: 1,
    getValue: (stats) => stats.nightTrips
  }
];

let currentUser = null;
let trips = [];
let activeFilter = "all";
let selectedTripId = null;
let editingTripId = null;
let pendingQuickTrip = null;
let currentView = "home";
let appStarted = false;
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
let mapAssetsPromise = null;
let chinaGeoJsonPromise = null;
const loadedStylesheets = new Set();
const scriptPromises = new Map();

const form = document.querySelector("#quickAddForm");
const input = document.querySelector("#tripInput");
const modeSelect = document.querySelector("#tripMode");
const dateInput = document.querySelector("#tripDate");
const viewButtons = document.querySelectorAll("[data-view]");
const appViews = document.querySelectorAll("[data-view-panel]");
const tripStrip = document.querySelector("#tripStrip");
const heroOverlay = document.querySelector("#heroOverlay");
const statsLine = document.querySelector("#statsLine");
const mapFallback = document.querySelector("#mapFallback");
const tileSourceLabel = document.querySelector("#tileSourceLabel");
const dashboardRange = document.querySelector("#dashboardRange");
const dashboardSummary = document.querySelector("#dashboardSummary");
const dashboardMetricGrid = document.querySelector("#dashboardMetricGrid");
const modeDominant = document.querySelector("#modeDominant");
const modeBreakdown = document.querySelector("#modeBreakdown");
const monthlyTimeline = document.querySelector("#monthlyTimeline");
const topRoutesList = document.querySelector("#topRoutesList");
const routeCountLabel = document.querySelector("#routeCountLabel");
const recentHighlights = document.querySelector("#recentHighlights");
const recentCountLabel = document.querySelector("#recentCountLabel");
const achievementSummary = document.querySelector("#achievementSummary");
const achievementLevel = document.querySelector("#achievementLevel");
const achievementProgress = document.querySelector("#achievementProgress");
const achievementGrid = document.querySelector("#achievementGrid");
const exportButtons = document.querySelectorAll(".export-json");
const importButtons = document.querySelectorAll(".import-json");
const importFile = document.querySelector("#importFile");
const authGate = document.querySelector("#authGate");
const appShell = document.querySelector("#appShell");
const authForm = document.querySelector("#authForm");
const authTitle = document.querySelector("#authTitle");
const authUsername = document.querySelector("#authUsername");
const authPassword = document.querySelector("#authPassword");
const authPasswordConfirm = document.querySelector("#authPasswordConfirm");
const authConfirmRow = document.querySelector("#authConfirmRow");
const authSubmit = document.querySelector("#authSubmit");
const authMessage = document.querySelector("#authMessage");
const currentUserName = document.querySelector("#currentUserName");
const logoutButton = document.querySelector("#logoutButton");
let authMode = "login";

// 登记日期：默认今天。登记的是过往行程，允许选择任意历史日期；查询车次时另用查询日期（今天~+14天）
function localToday() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

dateInput.value = localToday();

document.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode(button.dataset.authMode);
  });
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuthForm();
});

logoutButton.addEventListener("click", () => {
  logout();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const rawText = input.value.trim();
  if (!rawText) return;

  const resolvedMode = resolveInputMode(rawText, modeSelect.value);
  if (!resolvedMode) return;

  const draft = createTripDraft(rawText, extractTripDate(rawText) || dateInput.value, resolvedMode);
  pendingQuickTrip = draft;
  input.value = "";
  modeSelect.value = "auto";
  switchView("home", { skipRender: true });
  renderQuickTripPreview(draft);
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

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchView(button.dataset.view);
  });
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    render();
  });
});

setAuthMode("login");
checkExistingSession();

function switchView(view, options = {}) {
  currentView = ["home", "dashboard", "achievements"].includes(view) ? view : "home";

  viewButtons.forEach((button) => {
    const active = button.dataset.view === currentView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  appViews.forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== currentView;
  });

  if (currentView === "home") {
    scheduleMapInit();
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 0);
  }

  if (!options.skipRender) render();
}

function setAuthMode(mode) {
  authMode = mode === "register" ? "register" : "login";
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === authMode);
  });
  authTitle.textContent = authMode === "register" ? "注册 Leaves" : "登录 Leaves";
  authSubmit.textContent = authMode === "register" ? "注册并进入" : "登录";
  authConfirmRow.hidden = authMode !== "register";
  authPassword.autocomplete = authMode === "register" ? "new-password" : "current-password";
  authPasswordConfirm.required = authMode === "register";
  authPasswordConfirm.value = "";
  setAuthMessage(authMode === "register" ? "密码至少 10 位，账号上限为 5 个。" : "");
}

function setAuthMessage(message, type = "") {
  authMessage.textContent = message || "";
  authMessage.className = `auth-message${type ? ` ${type}` : ""}`;
}

async function checkExistingSession() {
  authGate.hidden = false;
  appShell.hidden = true;
  setAuthMessage("正在检查登录状态...");

  try {
    const response = await apiFetch("/api/auth/me");
    const payload = await readResponseJson(response);
    if (response.ok && payload.user) {
      enterApp(payload.user);
      return;
    }
    setAuthMessage("请先登录或注册。");
  } catch (e) {
    setAuthMessage("无法连接 Leaves 服务，请通过 npm start 启动后再登录。", "error");
  }
}

async function submitAuthForm() {
  const username = authUsername.value.trim();
  const password = authPassword.value;
  const passwordConfirm = authPasswordConfirm.value;

  if (authMode === "register" && password !== passwordConfirm) {
    setAuthMessage("两次输入的密码不一致。", "error");
    return;
  }

  authSubmit.disabled = true;
  setAuthMessage(authMode === "register" ? "正在注册..." : "正在登录...");

  try {
    const response = await apiFetch(`/api/auth/${authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const payload = await readResponseJson(response);
    if (!response.ok || !payload.user) {
      setAuthMessage(payload.error || "账号操作失败，请稍后重试。", "error");
      return;
    }
    setAuthMessage("已登录。", "success");
    enterApp(payload.user);
  } catch (e) {
    setAuthMessage("无法连接 Leaves 服务，请确认本地服务正在运行。", "error");
  } finally {
    authSubmit.disabled = false;
  }
}

function enterApp(user) {
  currentUser = user;
  currentUserName.textContent = user.username;
  authGate.hidden = true;
  appShell.hidden = false;
  authPassword.value = "";
  authPasswordConfirm.value = "";

  activeFilter = "all";
  editingTripId = null;
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === "all");
  });

  switchView("home", { skipRender: true });
  trips = loadTripsFromLocal();
  selectedTripId = trips[0]?.id || null;

  render();
  scheduleMapInit();
  syncTripsFromServer();
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 0);
}

async function logout() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    /* 本地仍退出 */
  }

  currentUser = null;
  trips = [];
  selectedTripId = null;
  editingTripId = null;
  currentUserName.textContent = "";
  if (routeLayer) routeLayer.clearLayers();
  if (markerLayer) markerLayer.clearLayers();
  tripStrip.innerHTML = "";
  heroOverlay.innerHTML = "";
  statsLine.textContent = "";
  appShell.hidden = true;
  authGate.hidden = false;
  setAuthMode("login");
  setAuthMessage("已退出登录。", "success");
  authUsername.focus();
}

function handleAuthExpired() {
  currentUser = null;
  appShell.hidden = true;
  authGate.hidden = false;
  setAuthMode("login");
  setAuthMessage("登录状态已过期，请重新登录。", "error");
}

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function scheduleMapInit() {
  if (appStarted || map) return;
  appStarted = true;
  setMapFallback("地图资源加载中", "正在准备本地地图资源。");

  const start = () => initMap();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 700 });
  } else {
    setTimeout(start, 80);
  }
}

function initMap() {
  if (map) return;
  mapAssetsPromise = mapAssetsPromise || loadLeafletAssets();
  mapAssetsPromise
    .then(() => {
      if (!window.L) throw new Error("Leaflet unavailable");
      setupMap();
    })
    .catch(() => {
      appStarted = false;
      mapAssetsPromise = null;
      setMapFallback(
        "地图资源未加载",
        "Leaflet 资源加载失败，请强制刷新页面（Ctrl+F5）或确认 vendor/leaflet/ 目录完整。"
      );
    });
}

function loadLeafletAssets() {
  if (window.L) {
    loadStylesheetOnce("./vendor/leaflet/leaflet.css").catch(() => {});
    return Promise.resolve();
  }

  return Promise.all([
    loadStylesheetOnce("./vendor/leaflet/leaflet.css").catch(() => {}),
    loadScriptOnce("./vendor/leaflet/leaflet.js")
  ])
    .then(() => {
      if (!window.L) throw new Error("local Leaflet missing");
    })
    .catch(() => loadLeafletFromCdn());
}

function loadLeafletFromCdn(index = 0) {
  const cdnSources = [
    { css: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css", js: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js" },
    { css: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css", js: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" },
    { css: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", js: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" },
    { css: "https://cdn.bootcdn.net/ajax/libs/leaflet/1.9.4/leaflet.css", js: "https://cdn.bootcdn.net/ajax/libs/leaflet/1.9.4/leaflet.js" }
  ];
  const source = cdnSources[index];
  if (!source) return Promise.reject(new Error("Leaflet CDN unavailable"));

  loadStylesheetOnce(source.css).catch(() => {});
  return loadScriptOnce(source.js)
    .then(() => {
      if (!window.L) throw new Error("CDN Leaflet missing");
    })
    .catch(() => loadLeafletFromCdn(index + 1));
}

function loadStylesheetOnce(href) {
  if (loadedStylesheets.has(href)) return Promise.resolve();
  loadedStylesheets.add(href);

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => {
      loadedStylesheets.delete(href);
      reject(new Error(`Stylesheet failed: ${href}`));
    };
    document.head.appendChild(link);
  });
}

function loadScriptOnce(src) {
  if (scriptPromises.has(src)) return scriptPromises.get(src);

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromises.delete(src);
      reject(new Error(`Script failed: ${src}`));
    };
    document.head.appendChild(script);
  });
  scriptPromises.set(src, promise);
  return promise;
}

function setMapFallback(title, message) {
  mapFallback.hidden = false;
  mapFallback.querySelector("strong").textContent = title;
  mapFallback.querySelector("span").textContent = message;
}

function setupMap() {
  if (map) return;
  mapFallback.hidden = true;
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

// 懒加载本地省界底图：script 路径兼容 file://，fetch 路径便于压缩传输。
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

  loadChinaGeoJson()
    .then(addLayer)
    .catch(() => {});
}

function loadChinaGeoJson() {
  if (window.LEAVES_CHINA_GEOJSON) return Promise.resolve(window.LEAVES_CHINA_GEOJSON);
  if (chinaGeoJsonPromise) return chinaGeoJsonPromise;

  chinaGeoJsonPromise = loadScriptOnce("./vendor/china-provinces.js")
    .then(() => {
      if (!window.LEAVES_CHINA_GEOJSON) throw new Error("province data missing");
      return window.LEAVES_CHINA_GEOJSON;
    })
    .catch(() =>
      fetch("./vendor/china-provinces.geojson").then((response) => {
        if (!response.ok) throw new Error("geojson missing");
        return response.json();
      })
    );

  return chinaGeoJsonPromise;
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
  if (!currentUser) return [];
  const raw = localStorage.getItem(scopedStorageKey(storageKey));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    // 空数组也尊重（用户删光了行程后不复活 demo 数据）
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function scopedStorageKey(key) {
  return currentUser ? `${key}.${currentUser.id}` : key;
}

/** 本地 API 地址：file:// 双击打开时使用注入的绝对地址（配合服务器 CORS），http 模式同源相对路径。 */
function apiUrl(path) {
  if (location.protocol === "file:" && window.LEAVES_API_BASE) {
    return window.LEAVES_API_BASE + path;
  }
  return path;
}

function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    credentials: "include",
    ...options
  });
}

/** 启动时用服务器文件数据校准（本地文件是最终权威，浏览器清缓存/换环境也不丢数据）。 */
function syncTripsFromServer() {
  if (!currentUser) return;
  apiFetch("/api/data/trips")
    .then((resp) => {
      if (resp.status === 401) {
        handleAuthExpired();
        return null;
      }
      return resp.ok ? resp.json() : null;
    })
    .then((serverTrips) => {
      // 服务端文件是最终权威；空数组表示该账号暂无行程，同样尊重。
      if (!Array.isArray(serverTrips)) return;
      trips = serverTrips;
      selectedTripId = trips[0]?.id;
      editingTripId = null;
      persistTrips();
      render();
    })
    .catch(() => {});
}

function persistTrips() {
  if (!currentUser) return;
  localStorage.setItem(scopedStorageKey(storageKey), JSON.stringify(trips));
  persistTripsToServer();
}

/** 行程写入本地文件（fire-and-forget，离线时静默失败）。 */
function persistTripsToServer() {
  if (!currentUser) return;
  try {
    apiFetch("/api/data/trips", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trips)
    })
      .then((response) => {
        if (response.status === 401) handleAuthExpired();
      })
      .catch(() => {});
  } catch (e) {
    /* 静默 */
  }
}

function createTripDraft(rawText, date, explicitMode = "auto") {
  // 下拉显式选择优先；"自动" 时按文本识别
  const mode = explicitMode !== "auto" ? explicitMode : detectMode(rawText);
  const route = inferRoute(rawText, mode);
  const serviceNumber = extractServiceNumber(rawText, mode);
  const times = extractTimeRange(rawText);
  const reusable = getReusableServiceProfile(mode, serviceNumber);
  const reusedRoute = !route.userProvided && reusable?.origin && reusable?.destination;
  const reusedTimes = !times.departureTime && !times.arrivalTime && reusable;

  return {
    id: `trip-${Date.now()}`,
    mode,
    title: serviceNumber || rawText,
    operator: reusable?.operator || defaultOperatorForMode(mode, serviceNumber),
    origin: reusedRoute ? reusable.origin : route.origin,
    destination: reusedRoute ? reusable.destination : route.destination,
    routeUserProvided: route.userProvided || Boolean(reusedRoute),
    date,
    departureTime: times.departureTime || (reusedTimes && reusable.departureTime) || "待确认",
    arrivalTime: times.arrivalTime || (reusedTimes && reusable.arrivalTime) || "待确认",
    distanceKm: reusedRoute ? reusable.distanceKm || estimateDistance(reusable.origin, reusable.destination) : estimateDistance(route.origin, route.destination),
    status: "draft",
    notes: reusable ? `由输入 "${rawText}" 生成，已复用此前登记的${modeLabel(mode)}信息，等待用户确认。` : `由输入 "${rawText}" 生成，等待用户确认和数据源补全。`
  };
}

function getWorkflowTrip(tripId) {
  return trips.find((item) => item.id === tripId) || (pendingQuickTrip?.id === tripId ? pendingQuickTrip : null);
}

function isPendingWorkflowTrip(trip) {
  return Boolean(trip && pendingQuickTrip?.id === trip.id);
}

function commitPendingTrip(trip) {
  if (!isPendingWorkflowTrip(trip)) return false;
  pendingQuickTrip = null;
  trips = [trip, ...trips];
  selectedTripId = trip.id;
  return true;
}

function cancelPendingTrip() {
  pendingQuickTrip = null;
  editingTripId = null;
  render();
}

function resolveInputMode(rawText, selectedMode) {
  if (selectedMode !== "auto") return selectedMode;
  const analysis = analyzeTransportCode(rawText);

  if (analysis.ambiguous) {
    return window.confirm(`${analysis.code} 同时像铁路车次，也像 ${analysis.airline || "航班"} 的航班号。\n\n选择“确定”按铁路登记，选择“取消”按航班登记。`)
      ? "rail"
      : "flight";
  }

  if (analysis.mode === "unknown") {
    const answer = window.prompt("暂时分不清这是哪种交通工具。请输入 flight（航班）、rail（铁路）、road（道路）或 ship（轮船）：", "rail");
    const normalized = String(answer || "").trim().toLowerCase();
    const aliases = {
      flight: "flight",
      "航班": "flight",
      rail: "rail",
      "铁路": "rail",
      train: "rail",
      road: "road",
      "道路": "road",
      ship: "ship",
      "轮船": "ship"
    };
    return aliases[normalized] || null;
  }

  return analysis.mode;
}

function detectMode(text) {
  const analysis = analyzeTransportCode(text);
  return analysis.mode === "unknown" ? "road" : analysis.mode;
}

function analyzeTransportCode(text) {
  const normalized = String(text || "").trim().toUpperCase();
  const code = extractLeadingServiceCode(normalized);
  const railCandidate = isLikelyRailCode(code);
  const flightCandidate = isLikelyFlightCode(code);
  const airline = getFlightAirlineFallback(code);

  if (railCandidate && flightCandidate && airline) {
    return { mode: "rail", code, ambiguous: true, airline };
  }
  if (railCandidate) return { mode: "rail", code, ambiguous: false };
  if (flightCandidate) return { mode: "flight", code, ambiguous: false, airline };
  if (/轮船|轮渡|渡轮|客轮|邮轮/.test(text)) return { mode: "ship", code: "", ambiguous: false };
  if (/高铁|动车|火车|铁路|车次/.test(text)) return { mode: "rail", code: "", ambiguous: false };
  if (/航班|飞机|飞/.test(text)) return { mode: "flight", code: "", ambiguous: false };
  if (text.includes("打车") || text.includes("自驾") || text.includes("公交") || text.includes("大巴")) {
    return { mode: "road", code: "", ambiguous: false };
  }
  if (text.includes("到") || text.includes("->") || text.includes("--") || text.includes("—") || text.includes("–") || text.includes("至")) {
    return { mode: "unknown", code: "", ambiguous: false };
  }
  return { mode: "unknown", code: code || normalized, ambiguous: false };
}

function extractServiceNumber(text, mode) {
  const normalized = text.trim().toUpperCase();
  if (mode === "flight") return normalized.match(/[A-Z0-9]{2}\d{3,4}/)?.[0];
  if (mode === "rail") return normalized.match(/[GDCZTK]\d{1,5}/)?.[0];
  return "";
}

function extractLeadingServiceCode(text) {
  return String(text || "").trim().toUpperCase().match(/^[A-Z0-9]{1,3}\d{1,5}/)?.[0] || "";
}

function isLikelyRailCode(code) {
  return /^[GDCZTK]\d{1,5}$/i.test(code || "") && commonRailPrefixes.has(String(code).slice(0, 1).toUpperCase());
}

function isLikelyFlightCode(code) {
  if (!/^[A-Z0-9]{2}\d{3,4}$/i.test(code || "")) return false;
  const prefix = String(code).slice(0, 2).toUpperCase();
  return Boolean(commonFlightAirlines[prefix]) || /^[A-Z0-9]{2}$/.test(prefix);
}

function defaultOperatorForMode(mode, serviceNumber = "") {
  if (mode === "flight") return getFlightAirlineFallback(serviceNumber) || "待补全航司";
  if (mode === "rail") return "中国铁路";
  return "手动记录";
}

function extractTripDate(text) {
  const match = String(text || "").match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractTimeRange(text) {
  const match = String(text || "").match(/(\d{1,2})[：:](\d{2})\s*(?:~|～|-|—|–|至|到)\s*(\d{1,2})[：:](\d{2})/);
  if (!match) return { departureTime: "", arrivalTime: "" };
  const depHour = match[1].padStart(2, "0");
  const arrHour = match[3].padStart(2, "0");
  return {
    departureTime: `${depHour}:${match[2]}`,
    arrivalTime: `${arrHour}:${match[4]}`
  };
}

function timeInputValue(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function inferRoute(text, mode) {
  // 支持 "上海到杭州"、"惠州飞上海浦东"、"惠州平潭--上海浦东" 等分隔符
  const routeMatch = text.match(/(.+?)(?:到|->|--|—|–|至|飞)(.+)/);
  if (routeMatch) {
    const normalizeRoutePlace = mode === "flight" ? normalizeFlightPlace : normalizePlace;
    return {
      origin: normalizeRoutePlace(cleanPlace(routeMatch[1])),
      destination: normalizeRoutePlace(cleanPlace(routeMatch[2])),
      userProvided: true
    };
  }

  // 未提供区间：标记 userProvided=false，铁路登记时引导用户补充区间，不默认匹配
  if (mode === "flight") return { origin: "北京", destination: "上海", userProvided: false };
  if (mode === "rail") return { origin: "待确认", destination: "待确认", userProvided: false };
  if (mode === "ship") return { origin: "待确认", destination: "待确认", userProvided: false };
  return { origin: "杭州", destination: "上海", userProvided: false };
}

function cleanPlace(value) {
  return value
    .replace(/打车|自驾|公交|大巴/g, "")
    .replace(/^[A-Z0-9]{1,3}\d{1,5}/i, "") // 去掉残留在起点里的车次号（如 "G7254 合肥南" → "合肥南"）
    .replace(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b.*$/, "")
    .replace(/(?:上午|下午|晚上|早上|中午|凌晨)?\d{1,2}[：:]\d{2}.*$/, "")
    .trim() || "待确认";
}

function normalizePlace(value) {
  const trimmed = String(value || "").trim().replace(/T\d+$/i, "");
  if (places[trimmed]) return trimmed;
  const airportAlias = resolveAirportAlias(trimmed);
  if (airportAlias) return airportAlias.place;
  const airportSuffixRemoved = trimmed.replace(/国际机场$/, "机场").replace(/机场$/, "");
  const suffixRemovedAirport = resolveAirportAlias(airportSuffixRemoved);
  if (suffixRemovedAirport) return suffixRemovedAirport.place;
  if (places[airportSuffixRemoved]) return airportSuffixRemoved;
  if (trimmed.includes("惠州平潭")) return "惠州平潭";
  if (trimmed.includes("浦东")) return "上海浦东";
  if (trimmed.includes("虹桥")) return "上海虹桥";
  if (trimmed.includes("萧山")) return "杭州萧山";
  if (trimmed.includes("两江")) return "桂林两江";
  if (trimmed.includes("惠州")) return "惠州";
  if (trimmed.includes("北京")) return "北京";
  if (trimmed.includes("上海")) return "上海";
  if (trimmed.includes("桂林两江")) return "桂林两江";
  if (trimmed.includes("桂林")) return "桂林";
  if (trimmed.includes("杭州")) return "杭州";
  if (trimmed.includes("广州")) return "广州";
  if (trimmed.includes("深圳")) return "深圳";
  if (trimmed.includes("成都")) return "成都";
  if (trimmed.includes("西安")) return "西安";
  if (trimmed.includes("南京")) return "南京";
  if (trimmed.includes("武汉")) return "武汉";
  if (trimmed.includes("重庆")) return "重庆";
  return trimmed;
}

function normalizeFlightPlace(value) {
  const trimmed = String(value || "").trim();
  const airportAlias = resolveAirportAlias(trimmed);
  if (airportAlias) return airportAlias.name;
  return normalizePlace(trimmed);
}

function resolveAirportAlias(value) {
  const trimmed = String(value || "").trim();
  return airportAliasMap.get(trimmed) || airportAliasMap.get(trimmed.toUpperCase()) || null;
}

function estimateDistance(origin, destination) {
  const from = resolvePlace(origin);
  const to = resolvePlace(destination);
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
  const stats = getTripStats();
  if (!visibleTrips.some((trip) => trip.id === selectedTripId)) {
    selectedTripId = visibleTrips[0]?.id || trips[0]?.id;
  }

  renderTripStrip(visibleTrips);
  if (currentView === "home") renderMap(visibleTrips);
  renderHero();
  renderStats(stats);
  renderDashboard(stats);
  renderAchievements(stats);
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
      weight: trip.mode === "flight" ? (isActive ? 8 : 6) : (isActive ? 7 : 5),
      opacity: trip.mode === "flight" ? (isActive ? 0.98 : 0.82) : (isActive ? 0.95 : 0.72),
      dashArray: undefined,
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

      marker.bindTooltip(label, { permanent: isActive || trip.mode === "flight", direction: "top", offset: [0, -8] });
      marker.on("click", () => selectTrip(trip.id, { focusMap: true }));
      return marker;
    });

    if (trip.mode === "flight" && isActive) {
      const middlePoint = points[Math.floor(points.length / 2)];
      endpointMarkers.push(
        L.marker(middlePoint, {
          interactive: false,
          icon: L.divIcon({
            className: "flight-path-marker",
            html: "<span>航线</span>",
            iconSize: [44, 24],
            iconAnchor: [22, 12]
          })
        }).addTo(markerLayer)
      );
    }
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

  const from = resolvePlace(trip.origin);
  const to = resolvePlace(trip.destination);
  if (!from || !to) return [];

  // 航班/轮船用弧线表达；铁路/道路用弯曲线
  if (trip.mode === "flight" || trip.mode === "ship") return createFlightArc(from, to);
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
  if (pendingQuickTrip) {
    renderQuickTripPreview(pendingQuickTrip);
    return;
  }

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
        ${trip.mode === "flight" ? `<button class="ghost-button small" data-action="flight-register" type="button">航班登记</button>` : ""}
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

  heroOverlay.querySelector('[data-action="flight-register"]')?.addEventListener("click", () => {
    openFlightPanel(trip.id);
  });

  heroOverlay.querySelector('[data-action="delete"]').addEventListener("click", () => {
    deleteTrip(trip.id);
  });
}

function renderQuickTripPreview(trip) {
  pendingQuickTrip = trip;
  heroOverlay.innerHTML = `
    <form class="edit-form quick-preview-form" id="quickPreviewForm">
      <div class="ticket-panel-head">
        <div>
          <h3>识别预览</h3>
          <p class="ticket-sub">确认前不会新增行程，可先修改识别结果。</p>
        </div>
        <button class="ghost-button small" data-action="cancel" type="button">取消</button>
      </div>
      ${editField("previewMode", "方式", modeSelectOptions(trip.mode, "previewMode"))}
      ${editField("previewTitle", "标题", `<input id="previewTitle" value="${escapeHtml(trip.title)}" required>`)}
      ${editField("previewOrigin", "起点", `<input id="previewOrigin" value="${escapeHtml(trip.origin)}" required>`)}
      ${editField("previewDestination", "终点", `<input id="previewDestination" value="${escapeHtml(trip.destination)}" required>`)}
      ${editField("previewDate", "日期", `<input id="previewDate" type="date" value="${escapeHtml(trip.date)}" required>`)}
      ${editField("previewDeparture", "出发", `<input id="previewDeparture" type="time" value="${escapeHtml(timeInputValue(trip.departureTime))}">`)}
      ${editField("previewArrival", "到达", `<input id="previewArrival" type="time" value="${escapeHtml(timeInputValue(trip.arrivalTime))}">`)}
      ${editField("previewOperator", "运营方", `<input id="previewOperator" value="${escapeHtml(trip.operator)}">`)}
      ${editField("previewNotes", "备注", `<textarea id="previewNotes" rows="2">${escapeHtml(trip.notes || "")}</textarea>`)}
      <div class="edit-actions">
        <button class="primary-button" data-action="confirm" type="submit">确认保存</button>
        ${trip.mode === "rail" && /^[GDCZTK]\d{1,5}$/i.test(trip.title) ? `<button class="ghost-button" data-action="rail-complete" type="button">补全铁路站点</button>` : ""}
        ${trip.mode === "flight" ? `<button class="ghost-button" data-action="flight-register" type="button">填写航班信息</button>` : ""}
      </div>
    </form>
  `;

  const formEl = heroOverlay.querySelector("#quickPreviewForm");
  heroOverlay.querySelector("#previewMode").addEventListener("change", () => {
    syncQuickPreviewValues(trip);
    renderQuickTripPreview(trip);
  });

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    syncQuickPreviewValues(trip);
    trip.distanceKm = estimateDistance(trip.origin, trip.destination) || trip.distanceKm;
    trip.status = trip.departureTime !== "待确认" && trip.arrivalTime !== "待确认" ? "completed" : "draft";
    commitPendingTrip(trip);
    rememberTransportProfile(trip);
    persistTrips();
    render();
  });

  formEl.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "cancel") {
      event.preventDefault();
      cancelPendingTrip();
      return;
    }
    if (action === "rail-complete") {
      syncQuickPreviewValues(trip);
      handleRailStationSelection(trip.id);
      return;
    }
    if (action === "flight-register") {
      syncQuickPreviewValues(trip);
      openFlightPanel(trip.id);
    }
  });

  formEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelPendingTrip();
    }
  });
}

function syncQuickPreviewValues(trip) {
  const previousMode = trip.mode;
  trip.mode = heroOverlay.querySelector("#previewMode").value;
  trip.title = heroOverlay.querySelector("#previewTitle").value.trim() || trip.title;
  const normalizeRoutePlace = trip.mode === "flight" ? normalizeFlightPlace : normalizePlace;
  const origin = heroOverlay.querySelector("#previewOrigin").value.trim();
  const destination = heroOverlay.querySelector("#previewDestination").value.trim();
  trip.origin = origin && origin !== "待确认" ? normalizeRoutePlace(origin) : "待确认";
  trip.destination = destination && destination !== "待确认" ? normalizeRoutePlace(destination) : "待确认";
  trip.date = heroOverlay.querySelector("#previewDate").value || trip.date;
  trip.departureTime = heroOverlay.querySelector("#previewDeparture").value.trim() || "待确认";
  trip.arrivalTime = heroOverlay.querySelector("#previewArrival").value.trim() || "待确认";
  trip.operator = heroOverlay.querySelector("#previewOperator").value.trim() || defaultOperatorForMode(trip.mode, trip.title);
  trip.notes = heroOverlay.querySelector("#previewNotes").value.trim();
  trip.routeUserProvided = trip.origin !== "待确认" && trip.destination !== "待确认";

  if (trip.mode !== previousMode && (!trip.operator || trip.operator === defaultOperatorForMode(previousMode, trip.title))) {
    trip.operator = defaultOperatorForMode(trip.mode, trip.title);
  }
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
      ${editField("editDeparture", "出发", `<input id="editDeparture" type="time" value="${escapeHtml(timeInputValue(trip.departureTime))}">`)}
      ${editField("editArrival", "到达", `<input id="editArrival" type="time" value="${escapeHtml(timeInputValue(trip.arrivalTime))}">`)}
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
    const response = await fetch(apiUrl("/api/12306/train-route"), {
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

function modeSelectOptions(currentMode, id = "editMode") {
  const options = ["flight", "rail", "ship", "road"]
    .map((mode) => `<option value="${mode}"${mode === currentMode ? " selected" : ""}>${modeLabel(mode)}</option>`)
    .join("");
  return `<select id="${id}">${options}</select>`;
}

function statusSelectOptions(currentStatus, id = "editStatus") {
  const options = ["draft", "planned", "completed", "cancelled"]
    .map((status) => `<option value="${status}"${status === currentStatus ? " selected" : ""}>${statusLabel(status)}</option>`)
    .join("");
  return `<select id="${id}">${options}</select>`;
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

  rememberTransportProfile(trip);
  editingTripId = null;
  persistTrips();
  render();
}

// ---------- 12306 集成：车次经停站选择与自动补全 ----------

// 车次区间记忆：记住每个车次成功确认过的起讫区间，下次登记直接自动查询
const routeMemoryKey = "leaves.prototype.routes";

function getRouteMemory() {
  try {
    return JSON.parse(localStorage.getItem(scopedStorageKey(routeMemoryKey))) || {};
  } catch {
    return {};
  }
}

function rememberRoute(trainCode, from, to) {
  const memory = getRouteMemory();
  memory[trainCode] = `${from}|${to}`;
  try {
    localStorage.setItem(scopedStorageKey(routeMemoryKey), JSON.stringify(memory));
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

function getServiceProfileMemory() {
  try {
    return JSON.parse(localStorage.getItem(scopedStorageKey(serviceProfileMemoryKey))) || {};
  } catch {
    return {};
  }
}

function serviceProfileKey(mode, serviceNumber) {
  return `${mode}:${String(serviceNumber || "").trim().toUpperCase()}`;
}

function getReusableServiceProfile(mode, serviceNumber) {
  if (!mode || !serviceNumber) return null;
  const key = serviceProfileKey(mode, serviceNumber);
  const fromTrips = trips
    .filter((trip) => serviceProfileKey(trip.mode, trip.title) === key)
    .find((trip) => hasReusableTripInfo(trip));
  if (fromTrips) return compactTripProfile(fromTrips);
  const remembered = getServiceProfileMemory()[key];
  return remembered && hasReusableTripInfo(remembered) ? remembered : null;
}

function hasReusableTripInfo(trip) {
  return Boolean(
    trip &&
      trip.origin &&
      trip.destination &&
      trip.origin !== "待确认" &&
      trip.destination !== "待确认"
  );
}

function compactTripProfile(trip) {
  return {
    mode: trip.mode,
    title: String(trip.title || "").trim().toUpperCase(),
    operator: trip.operator || "",
    origin: trip.origin,
    destination: trip.destination,
    departureTime: trip.departureTime && trip.departureTime !== "待确认" ? trip.departureTime : "",
    arrivalTime: trip.arrivalTime && trip.arrivalTime !== "待确认" ? trip.arrivalTime : "",
    distanceKm: Number(trip.distanceKm) || estimateDistance(trip.origin, trip.destination) || 0
  };
}

function rememberTransportProfile(trip) {
  if (!trip || !trip.title || !hasReusableTripInfo(trip)) return;
  const memory = getServiceProfileMemory();
  memory[serviceProfileKey(trip.mode, trip.title)] = compactTripProfile(trip);
  try {
    localStorage.setItem(scopedStorageKey(serviceProfileMemoryKey), JSON.stringify(memory));
  } catch (e) {
    /* 静默 */
  }
}

/** 登记铁路车次后：优先自动查询经停站（有记忆区间/输入区间），否则车站联想引导。 */
async function handleRailStationSelection(tripId) {
  const trip = getWorkflowTrip(tripId);
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

/** 日期加减（YYYY-MM-DD）。 */
function addDays(dateStr, days) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** 在 Hero 卡片内查询车次全部经停站，并让用户选择上车站与到达站。 */
async function openStationSelector(tripId, options = {}) {
  const trip = getWorkflowTrip(tripId);
  if (!trip) return;

  // 首次打开时渲染面板框架（含查询日期选择器）；重试时仅刷新列表区
  if (!heroOverlay.querySelector(".station-panel")) {
    // 查询日期默认今天；登记日期是历史（过去行程）时也按今天查询
    const queryDefault = trip.date >= localToday() ? trip.date : localToday();
    heroOverlay.innerHTML = `
      <div class="ticket-panel station-panel">
        <div class="ticket-panel-head">
          <div>
            <p class="ticket-title">${escapeHtml(trip.title)} 站点选择</p>
            <p class="ticket-sub" id="panelStatus">正在自动查询车次信息…</p>
          </div>
          <button class="ghost-button small" data-action="skip" type="button">跳过</button>
        </div>
        <div class="station-date">
          <label class="edit-field"><span>查询日期</span><input id="panelDate" type="date" min="${localToday()}" value="${escapeHtml(queryDefault)}"></label>
          <p class="ticket-sub" id="dateHint"></p>
        </div>
        <div class="station-list"></div>
      </div>
    `;

    heroOverlay.querySelector('[data-action="skip"]').addEventListener("click", () => {
      if (isPendingWorkflowTrip(trip)) {
        cancelPendingTrip();
        return;
      }
      editingTripId = null;
      render();
    });

    // 用户改查询日期 → 用新日期重新查询（不再自动切明天）
    heroOverlay.querySelector("#panelDate").addEventListener("change", () => {
      openStationSelector(tripId, { autoTomorrow: false });
    });
  }

  const listEl = heroOverlay.querySelector(".station-list");
  const statusEl = heroOverlay.querySelector("#panelStatus");
  const dateHintEl = heroOverlay.querySelector("#dateHint");
  // 查询日期（面板选择，用于 12306 接口）；登记日期 trip.date 保持用户填写的乘车日期
  const queryDate = heroOverlay.querySelector("#panelDate").value;

  listEl.innerHTML = `<p class="ticket-loading">正在查询 12306 车次信息（${escapeHtml(queryDate)}）…</p>`;

  const tryQuery = async (date) => {
    const response = await fetch(apiUrl("/api/12306/train-route"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        train_no: trip.title,
        // 纯车次号可省略区间：后端通过 search 接口自动定位始发/终到站
        from_station: trip.origin === "待确认" ? "" : trip.origin,
        to_station: trip.destination === "待确认" ? "" : trip.destination,
        train_date: date
      })
    });
    return response.json();
  };

  let result;
  try {
    result = await tryQuery(queryDate);
  } catch (e) {
    renderRouteInput(trip, "网络不可用，无法查询 12306 车次信息。");
    return;
  }

  const isSuccess = (r) => r && r.success && r.stations && r.stations.length >= 2;

  // 查询失败且允许自动尝试明天（仅调整查询日期，不影响登记日期）
  if (!isSuccess(result) && options.autoTomorrow !== false) {
    const tomorrow = addDays(queryDate, 1);
    statusEl.textContent = `${queryDate} 查询不到，正在自动尝试 ${tomorrow}…`;
    listEl.innerHTML = `<p class="ticket-loading">${escapeHtml(queryDate)} 查询不到，正在自动尝试 ${escapeHtml(tomorrow)}…</p>`;
    try {
      const tomorrowResult = await tryQuery(tomorrow);
      if (isSuccess(tomorrowResult)) {
        heroOverlay.querySelector("#panelDate").value = tomorrow;
        statusEl.textContent = "已自动切换查询日期，正在显示车次信息…";
        dateHintEl.textContent = `提示：${queryDate} 查询不到车次，已自动切换为 ${tomorrow}（仅用于查询，不影响登记的乘车日期 ${trip.date}）。`;
        result = tomorrowResult;
      } else {
        renderRouteInput(trip, result.error || "未查询到该车次信息");
        return;
      }
    } catch (e) {
      renderRouteInput(trip, "网络不可用，无法查询 12306 车次信息。");
      return;
    }
  }

  if (!isSuccess(result)) {
    renderRouteInput(trip, result.error || "无法获取经停站信息");
    return;
  }

  // 查询成功：纯车次号时用首末站填充行程占位，并记住区间（不修改登记日期）
  if (trip.origin === "待确认" || trip.destination === "待确认") {
    trip.origin = result.stations[0].station_name;
    trip.destination = result.stations[result.stations.length - 1].station_name;
    trip.routeUserProvided = true;
    if (!isPendingWorkflowTrip(trip)) persistTrips();
  }
  rememberRoute(trip.title, trip.origin, trip.destination);
  renderStationSelector(trip, result.stations);
}

/** 起讫区间输入表单：车站联想下拉列表（输入即查，点击选择），查询失败时也复用此表单并提示错误。 */
function renderRouteInput(trip, errorMsg = "") {
  const listEl = heroOverlay.querySelector(".station-list");
  const prefillFrom = trip.origin && trip.origin !== "待确认" ? trip.origin : "";
  const prefillTo = trip.destination && trip.destination !== "待确认" ? trip.destination : "";
  listEl.innerHTML = `
    ${errorMsg ? `<p class="ticket-error">${escapeHtml(errorMsg)}</p>` : ""}
    <p class="ticket-sub">${escapeHtml(trip.title)} 需要起讫区间才能定位车次，请输入出发站与到达站（输入时下方出现车站下拉列表）；也可直接填写后保存为手动记录：</p>
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
    <div class="station-date">
      <label class="edit-field"><span>乘车日期</span><input id="manualDate" type="date" value="${escapeHtml(trip.date)}"></label>
      <p class="ticket-sub">可填写历史日期（登记过往行程）。</p>
    </div>
    <div class="edit-actions">
      <button class="primary-button" data-action="go" type="button">查询经停站</button>
      <button class="ghost-button" data-action="save-manual" type="button">直接保存</button>
    </div>
  `;

  const goButton = listEl.querySelector('[data-action="go"]');
  const saveManualButton = listEl.querySelector('[data-action="save-manual"]');
  const hintEl = listEl.querySelector(".ticket-sub");

  // 读取登记日期（可填历史）
  const syncRideDate = () => {
    const manualDate = listEl.querySelector("#manualDate")?.value;
    if (manualDate && manualDate !== trip.date) {
      trip.date = manualDate;
      if (!isPendingWorkflowTrip(trip)) persistTrips();
    }
  };

  goButton.addEventListener("click", async () => {
    const from = listEl.querySelector("#routeFrom").value.trim();
    const to = listEl.querySelector("#routeTo").value.trim();
    if (!from || !to) {
      hintEl.textContent = "请填写出发站和到达站后重试";
      return;
    }
    syncRideDate();
    trip.origin = normalizePlace(from);
    trip.destination = normalizePlace(to);
    trip.routeUserProvided = true;
    if (!isPendingWorkflowTrip(trip)) persistTrips();
    await openStationSelector(trip.id, { autoTomorrow: false });
  });

  // 查不到也允许手动填写保存（不依赖 12306，支持历史日期）
  saveManualButton.addEventListener("click", () => {
    const from = listEl.querySelector("#routeFrom").value.trim();
    const to = listEl.querySelector("#routeTo").value.trim();
    if (!from || !to) {
      hintEl.textContent = "请填写出发站和到达站后重试";
      return;
    }
    syncRideDate();
    trip.origin = normalizePlace(from);
    trip.destination = normalizePlace(to);
    trip.routeUserProvided = true;
    trip.status = "draft";
    // 距离兜底：按起讫站坐标计算
    trip.distanceKm = estimateDistance(trip.origin, trip.destination) || trip.distanceKm;
    trip.notes = `手动登记：${trip.origin} → ${trip.destination}（${trip.date}）。`;
    rememberRoute(trip.title, trip.origin, trip.destination);
    rememberTransportProfile(trip);
    editingTripId = null;
    commitPendingTrip(trip);
    persistTrips();
    render();
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
          const resp = await fetch(apiUrl(`/api/12306/search-stations?query=${encodeURIComponent(query)}&limit=8`));
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
    <div class="station-date">
      <label class="edit-field"><span>乘车日期</span><input id="rideDate" type="date" value="${escapeHtml(trip.date)}"></label>
      <p class="ticket-sub">登记的是乘车当天日期，可填写历史日期（如登记 8 月 2 日的行程）。</p>
    </div>
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

  const rideDate = heroOverlay.querySelector("#rideDate")?.value;
  if (rideDate) trip.date = rideDate;

  const from = stations[fromIndex];
  const to = stations[toIndex];
  trip.origin = from.station_name;
  trip.destination = to.station_name;
  if (from.start_time !== "----") trip.departureTime = from.start_time;
  if (to.arrive_time !== "----") trip.arrivalTime = to.arrive_time;
  trip.status = "completed";
  // 距离兜底：按起讫站坐标计算直线距离（无接口数据时使用）
  trip.distanceKm = estimateDistance(trip.origin, trip.destination) || trip.distanceKm;
  trip.notes = `已通过 12306 确认区间：${from.station_name} → ${to.station_name}。`;
  rememberRoute(trip.title, trip.origin, trip.destination);
  rememberTransportProfile(trip);
  editingTripId = null;
  commitPendingTrip(trip);
  persistTrips();
  render();
}

// ---------- 航班集成：用户手动登记 ----------

/** 登记航班号后：打开纯用户登记面板。 */
function handleFlightCompletion(tripId) {
  const trip = getWorkflowTrip(tripId);
  if (!trip || trip.mode !== "flight") return;
  if (!/^[A-Z0-9]{2}\d{3,4}$/i.test(trip.title)) return;
  openFlightPanel(tripId);
}

/** 在 Hero 卡片内登记航班：航司、航班号、起飞日期、起降地由用户确认。 */
function openFlightPanel(tripId) {
  const trip = getWorkflowTrip(tripId);
  if (!trip) return;
  const airline = trip.operator && trip.operator !== "待补全航司" ? trip.operator : getFlightAirlineFallback(trip.title);

  heroOverlay.innerHTML = `
    <div class="ticket-panel station-panel flight-panel">
      <div class="ticket-panel-head">
        <div>
          <p class="ticket-title">${escapeHtml(trip.title)} 航班登记</p>
          <p class="ticket-sub" id="flightPanelStatus">填写常见航空公司、航班号、起飞日期、起飞地和降落地。</p>
        </div>
        <button class="ghost-button small" data-action="skip" type="button">跳过</button>
      </div>
      <div class="flight-registration-grid">
        <label class="edit-field" for="flightOperator"><span>航司</span>${flightAirlineInput(airline)}</label>
        <label class="edit-field" for="flightQueryNo"><span>航班号</span><input id="flightQueryNo" value="${escapeHtml(trip.title)}" placeholder="HO2274" required></label>
        <label class="edit-field" for="flightQueryDate"><span>起飞日</span><input id="flightQueryDate" type="date" value="${escapeHtml(trip.date)}" required></label>
      </div>
      <div class="station-list"></div>
    </div>
  `;

  // 跳过：保留草稿（航司若已回填则保留），回到行程展示
  heroOverlay.querySelector('[data-action="skip"]').addEventListener("click", () => {
    if (isPendingWorkflowTrip(trip)) {
      cancelPendingTrip();
      return;
    }
    editingTripId = null;
    render();
  });

  heroOverlay.querySelector("#flightQueryNo").addEventListener("input", () => {
    const fallback = getFlightAirlineFallback(heroOverlay.querySelector("#flightQueryNo").value);
    const operatorInput = heroOverlay.querySelector("#flightOperator");
    if (fallback && (!operatorInput.value || operatorInput.value === "待补全航司")) {
      operatorInput.value = fallback;
    }
  });

  heroOverlay.querySelectorAll("#flightOperator, #flightQueryNo, #flightQueryDate").forEach((field) => {
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const listEl = heroOverlay.querySelector(".station-list");
        renderFlightManualForm(trip, listEl);
      }
    });
  });

  renderFlightManualForm(trip);
}

/** 航班手动登记表单：起降地必填，时间可选。 */
function renderFlightManualForm(trip, targetListEl = null) {
  const listEl = targetListEl || heroOverlay.querySelector(".station-list");
  const prefillFrom = trip.routeUserProvided && trip.origin !== "待确认" ? trip.origin : "";
  const prefillTo = trip.routeUserProvided && trip.destination !== "待确认" ? trip.destination : "";
  const depTime = timeInputValue(trip.departureTime);
  const arrTime = timeInputValue(trip.arrivalTime);
  listEl.innerHTML = `
    <p class="ticket-sub">起飞地和降落地是必填项；起飞/到达时间可稍后补充。</p>
    <div class="station-pick">
      <label class="edit-field"><span>起飞地</span>${flightAirportInput("flightFrom", prefillFrom, "如 杭州")}</label>
      <label class="edit-field"><span>降落地</span>${flightAirportInput("flightTo", prefillTo, "如 上海")}</label>
    </div>
    ${flightAirportDatalist()}
    <div class="station-pick">
      <label class="edit-field"><span>起飞</span><input id="flightDepTime" type="time" value="${escapeHtml(depTime)}"></label>
      <label class="edit-field"><span>到达</span><input id="flightArrTime" type="time" value="${escapeHtml(arrTime)}"></label>
    </div>
    <div class="edit-actions">
      <button class="primary-button" data-action="save" type="button">保存</button>
    </div>
  `;

  const hintEl = listEl.querySelector(".ticket-sub");

  listEl.querySelector('[data-action="save"]').addEventListener("click", () => {
    const registration = readFlightRegistrationValues();
    const operator = heroOverlay.querySelector("#flightOperator")?.value.trim();
    const from = listEl.querySelector("#flightFrom").value.trim();
    const to = listEl.querySelector("#flightTo").value.trim();
    if (!operator) {
      hintEl.textContent = "请选择或填写航空公司后再保存。";
      return;
    }
    if (!isValidFlightNumber(registration.flightNo)) {
      hintEl.textContent = "请填写正确的航班号，如 HO2274。";
      return;
    }
    if (!registration.flightDate) {
      hintEl.textContent = "请选择起飞日期后再保存。";
      return;
    }
    if (!from || !to) {
      hintEl.textContent = "请填写起飞地和降落地后再保存。";
      return;
    }
    trip.title = registration.flightNo;
    trip.date = registration.flightDate;
    trip.origin = normalizeFlightPlace(from);
    trip.destination = normalizeFlightPlace(to);
    trip.routeUserProvided = true;
    trip.departureTime = listEl.querySelector("#flightDepTime").value.trim() || "待确认";
    trip.arrivalTime = listEl.querySelector("#flightArrTime").value.trim() || "待确认";
    trip.operator = operator;
    trip.status = trip.departureTime !== "待确认" && trip.arrivalTime !== "待确认" ? "completed" : "draft";
    trip.distanceKm = estimateDistance(trip.origin, trip.destination) || trip.distanceKm;
    trip.notes = `手动登记航班：${trip.origin} → ${trip.destination}（${trip.date}）。`;
    rememberTransportProfile(trip);
    editingTripId = null;
    commitPendingTrip(trip);
    persistTrips();
    render();
  });
}

function readFlightRegistrationValues() {
  return {
    flightNo: normalizeFlightNumber(heroOverlay.querySelector("#flightQueryNo")?.value),
    flightDate: heroOverlay.querySelector("#flightQueryDate")?.value || ""
  };
}

function flightAirlineInput(selected = "") {
  const airlines = [...new Set(Object.values(commonFlightAirlines))];
  const options = airlines.map((airline) => `<option value="${escapeHtml(airline)}"></option>`).join("");
  return `<input id="flightOperator" list="flightAirlineList" value="${escapeHtml(selected || "")}" placeholder="如 吉祥航空" required><datalist id="flightAirlineList">${options}</datalist>`;
}

function flightAirportInput(id, value = "", placeholder = "") {
  return `<input id="${id}" list="flightAirportList" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" required>`;
}

function flightAirportDatalist() {
  const options = commonAirports
    .slice()
    .sort(compareAirportsForPicker)
    .map((airport) => {
      const labelParts = [
        airport.city,
        airport.code,
        airport.usage === "军民合用" ? "军民合用" : ""
      ].filter(Boolean);
      return `<option value="${escapeHtml(airport.name)}" label="${escapeHtml(labelParts.join(" · "))}"></option>`;
    })
    .join("");
  return `<datalist id="flightAirportList">${options}</datalist>`;
}

function compareAirportsForPicker(a, b) {
  if (a.country !== b.country) return a.country === "CN" ? -1 : 1;
  if (a.scheduled !== b.scheduled) return a.scheduled ? -1 : 1;
  const aChinese = /[\u4e00-\u9fa5]/.test(a.name) || /[\u4e00-\u9fa5]/.test(a.city);
  const bChinese = /[\u4e00-\u9fa5]/.test(b.name) || /[\u4e00-\u9fa5]/.test(b.city);
  if (aChinese !== bChinese) return aChinese ? -1 : 1;
  return `${a.city}${a.name}`.localeCompare(`${b.city}${b.name}`, "zh-Hans-CN");
}

function getFlightAirlineFallback(flightNo) {
  return commonFlightAirlines[String(flightNo || "").slice(0, 2).toUpperCase()] || "";
}

function normalizeFlightNumber(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function isValidFlightNumber(value) {
  return /^[A-Z0-9]{2}\d{3,4}$/i.test(value || "");
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
  if (!currentUser) return;
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
  if (!currentUser) return;
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

function getTripStats() {
  const modeCounts = { flight: 0, rail: 0, ship: 0, road: 0 };
  const modeKm = { flight: 0, rail: 0, ship: 0, road: 0 };
  const cities = new Set();
  const routeMap = new Map();
  const monthMap = new Map();
  const datedTrips = [];
  let completedCount = 0;
  let plannedCount = 0;
  let totalKm = 0;
  let weekendTrips = 0;
  let nightTrips = 0;

  trips.forEach((trip) => {
    const mode = modeCounts[trip.mode] === undefined ? "road" : trip.mode;
    const distanceKm = Number(trip.distanceKm) || 0;
    modeCounts[mode] += 1;
    modeKm[mode] += distanceKm;
    totalKm += distanceKm;

    if (trip.status === "completed") completedCount += 1;
    if (trip.status === "planned" || trip.status === "draft") plannedCount += 1;
    if (trip.origin && trip.origin !== "待确认") cities.add(trip.origin);
    if (trip.destination && trip.destination !== "待确认") cities.add(trip.destination);

    const routeKnown = trip.origin && trip.destination && trip.origin !== "待确认" && trip.destination !== "待确认";
    if (routeKnown) {
      const routeKey = `${trip.origin}|${trip.destination}`;
      const route = routeMap.get(routeKey) || {
        origin: trip.origin,
        destination: trip.destination,
        count: 0,
        km: 0,
        modes: new Set()
      };
      route.count += 1;
      route.km += distanceKm;
      route.modes.add(mode);
      routeMap.set(routeKey, route);
    }

    const date = parseTripDate(trip.date);
    if (date) {
      datedTrips.push({ trip, date });
      const monthKey = formatMonthKey(date);
      const month = monthMap.get(monthKey) || { key: monthKey, count: 0, km: 0 };
      month.count += 1;
      month.km += distanceKm;
      monthMap.set(monthKey, month);
      const day = date.getDay();
      if (day === 0 || day === 6) weekendTrips += 1;
    }

    if (isNightDeparture(trip.departureTime)) nightTrips += 1;
  });

  datedTrips.sort((a, b) => a.date - b.date);
  const latestDatedTrips = [...datedTrips].sort((a, b) => b.date - a.date);
  const fallbackRecentTrips = trips.slice(0, 5).map((trip) => ({ trip, date: parseTripDate(trip.date) }));
  const recentTrips = (latestDatedTrips.length ? latestDatedTrips : fallbackRecentTrips).slice(0, 5);
  const longestTrip = trips.reduce((best, trip) => {
    return (Number(trip.distanceKm) || 0) > (Number(best?.distanceKm) || 0) ? trip : best;
  }, null);
  const topRoutes = [...routeMap.values()]
    .map((route) => ({ ...route, modes: [...route.modes] }))
    .sort((a, b) => b.count - a.count || b.km - a.km)
    .slice(0, 5);
  const anchorDate = latestDatedTrips[0]?.date || parseTripDate(localToday()) || new Date();
  const monthly = getRecentMonthStats(monthMap, anchorDate);
  const dominantMode = Object.keys(modeCounts).reduce((best, mode) => {
    if (!best || modeCounts[mode] > modeCounts[best]) return mode;
    return best;
  }, "");

  return {
    totalTrips: trips.length,
    totalKm,
    cityCount: cities.size,
    completedCount,
    plannedCount,
    completedRate: trips.length ? Math.round((completedCount / trips.length) * 100) : 0,
    modeCounts,
    modeKm,
    activeModeCount: Object.values(modeCounts).filter(Boolean).length,
    dominantMode: modeCounts[dominantMode] ? dominantMode : "",
    weekendTrips,
    nightTrips,
    firstDate: datedTrips[0]?.date || null,
    lastDate: datedTrips[datedTrips.length - 1]?.date || null,
    longestTrip,
    topRoutes,
    routeCount: routeMap.size,
    monthly,
    recentTrips
  };
}

function parseTripDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateLabel(date) {
  if (!date) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function getRecentMonthStats(monthMap, anchorDate) {
  const months = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - offset, 1);
    const key = formatMonthKey(date);
    const item = monthMap.get(key) || { key, count: 0, km: 0 };
    months.push({
      ...item,
      label: `${date.getMonth() + 1}月`
    });
  }
  return months;
}

function isNightDeparture(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const hour = Number(match[1]);
  return hour >= 22 || hour < 6;
}

function renderStats(stats = getTripStats()) {
  statsLine.innerHTML =
    `${stats.totalTrips} 条 · <strong>${formatNumber(stats.totalKm)} km</strong> · ${stats.cityCount} 城 · 飞 ${stats.modeCounts.flight} · 铁 ${stats.modeCounts.rail} · 轮 ${stats.modeCounts.ship}`;
}

function renderDashboard(stats = getTripStats()) {
  if (!dashboardMetricGrid) return;

  dashboardRange.textContent = stats.totalTrips
    ? `${formatDateLabel(stats.firstDate)} - ${formatDateLabel(stats.lastDate)}`
    : "暂无行程数据";
  dashboardSummary.textContent = `${formatNumber(stats.totalKm)} km`;

  const averageKm = stats.totalTrips ? Math.round(stats.totalKm / stats.totalTrips) : 0;
  dashboardMetricGrid.innerHTML = [
    metricCard("行程数", formatNumber(stats.totalTrips), `${stats.completedRate}% 已完成`),
    metricCard("累计里程", `${formatNumber(stats.totalKm)} km`, `单次均值 ${formatNumber(averageKm)} km`),
    metricCard("点亮城市", formatNumber(stats.cityCount), `${stats.routeCount} 条路线`),
    metricCard("待确认", formatNumber(stats.plannedCount), stats.longestTrip ? `最长 ${formatNumber(stats.longestTrip.distanceKm || 0)} km` : "暂无最长行程")
  ].join("");

  renderModeBreakdown(stats);
  renderMonthlyTimeline(stats);
  renderTopRoutes(stats);
  renderRecentHighlights(stats);
}

function metricCard(label, value, meta) {
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(meta)}</small>
    </article>
  `;
}

function renderModeBreakdown(stats) {
  const modes = ["flight", "rail", "ship", "road"];
  const maxCount = Math.max(...modes.map((mode) => stats.modeCounts[mode]), 1);
  modeDominant.textContent = stats.dominantMode ? `${modeLabel(stats.dominantMode)}最多` : "暂无";
  modeBreakdown.innerHTML = modes
    .map((mode) => {
      const count = stats.modeCounts[mode];
      const percent = Math.round((count / maxCount) * 100);
      return `
        <div class="mode-row">
          <span class="mode-name"><i class="mode-dot ${mode}"></i>${modeLabel(mode)}</span>
          <div class="mode-bar" aria-hidden="true"><i style="width: ${percent}%"></i></div>
          <strong>${count}</strong>
        </div>
      `;
    })
    .join("");
}

function renderMonthlyTimeline(stats) {
  const maxKm = Math.max(...stats.monthly.map((item) => item.km), 1);
  monthlyTimeline.innerHTML = stats.monthly
    .map((item) => {
      const percent = item.km ? Math.max(8, Math.round((item.km / maxKm) * 100)) : 0;
      return `
        <div class="timeline-item">
          <div class="timeline-track"><i style="height: ${percent}%"></i></div>
          <strong>${formatNumber(item.count)}</strong>
          <span>${escapeHtml(item.label)}</span>
          <small>${formatNumber(item.km)} km</small>
        </div>
      `;
    })
    .join("");
}

function renderTopRoutes(stats) {
  routeCountLabel.textContent = `${stats.routeCount} 条`;
  if (!stats.topRoutes.length) {
    topRoutesList.innerHTML = `<p class="empty-copy">暂无路线</p>`;
    return;
  }

  topRoutesList.innerHTML = stats.topRoutes
    .map((route, index) => `
      <article class="rank-item">
        <span class="rank-no">${index + 1}</span>
        <div>
          <strong>${escapeHtml(route.origin)} → ${escapeHtml(route.destination)}</strong>
          <small>${escapeHtml(route.modes.map(modeLabel).join(" / "))}</small>
        </div>
        <span>${route.count} 次 · ${formatNumber(route.km)} km</span>
      </article>
    `)
    .join("");
}

function renderRecentHighlights(stats) {
  recentCountLabel.textContent = `${stats.recentTrips.length} 条`;
  if (!stats.recentTrips.length) {
    recentHighlights.innerHTML = `<p class="empty-copy">暂无动态</p>`;
    return;
  }

  recentHighlights.innerHTML = stats.recentTrips
    .map(({ trip, date }) => `
      <article class="rank-item">
        <span class="rank-no ${trip.mode}">${modeLabel(trip.mode).slice(0, 1)}</span>
        <div>
          <strong>${escapeHtml(trip.origin)} → ${escapeHtml(trip.destination)}</strong>
          <small>${escapeHtml(trip.title)} · ${escapeHtml(statusLabel(trip.status))}</small>
        </div>
        <span>${escapeHtml(date ? formatDateLabel(date) : trip.date)} · ${formatNumber(trip.distanceKm || 0)} km</span>
      </article>
    `)
    .join("");
}

function renderAchievements(stats = getTripStats()) {
  if (!achievementGrid) return;

  const achievements = evaluateAchievements(stats);
  const unlocked = achievements.filter((item) => item.unlocked);
  const next = achievements.find((item) => !item.unlocked);
  const overallPercent = achievements.length ? Math.round((unlocked.length / achievements.length) * 100) : 0;

  achievementSummary.textContent = `${unlocked.length} / ${achievements.length} 已解锁`;
  achievementLevel.textContent = `Lv. ${Math.floor(unlocked.length / 2)}`;
  achievementProgress.innerHTML = `
    <div class="progress-copy">
      <strong>${overallPercent}%</strong>
      <span>${next ? `下一项：${next.title}` : "全部成就已解锁"}</span>
    </div>
    <div class="progress-meter" aria-hidden="true"><i style="width: ${overallPercent}%"></i></div>
  `;

  achievementGrid.innerHTML = achievements
    .map((item) => {
      const percent = Math.round(item.progress * 100);
      return `
        <article class="achievement-card ${item.unlocked ? "unlocked" : "locked"}">
          <div class="achievement-mark">${escapeHtml(item.mark)}</div>
          <div class="achievement-body">
            <div class="achievement-title">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${item.unlocked ? "已解锁" : `${formatNumber(item.value)} / ${formatNumber(item.target)}`}</span>
            </div>
            <p>${escapeHtml(item.detail)}</p>
            <div class="mini-meter" aria-hidden="true"><i style="width: ${percent}%"></i></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function evaluateAchievements(stats) {
  return achievementDefinitions.map((definition) => {
    const value = Math.max(0, Number(definition.getValue(stats)) || 0);
    const progress = definition.target ? Math.min(1, value / definition.target) : 0;
    return {
      ...definition,
      value,
      progress,
      unlocked: progress >= 1
    };
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function modeLabel(mode) {
  return {
    flight: "航班",
    rail: "铁路",
    ship: "轮船",
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
