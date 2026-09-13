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
  "8L": "祥鹏航空",
  CX: "国泰航空",
  HX: "香港航空",
  UO: "香港快运航空",
  BR: "长荣航空",
  CI: "中华航空",
  JX: "星宇航空",
  NH: "全日空航空",
  JL: "日本航空",
  KE: "大韩航空",
  OZ: "韩亚航空",
  SQ: "新加坡航空",
  TR: "酷航",
  MH: "马来西亚航空",
  AK: "亚洲航空",
  D7: "亚洲航空长途",
  FD: "泰国亚洲航空",
  QZ: "印尼亚洲航空",
  Z2: "菲律宾亚洲航空",
  OD: "马印航空",
  TG: "泰国国际航空",
  VN: "越南航空",
  VJ: "越捷航空",
  PR: "菲律宾航空",
  "5J": "宿务太平洋航空",
  GA: "印尼鹰航",
  QF: "澳洲航空",
  NZ: "新西兰航空",
  EK: "阿联酋航空",
  EY: "阿提哈德航空",
  QR: "卡塔尔航空",
  TK: "土耳其航空",
  BA: "英国航空",
  LH: "汉莎航空",
  AF: "法国航空",
  KL: "荷兰皇家航空",
  LX: "瑞士国际航空",
  OS: "奥地利航空",
  AY: "芬兰航空",
  SK: "北欧航空",
  AZ: "意大利航空",
  IB: "伊比利亚航空",
  LO: "波兰航空",
  UA: "美国联合航空",
  AA: "美国航空",
  DL: "达美航空",
  AC: "加拿大航空",
  AM: "墨西哥航空",
  LA: "南美航空",
  ET: "埃塞俄比亚航空",
  MS: "埃及航空"
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
  "上海松江": { lat: 31.0360, lng: 121.2276 },
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
  "苏州园区": { lat: 31.3420, lng: 120.7060 },
  "常州": { lat: 31.8107, lng: 119.9741 },
  "常州北": { lat: 31.8620, lng: 119.9800 },
  "徐州": { lat: 34.2044, lng: 117.2857 },
  "徐州东": { lat: 34.2830, lng: 117.3100 },
  "宁波": { lat: 29.8683, lng: 121.5440 },
  "温州": { lat: 27.9938, lng: 120.6994 },
  "温州南": { lat: 27.9900, lng: 120.6600 },
  "瑞安": { lat: 27.7780, lng: 120.6250 },
  "苍南": { lat: 27.5180, lng: 120.4260 },
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
  "青岛西": { lat: 35.9660, lng: 120.1700 },
  "桂林": { lat: 25.2736, lng: 110.2900 },
  "桂林两江": { lat: 25.2181, lng: 110.0392 },
  "桂林西": { lat: 25.3250, lng: 110.2630 },
  "阳朔": { lat: 24.7780, lng: 110.4960 },
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
  "神州": { lat: 18.6750, lng: 110.3320 },
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

const railStationData = Array.isArray(window.LEAVES_RAIL_STATIONS) ? window.LEAVES_RAIL_STATIONS : [];
const commonRailStations = railStationData.map(normalizeRailStationRecord).filter(Boolean);
const railStationAliasMap = commonRailStations.reduce((map, station) => {
  railStationAliases(station).forEach((alias) => {
    if (!alias) return;
    if (!map.has(alias)) map.set(alias, station);
    const withoutStationSuffix = alias.replace(/站$/, "");
    if (withoutStationSuffix && withoutStationSuffix !== alias && !map.has(withoutStationSuffix)) {
      map.set(withoutStationSuffix, station);
    }
    const lowercaseAlias = alias.toLowerCase();
    if (/^[a-z0-9 .,'()&-]+$/i.test(alias) && !map.has(lowercaseAlias)) {
      map.set(lowercaseAlias, station);
    }
  });
  return map;
}, new Map());

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
const airportPickerInitialLimit = 40;
const airportPickerSearchLimit = 60;
const popularAirportCodes = new Set([
  "PEK", "PKX", "SHA", "PVG", "CAN", "SZX", "HGH", "XMN", "CTU", "TFU",
  "XIY", "NKG", "WUH", "CKG", "KMG", "TAO", "SIN", "KUL", "BKI", "BKK",
  "DMK", "HKT", "SGN", "HAN", "DAD", "CGK", "DPS", "MNL", "CEB", "PNH",
  "LHR", "LGW", "CDG", "ORY", "FRA", "MUC", "AMS", "MAD", "BCN", "FCO",
  "MXP", "ZRH", "VIE", "CPH", "IST", "DXB", "DOH", "AUH", "JFK", "LAX",
  "SFO", "ORD", "YYZ", "YVR", "SYD", "MEL", "AKL"
]);

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

function normalizeRailStationRecord(record) {
  const source = Array.isArray(record)
    ? { country: record[0], name: record[1], lng: record[2], lat: record[3], aliases: record[4] }
    : record;
  const name = String(source?.name || "").trim();
  const lat = Number(source?.lat);
  const lng = Number(source?.lng);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    country: String(source.country || "").trim(),
    name,
    lat,
    lng,
    aliases: Array.isArray(source.aliases) ? source.aliases.filter(Boolean) : []
  };
}

function railStationAliases(station) {
  return [...new Set([
    station.name,
    `${station.name}站`,
    ...station.aliases
  ].filter(Boolean))];
}

function railStationCoordinate(station) {
  return { lat: station.lat, lng: station.lng };
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

function resolveRailStationAlias(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  return railStationAliasMap.get(trimmed) ||
    railStationAliasMap.get(trimmed.replace(/站$/, "")) ||
    railStationAliasMap.get(trimmed.toLowerCase()) ||
    null;
}

/** 地名 → 坐标：铁路路线优先车站坐标；普通路线保留城市/机场优先，并用车站坐标兜底。 */
function resolvePlace(name, options = {}) {
  if (!name) return null;
  const rawName = String(name).trim();
  const railStation = resolveRailStationAlias(rawName);
  if (options.preferRail && railStation) return railStationCoordinate(railStation);
  if (places[rawName]) return places[rawName];
  if (railStation) return railStationCoordinate(railStation);
  const airport = airportAliasMap.get(rawName);
  if (airport && places[airport.place]) return places[airport.place];
  const candidates = [
    rawName.replace(/站$/, ""),
    rawName.replace(/(南|北|东|西|虹桥|机场)$/, ""),
    rawName.replace(/(南|北|东|西|虹桥|机场)站$/, "")
  ];
  for (const candidate of candidates) {
    if (!candidate || candidate === rawName) continue;
    const candidateRailStation = resolveRailStationAlias(candidate);
    if (options.preferRail && candidateRailStation) return railStationCoordinate(candidateRailStation);
    if (places[candidate]) {
      return places[candidate];
    }
    if (candidateRailStation) return railStationCoordinate(candidateRailStation);
  }
  return null;
}

function normalizeRailRouteStations(stations, fromIndex = 0, toIndex = (stations?.length || 0) - 1) {
  if (!Array.isArray(stations) || stations.length < 2) return [];
  const rawStart = Number(fromIndex);
  const rawEnd = Number(toIndex);
  const start = Math.max(0, Math.min(Number.isFinite(rawStart) ? rawStart : 0, stations.length - 1));
  const end = Math.max(start, Math.min(Number.isFinite(rawEnd) ? rawEnd : stations.length - 1, stations.length - 1));

  return stations
    .slice(start, end + 1)
    .map((station, index) => ({
      station_no: station.station_no || station.stationNo || "",
      station_name: station.station_name || station.stationName || station.name || "",
      arrive_time: station.arrive_time || station.arriveTime || "----",
      start_time: station.start_time || station.startTime || "----",
      stopover_time: station.stopover_time || station.stopoverTime || "",
      sequence: index + 1
    }))
    .filter((station) => station.station_name);
}

function cloneRouteStations(stations) {
  return normalizeRailRouteStations(stations);
}

function routeStationsMatchTrip(trip) {
  const stations = cloneRouteStations(trip?.routeStations);
  if (stations.length < 2) return false;
  return stations[0].station_name === trip.origin && stations[stations.length - 1].station_name === trip.destination;
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
let focusedMapTripId = null;
let currentView = "home";
let tripStore = null;
let editorTrip = null;
let editorIsNew = true;
let savedDraft = null;
let editorInitial = "";
let queryGeneration = 0;
let importProposal = null;
let showAllAchievements = false;
const editorDialog = document.querySelector("#tripEditor");
const editorContent = document.querySelector("#editorContent");
const draftStorageKey = "leaves.prototype.editor";
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
const importCsvButtons = document.querySelectorAll(".import-csv");
const importJsonFile = document.querySelector("#importJsonFile");
const importCsvFile = document.querySelector("#importCsvFile");
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

  if (savedDraft) {
    notifyUser("已恢复未完成的登记；保存或取消后可登记下一条。");
    resumeEditor();
    return;
  }
  const draft = createTripDraft(rawText, extractTripDate(rawText) || dateInput.value, resolvedMode);
  input.value = "";
  modeSelect.value = "auto";
  switchView("home", { skipRender: true });
  renderQuickTripPreview(draft);
});

exportButtons.forEach((button) => button.addEventListener("click", () => {
  exportTrips();
}));

importButtons.forEach((button) => button.addEventListener("click", () => {
  openImportFilePicker(importJsonFile, "JSON");
}));

importCsvButtons.forEach((button) => button.addEventListener("click", () => {
  openImportFilePicker(importCsvFile, "CSV");
}));

importJsonFile?.addEventListener("change", () => {
  importTrips(importJsonFile.files[0]);
  importJsonFile.value = "";
});

importCsvFile?.addEventListener("change", () => {
  importRailTripsFromCsv(importCsvFile.files[0]);
  importCsvFile.value = "";
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchView(button.dataset.view);
  });
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    setFilter(button.dataset.filter);
  });
});

setupWorkspaceInteractions();
setAuthMode("login");
checkExistingSession();

function switchView(view, options = {}) {
  currentView = ["home", "dashboard", "achievements"].includes(view) ? view : "home";

  viewButtons.forEach((button) => {
    const active = button.dataset.view === currentView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });

  appViews.forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== currentView;
  });

  appShell.dataset.view = currentView;
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
    button.setAttribute("aria-selected", String(button.dataset.authMode === authMode));
    button.tabIndex = button.dataset.authMode === authMode ? 0 : -1;
  });
  authTitle.textContent = authMode === "register" ? "注册 Leaves" : "登录 Leaves";
  authForm.setAttribute("aria-labelledby", authMode === "register" ? "registerTab" : "loginTab");
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
    setAuthMessage("无法连接服务，请确认 Leaves 已启动，然后重试。", "error");
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
  tripStore?.destroy();
  editorTrip = null;
  savedDraft = readLocalJson(scopedStorageKey(draftStorageKey), null);
  tripStore = new LeavesTripStore({
    storage: localStorage,
    key: scopedStorageKey(storageKey),
    request: (options) => apiFetch("/api/data/trips", options),
    onChange: (records) => {
      if (currentUser?.id !== user.id) return;
      trips = records;
      render();
    },
    onStatus: (state, message) => {
      if (currentUser?.id !== user.id) return;
      document.querySelector("#saveStatus").textContent = message;
      document.querySelector("#saveStatus").dataset.state = state;
      document.querySelector("#retrySave").hidden = state !== "error";
      if (state === "expired") handleAuthExpired();
    }
  });
  updateDraftButton();
  currentUserName.textContent = user.username;
  authGate.hidden = true;
  appShell.hidden = false;
  authPassword.value = "";
  authPasswordConfirm.value = "";

  activeFilter = "all";
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === "all");
    button.setAttribute("aria-pressed", String(button.dataset.filter === "all"));
  });

  switchView("home", { skipRender: true });
  trips = tripStore.trips;
  selectedTripId = trips[0]?.id || null;

  render();
  scheduleMapInit();
  syncTripsFromServer();
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 0);
}

async function logout() {
  pauseTripEditor();
  tripStore?.destroy();
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  document.querySelector("#moreMenu").open = false;
  savedDraft = null;
  editorTrip = null;
  importProposal = null;
  notifyUser("");
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    /* 本地仍退出 */
  }

  currentUser = null;
  trips = [];
  selectedTripId = null;
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
  pauseTripEditor();
  tripStore?.destroy();
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  editorTrip = null;
  savedDraft = null;
  importProposal = null;
  currentUser = null;
  appShell.hidden = true;
  authGate.hidden = false;
  setAuthMode("login");
  setAuthMessage("登录已过期，未同步修改已保留在此设备，请重新登录。", "error");
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

function readLocalJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
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

function syncTripsFromServer() {
  return tripStore?.flush();
}

function persistTrips() {
  if (!currentUser) return;
  return tripStore.save(trips);
}

function persistTripsToServer() {
  return tripStore?.flush();
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
  const distanceOptions = distanceOptionsForMode(mode);

  return {
    id: `trip-${crypto.randomUUID()}`,
    mode,
    title: serviceNumber || rawText,
    operator: reusable?.operator || defaultOperatorForMode(mode, serviceNumber),
    origin: reusedRoute ? reusable.origin : route.origin,
    destination: reusedRoute ? reusable.destination : route.destination,
    routeUserProvided: route.userProvided || Boolean(reusedRoute),
    date,
    departureTime: times.departureTime || (reusedTimes && reusable.departureTime) || "待确认",
    arrivalTime: times.arrivalTime || (reusedTimes && reusable.arrivalTime) || "待确认",
    distanceKm: reusedRoute ? reusable.distanceKm || estimateDistance(reusable.origin, reusable.destination, distanceOptions) : estimateDistance(route.origin, route.destination, distanceOptions),
    routeStations: reusedRoute ? cloneRouteStations(reusable.routeStations) : undefined,
    status: defaultTripStatus(date),
    distanceSource: "estimated",
    routeSource: reusedRoute ? "history" : route.userProvided ? "manual" : "unknown",
    notes: ""
  };
}

function getWorkflowTrip(tripId) {
  if (editorTrip?.id === tripId) return editorTrip;
  return trips.find((item) => item.id === tripId);
}

function resolveInputMode(rawText, selectedMode) {
  if (selectedMode !== "auto") return selectedMode;
  const analysis = analyzeTransportCode(rawText);
  if (analysis.ambiguous || analysis.mode === "unknown") {
    notifyUser("请选择交通方式后继续登记。");
    modeSelect.focus();
    return null;
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
  if (mode === "flight") return { origin: "", destination: "", userProvided: false };
  if (mode === "rail") return { origin: "待确认", destination: "待确认", userProvided: false };
  if (mode === "ship") return { origin: "待确认", destination: "待确认", userProvided: false };
  return { origin: "", destination: "", userProvided: false };
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
  const railStationAlias = resolveRailStationAlias(trimmed);
  if (railStationAlias) return railStationAlias.name;
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

function distanceOptionsForMode(mode) {
  return { preferRail: mode === "rail" };
}

function estimateDistance(origin, destination, options = {}) {
  const from = resolvePlace(origin, options);
  const to = resolvePlace(destination, options);
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
    selectedTripId = visibleTrips[0]?.id || null;
  }

  renderTripStrip(visibleTrips);
  renderHero();
  if (currentView === "home") renderMap(visibleTrips);
  renderStats(stats);
  renderDashboard(stats);
  renderAchievements(stats);
  if (document.querySelector("#recordsDialog").open) renderRecords();
}

function getVisibleTrips() {
  return trips.filter((trip) => activeFilter === "all" || trip.mode === activeFilter);
}

function renderTripStrip(visibleTrips) {
  tripStrip.innerHTML = "";

  if (!visibleTrips.length) {
    const empty = document.createElement("p");
    empty.className = "trip-meta";
    empty.textContent = activeFilter === "all" ? "登记第一条行程，开始记录旅途。" : `暂无${modeLabel(activeFilter)}记录，可切换“全部”。`;
    tripStrip.appendChild(empty);
    return;
  }

  const recent = visibleTrips.slice(0, 20);
  const selected = visibleTrips.find((trip) => trip.id === selectedTripId);
  if (selected && !recent.includes(selected)) recent.splice(19, 1, selected);
  recent.forEach((trip) => {
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
        <span>${escapeHtml(trip.date)} · ${distanceLabel(trip)}</span>
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

  const focusedTripVisible = focusedMapTripId && visibleTrips.some((trip) => trip.id === focusedMapTripId);
  if (focusedMapTripId && !focusedTripVisible) focusedMapTripId = null;
  const mapTrips = focusedMapTripId ? visibleTrips.filter((trip) => trip.id === focusedMapTripId) : visibleTrips;

  mapTrips.forEach((trip) => {
    const points = getRoutePoints(trip);
    if (points.length < 2) return;

    const isActive = trip.id === selectedTripId;
    const route = L.polyline(points, {
      color: modeColors[trip.mode] || "#536268",
      weight: trip.mode === "flight" ? (isActive ? 8 : 6) : (isActive ? 7 : 5),
      opacity: isActive ? 0.95 : 0.24,
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

      marker.bindTooltip(label, { permanent: isActive, direction: "top", offset: [0, -8] });
      marker.on("click", () => selectTrip(trip.id, { focusMap: true }));
      return marker;
    });

    const railStationPoints = getRailRouteStationPoints(trip);
    if (trip.mode === "rail" && isActive && railStationPoints.length > 2) {
      railStationPoints.slice(1, -1).forEach(({ station, point }) => {
        const marker = L.circleMarker(point, {
          radius: 4,
          color: "#ffffff",
          weight: 2,
          fillColor: modeColors.rail,
          fillOpacity: 0.9,
          className: "trip-marker rail-stop-marker"
        }).addTo(markerLayer);
        marker.bindTooltip(station.station_name, { direction: "top", offset: [0, -6] });
        marker.on("click", () => selectTrip(trip.id, { focusMap: true }));
        endpointMarkers.push(marker);
      });
    }

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
  const routePointOptions = distanceOptionsForMode(trip.mode);
  const railStationPoints = getRailRouteStationPoints(trip);
  if (railStationPoints.length >= 2) {
    return railStationPoints.map(({ point }) => point);
  }

  const routeKey = `${trip.mode}:${trip.origin}:${trip.destination}`;
  const routeNames = knownRoutes[routeKey];

  if (routeNames) {
    return routeNames.map((name) => resolvePlace(name, routePointOptions)).filter(Boolean);
  }

  const from = resolvePlace(trip.origin, routePointOptions);
  const to = resolvePlace(trip.destination, routePointOptions);
  if (!from || !to) return [];

  // 航班/轮船用弧线表达；铁路/道路用弯曲线
  if (trip.mode === "flight" || trip.mode === "ship") return createFlightArc(from, to);
  if (trip.mode === "rail") return createBentGroundRoute(from, to, 0.18);
  return createBentGroundRoute(from, to, -0.12);
}

function getRailRouteStationPoints(trip) {
  if (trip?.mode !== "rail") return [];
  return cloneRouteStations(trip.routeStations)
    .map((station) => ({ station, point: resolvePlace(station.station_name, distanceOptionsForMode("rail")) }))
    .filter(({ point }) => Boolean(point));
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
    ...mapContentPadding(),
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
    ...mapContentPadding(),
    maxZoom: 8
  });
}

function mapContentPadding() {
  const height = document.querySelector("#heroCard").clientHeight;
  const caption = heroOverlay.querySelector(".hero-description")?.offsetHeight || 90;
  return { paddingTopLeft: [48, 88], paddingBottomRight: [40, Math.min(caption + 22, height * 0.43)], animate: false };
}

function selectTrip(tripId, options = {}) {
  selectedTripId = tripId;
  if (focusedMapTripId) focusedMapTripId = tripId;
  renderTripStrip(getVisibleTrips());
  renderHero();
  renderMap(getVisibleTrips());

  if (options.focusMap) {
    fitMapToTrip(tripId);
  }
}

function focusMapOnTrip(tripId) {
  focusedMapTripId = tripId;
  renderHero();
  renderMap(getVisibleTrips());
  fitMapToTrip(tripId);
}

function showAllTripsOnMap() {
  focusedMapTripId = null;
  renderHero();
  renderMap(getVisibleTrips());
  fitMapToVisibleTrips();
}

function renderHero() {
  const trip = trips.find((item) => item.id === selectedTripId);
  if (!trip) {
    heroOverlay.innerHTML = `<div class="empty-hero"><h2>${activeFilter === "all" ? "从一段旅途开始" : `暂无${modeLabel(activeFilter)}记录`}</h2>
      <p>${activeFilter === "all" ? "填入车次、航班号或路线，保存你的第一条行程。" : "切换筛选查看其他旅途，或登记新的行程。"}</p>
      <div class="empty-actions"><button class="primary-button" data-example="rail">登记铁路</button><button class="ghost-button" data-example="flight">登记航班</button>${activeFilter !== "all" ? '<button class="ghost-button" data-show-all>查看全部</button>' : ""}</div></div>`;
    heroOverlay.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => {
      modeSelect.value = button.dataset.example;
      input.placeholder = button.dataset.example === "rail" ? "如 G1234 或 上海虹桥 到 杭州东" : "如 CA1234，起降地由你填写";
      input.focus();
    }));
    heroOverlay.querySelector("[data-show-all]")?.addEventListener("click", () => setFilter("all"));
    return;
  }
  heroOverlay.innerHTML = `
    <div class="hero-topline">
      <span class="mode-badge ${trip.mode}"><i class="mode-dot"></i>${modeLabel(trip.mode)} · ${escapeHtml(statusLabel(trip.status))}</span>
      <div class="hero-actions">
        <button class="ghost-button small" data-action="edit" type="button">编辑</button>
        <details class="trip-more"><summary aria-label="更多行程操作">···</summary><button class="danger-button" data-action="delete" type="button">删除行程</button></details>
      </div>
    </div>
    <div class="hero-description">
      <p class="hero-route">${escapeHtml(shortPlace(trip.origin))}<span class="arrow">→</span>${escapeHtml(shortPlace(trip.destination))}</p>
      <div class="hero-meta"><span><strong>${escapeHtml(trip.title)}</strong></span><span>${escapeHtml(trip.date)}</span>
        <span>${timeInputValue(trip.departureTime) || "时间未填"}${timeInputValue(trip.arrivalTime) ? ` – ${escapeHtml(trip.arrivalTime)}` : ""}</span><span>${distanceLabel(trip)}</span></div>
      <div class="map-caption"><span>${focusedMapTripId === trip.id ? "仅显示当前行程" : (trip.routeStations?.length ? "按经停站连线" : "路线示意")} · ${trip.distanceSource === "manual" ? "里程由用户填写" : "里程含估算或未确认值"}</span><button data-action="locate" type="button">定位当前</button><button data-action="overview" type="button">查看全部</button></div>
    </div>`;
  heroOverlay.querySelector('[data-action="edit"]').addEventListener("click", () => openTripEditor(trip, false));
  heroOverlay.querySelector('[data-action="delete"]').addEventListener("click", () => deleteTrip(trip.id));
  heroOverlay.querySelector('[data-action="locate"]').addEventListener("click", () => focusMapOnTrip(trip.id));
  heroOverlay.querySelector('[data-action="overview"]').addEventListener("click", showAllTripsOnMap);
}

function renderQuickTripPreview(trip) { openTripEditor(trip, true); }

function defaultTripStatus(date) { return date > localToday() ? "planned" : "completed"; }
function knownPlace(value) { return value && value !== "待确认" ? value : ""; }
function shortPlace(value) { return String(value || "待补充").replace(/(?:国际)?机场$/, ""); }
function distanceLabel(trip) {
  const distance = Number(trip.distanceKm);
  if (!Number.isFinite(distance) || distance < 0 || (!distance && trip.distanceSource !== "manual")) return "里程待补充";
  return `${trip.distanceSource === "manual" ? "" : "约 "}${formatNumber(distance)} km`;
}
function notifyUser(message) {
  const notice = document.querySelector("#appNotice");
  notice.textContent = message;
  notice.hidden = !message;
}
function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
    button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  });
  render();
}
function updateDraftButton() {
  document.querySelector("#resumeDraft").hidden = !savedDraft;
  document.querySelector("#resumeDraft").textContent = savedDraft?.isNew === false ? "继续未完成的编辑" : "继续未完成的登记";
}
function cacheEditor() {
  if (!currentUser || !editorTrip) return;
  savedDraft = { trip: editorTrip, isNew: editorIsNew };
  try { localStorage.setItem(scopedStorageKey(draftStorageKey), JSON.stringify(savedDraft)); }
  catch { notifyUser("草稿暂时无法保存在此设备，请尽快保存或导出。"); }
  updateDraftButton();
}
function openTripEditor(trip, isNew) {
  if (savedDraft && savedDraft.trip.id !== trip.id) {
    notifyUser("请先完成或取消尚未保存的编辑。");
    resumeEditor();
    return;
  }
  editorTrip = JSON.parse(JSON.stringify(trip));
  editorIsNew = isNew;
  if (!isNew && !trips.some((item) => item.id === trip.id)) {
    editorIsNew = true;
    editorTrip.id = `trip-${crypto.randomUUID()}`;
    notifyUser("原记录已不在当前列表；继续填写后将保存为新记录。");
  }
  editorInitial = JSON.stringify(editorTrip);
  editorTrip.origin = knownPlace(editorTrip.origin);
  editorTrip.destination = knownPlace(editorTrip.destination);
  if (!["planned", "completed", "cancelled"].includes(editorTrip.status)) editorTrip.status = defaultTripStatus(editorTrip.date);
  renderTripEditor();
  cacheEditor();
  if (!editorDialog.open) editorDialog.showModal();
  requestAnimationFrame(() => (editorContent.querySelector('#previewOrigin:not([value]), #previewOrigin[value=""]') || editorContent.querySelector("#previewTitle"))?.focus());
}
function resumeEditor() {
  if (savedDraft?.trip) openTripEditor(savedDraft.trip, savedDraft.isNew);
}
function pauseTripEditor() {
  if (!editorDialog.open) return;
  syncEditorFields();
  cacheEditor();
  queryGeneration += 1;
  editorDialog.close();
  editorTrip = null;
}
function discardEditor() {
  if (editorTrip && JSON.stringify(editorTrip) !== editorInitial && !window.confirm("放弃这次尚未保存的编辑？")) return;
  clearEditor();
  render();
}
function clearEditor() {
  queryGeneration += 1;
  if (currentUser) localStorage.removeItem(scopedStorageKey(draftStorageKey));
  savedDraft = null;
  editorTrip = null;
  editorDialog.close();
  updateDraftButton();
}
function renderTripEditor() {
  const trip = editorTrip;
  queryGeneration += 1;
  document.querySelector("#editorTitle").textContent = `${editorIsNew ? "登记" : "编辑"}${modeLabel(trip.mode)}`;
  const flight = trip.mode === "flight";
  const airport = (id, value) => flightAirportInput(id, knownPlace(value), "城市、机场名或三字码");
  editorContent.innerHTML = `<form id="tripEditForm" class="unified-form" novalidate>
    <div class="editor-fields">
      <p class="form-intro">${flight ? "起降地由你填写，时间可以稍后补充。" : "填写路线即可保存，时间和备注选填。"}</p>
      ${trip.routeSource === "history" ? '<p class="source-hint">起终点与时间沿用上次记录，请确认。<button id="clearReused" type="button">清空沿用信息</button></p>' : ""}
      ${trip.routeQueryDate ? `<p class="source-hint">站点与时间参考 ${escapeHtml(trip.routeQueryDate)} 的车次信息，请核对乘车当天情况。</p>` : ""}
      ${editField("previewMode", "方式", modeSelectOptions(trip.mode, "previewMode"))}
      ${editField("previewTitle", flight ? "航班号 *" : "车次 / 名称 *", `<input id="previewTitle" value="${escapeHtml(trip.title || "")}" required>`)}
      ${editField("previewDate", flight ? "起飞日期 *" : "出发日期 *", `<input id="previewDate" type="date" value="${escapeHtml(trip.date || localToday())}" required>`)}
      ${editField("previewOrigin", flight ? "起飞地 *" : "出发地 *", flight ? airport("previewOrigin", trip.origin) : `<input id="previewOrigin" value="${escapeHtml(knownPlace(trip.origin))}" placeholder="如 上海虹桥" required>`)}
      ${editField("previewDestination", flight ? "降落地 *" : "目的地 *", flight ? airport("previewDestination", trip.destination) : `<input id="previewDestination" value="${escapeHtml(knownPlace(trip.destination))}" placeholder="如 杭州东" required>`)}
      ${flight ? flightAirportDatalist() + editField("previewOperator", "航空公司 *", flightAirlineInput(trip.operator).replace('id="flightOperator"', 'id="previewOperator"')) : ""}
      ${editField("previewStatus", "行程状态", statusSelectOptions(trip.status, "previewStatus"))}
      <details id="editorExtra"><summary>更多信息 · 时间、里程与备注（选填）</summary>
        ${editField("previewDeparture", "出发时间", `<input id="previewDeparture" type="time" value="${escapeHtml(timeInputValue(trip.departureTime))}">`)}
        ${editField("previewArrival", "到达时间", `<input id="previewArrival" type="time" value="${escapeHtml(timeInputValue(trip.arrivalTime))}">`)}
        ${!flight ? editField("previewOperator", "运营方", `<input id="previewOperator" value="${escapeHtml(trip.operator || "")}">`) : ""}
        ${editField("previewDistance", "里程 km", `<input id="previewDistance" type="number" min="0" step="0.1" placeholder="留空则估算" data-source="${escapeHtml(trip.distanceSource || "unknown")}" data-original="${Number(trip.distanceKm) || 0}" value="${trip.distanceSource === "manual" || (trip.distanceSource !== "estimated" && Number(trip.distanceKm) > 0) ? Number(trip.distanceKm) || 0 : ""}">`)}
        ${!trip.distanceSource && Number(trip.distanceKm) > 0 ? '<p class="form-intro">原有里程的来源未确认；修改数值后将标记为手动填写。</p>' : ""}
        ${editField("previewNotes", "备注", `<textarea id="previewNotes" rows="3">${escapeHtml(trip.notes || "")}</textarea>`)}
      </details>
      <p id="editorError" class="ticket-error" role="alert" hidden></p>
    </div>
    <footer class="dialog-footer">
      <button class="primary-button" data-action="save" type="submit">保存行程</button>
      ${trip.mode === "rail" ? '<button class="ghost-button" data-action="rail-complete" type="button">查询经停站</button>' : ""}
      <button class="ghost-button" data-action="discard" type="button">${editorIsNew ? "取消新增" : "放弃修改"}</button>
    </footer>
  </form>`;
  wireFlightAirportPicker(editorContent);
  if (trip.mode === "rail") wireRailStationPicker(editorContent);
  const editForm = editorContent.querySelector("form");
  editForm.addEventListener("input", (event) => {
    event.target.removeAttribute("aria-invalid");
    if (event.target.id === "previewStatus") trip.statusExplicit = true;
    if (event.target.id === "previewTitle" && trip.mode === "flight") {
      const operator = editorContent.querySelector("#previewOperator");
      if (shouldAutofillFlightAirline(operator.value, getFlightAirlineFallback(event.target.value))) operator.value = getFlightAirlineFallback(event.target.value);
    }
    if (event.target.id === "previewDate" && !trip.statusExplicit) editorContent.querySelector("#previewStatus").value = defaultTripStatus(event.target.value);
    syncEditorFields();
  });
  editorContent.querySelector("#previewMode").addEventListener("change", () => {
    syncEditorFields();
    trip.operator = defaultOperatorForMode(trip.mode, trip.title);
    renderTripEditor();
    editorContent.querySelector("#previewMode").focus();
  });
  editorContent.querySelector("#clearReused")?.addEventListener("click", () => {
    Object.assign(trip, { origin: "", destination: "", departureTime: "", arrivalTime: "", routeSource: "unknown", distanceSource: "estimated", distanceKm: 0 });
    delete trip.routeStations;
    renderTripEditor(); cacheEditor(); editorContent.querySelector("#previewOrigin").focus();
  });
  editForm.addEventListener("submit", (event) => { event.preventDefault(); saveUnifiedTrip(); });
  editorContent.querySelector('[data-action="discard"]').addEventListener("click", discardEditor);
  editorContent.querySelector('[data-action="rail-complete"]')?.addEventListener("click", () => {
    syncEditorFields();
    if (!/^[GDCZTK]\d{1,5}$/i.test(trip.title)) return editorError("previewTitle", "请填写车次号，如 G1234；也可直接手动保存路线。");
    openStationSelector(trip.id);
  });
}
function syncEditorFields() {
  if (!editorTrip) return;
  const trip = editorTrip;
  if (editorContent.querySelector("#tripEditForm")) {
    const read = (id) => editorContent.querySelector(`#${id}`)?.value.trim() || "";
    const oldRoute = `${trip.mode}|${trip.origin}|${trip.destination}`;
    const oldTitle = trip.title;
    Object.assign(trip, { mode: read("previewMode"), title: read("previewTitle"), date: read("previewDate"), origin: read("previewOrigin"), destination: read("previewDestination"), operator: read("previewOperator"), status: read("previewStatus"), departureTime: read("previewDeparture"), arrivalTime: read("previewArrival"), notes: read("previewNotes") });
    const routeChanged = `${trip.mode}|${trip.origin}|${trip.destination}` !== oldRoute;
    const distanceField = editorContent.querySelector("#previewDistance");
    if (routeChanged) distanceField.value = "";
    const actualDistance = read("previewDistance");
    trip.distanceSource = actualDistance === "" ? "estimated" : distanceField.dataset.source === "unknown" && actualDistance === distanceField.dataset.original ? "unknown" : "manual";
    trip.distanceKm = actualDistance === "" ? estimateDistance(trip.origin, trip.destination, distanceOptionsForMode(trip.mode)) : Number(actualDistance);
    if (routeChanged || trip.title !== oldTitle) {
      delete trip.routeStations;
      delete trip.routeQueryDate;
      trip.routeSource = "manual";
    }
  } else {
    if (editorContent.querySelector("#routeFrom")) {
      trip.origin = editorContent.querySelector("#routeFrom").value;
      trip.destination = editorContent.querySelector("#routeTo").value;
    }
    const date = editorContent.querySelector("#manualDate, #rideDate")?.value;
    if (date) {
      trip.date = date;
      if (!trip.statusExplicit) trip.status = defaultTripStatus(date);
    }
  }
  cacheEditor();
}
function editorError(id, message) {
  const error = editorContent.querySelector("#editorError");
  error.hidden = false;
  error.textContent = message;
  const field = editorContent.querySelector(`#${id}`);
  field.setAttribute("aria-invalid", "true");
  field.setAttribute("aria-describedby", "editorError");
  if (field.closest("details")) field.closest("details").open = true;
  field.focus();
}
function saveUnifiedTrip() {
  syncEditorFields();
  const trip = editorTrip;
  for (const [id, message] of [["previewTitle", "请填写车次或行程名称。"], ["previewDate", "请选择出发日期。"], ["previewOrigin", "请填写出发地。"], ["previewDestination", "请填写目的地。"]]) {
    const field = editorContent.querySelector(`#${id}`);
    if (!knownPlace(field.value) || !field.checkValidity()) return editorError(id, message);
  }
  if (trip.mode === "flight" && !isValidFlightNumber(trip.title)) return editorError("previewTitle", "请填写正确的航班号，如 CA1234。");
  if (trip.mode === "flight" && !trip.operator) return editorError("previewOperator", "请填写航空公司。");
  if (!editorContent.querySelector("#previewDistance").checkValidity()) return editorError("previewDistance", "里程应为大于或等于 0 的数字。");
  const normalize = trip.mode === "flight" ? normalizeFlightPlace : normalizePlace;
  trip.origin = normalize(trip.origin); trip.destination = normalize(trip.destination);
  if (trip.origin === trip.destination) return editorError("previewDestination", "出发地和目的地不能相同。");
  trip.title = trip.mode === "flight" ? normalizeFlightNumber(trip.title) : trip.title;
  trip.routeUserProvided = true;
  if (trip.distanceSource === "estimated") trip.distanceKm = estimateDistance(trip.origin, trip.destination, distanceOptionsForMode(trip.mode));
  if (!routeStationsMatchTrip(trip)) delete trip.routeStations;
  const saved = JSON.parse(JSON.stringify(trip));
  if (editorIsNew) trips = [saved, ...trips];
  else trips = trips.map((item) => item.id === saved.id ? saved : item);
  rememberTransportProfile(saved);
  if (saved.mode === "rail") rememberRoute(saved.title, saved.origin, saved.destination);
  selectedTripId = saved.id;
  activeFilter = "all";
  persistTrips();
  clearEditor();
  setFilter("all");
  notifyUser("");
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
  const options = ["planned", "completed", "cancelled"]
    .map((status) => `<option value="${status}"${status === currentStatus ? " selected" : ""}>${statusLabel(status)}</option>`)
    .join("");
  return `<select id="${id}">${options}</select>`;
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
    distanceKm: Number(trip.distanceKm) || estimateDistance(trip.origin, trip.destination, distanceOptionsForMode(trip.mode)) || 0,
    routeStations: cloneRouteStations(trip.routeStations)
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
  if (!trip || !editorDialog.open) return;
  const generation = ++queryGeneration;
  const stillCurrent = () => editorDialog.open && editorTrip === trip && generation === queryGeneration;

  // 首次打开时渲染面板框架（含查询日期选择器）；重试时仅刷新列表区
  if (!editorContent.querySelector(".station-panel")) {
    // 查询日期默认今天；登记日期是历史（过去行程）时也按今天查询
    const queryDefault = trip.date >= localToday() && trip.date <= addDays(localToday(), 14) ? trip.date : localToday();
    editorContent.innerHTML = `
      <div class="ticket-panel station-panel">
        <div class="ticket-panel-head">
          <div>
            <p class="ticket-title">${escapeHtml(trip.title)} 站点选择</p>
            <p class="ticket-sub" id="panelStatus">正在自动查询车次信息…</p>
          </div>
          <button class="ghost-button small" data-action="skip" type="button">返回填写</button>
        </div>
        <div class="station-date">
          <label class="edit-field"><span>查询日期</span><input id="panelDate" type="date" min="${localToday()}" max="${addDays(localToday(), 14)}" value="${escapeHtml(queryDefault)}"></label>
          <p class="ticket-sub" id="dateHint">仅用于查询，不改变乘车日期 ${escapeHtml(trip.date)}；历史站点和时间请自行核对。</p>
        </div>
        <div class="station-list"></div>
      </div>
    `;

    editorContent.querySelector('[data-action="skip"]').addEventListener("click", () => {
      syncEditorFields();
      renderTripEditor();
    });

    // 用户改查询日期 → 用新日期重新查询（不再自动切明天）
    editorContent.querySelector("#panelDate").addEventListener("change", () => {
      if (!editorContent.querySelector("#panelDate").checkValidity()) return;
      openStationSelector(tripId, { autoTomorrow: false });
    });
  }

  const listEl = editorContent.querySelector(".station-list");
  const statusEl = editorContent.querySelector("#panelStatus");
  const dateHintEl = editorContent.querySelector("#dateHint");
  // 查询日期（面板选择，用于 12306 接口）；登记日期 trip.date 保持用户填写的乘车日期
  const queryDate = editorContent.querySelector("#panelDate").value;

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
    const payload = await response.json();
    if (!stillCurrent()) return null;
    return payload;
  };

  let result;
  try {
    result = await tryQuery(queryDate);
    if (!stillCurrent()) return;
  } catch (e) {
    if (!stillCurrent()) return;
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
      if (!stillCurrent()) return;
      if (isSuccess(tomorrowResult)) {
        editorContent.querySelector("#panelDate").value = tomorrow;
        statusEl.textContent = "已自动切换查询日期，正在显示车次信息…";
        dateHintEl.textContent = `提示：${queryDate} 查询不到车次，已自动切换为 ${tomorrow}（仅用于查询，不影响登记的乘车日期 ${trip.date}）。`;
        result = tomorrowResult;
      } else {
        renderRouteInput(trip, result.error || "未查询到该车次信息");
        return;
      }
    } catch (e) {
      if (!stillCurrent()) return;
      renderRouteInput(trip, "网络不可用，无法查询 12306 车次信息。");
      return;
    }
  }

  if (!isSuccess(result)) {
    renderRouteInput(trip, result.error || "无法获取经停站信息");
    return;
  }

  // 查询成功：纯车次号时用首末站填充行程占位，并记住区间（不修改登记日期）
  if (!knownPlace(trip.origin) || !knownPlace(trip.destination)) {
    trip.origin = result.stations[0].station_name;
    trip.destination = result.stations[result.stations.length - 1].station_name;
    trip.routeUserProvided = true;
    cacheEditor();
  }
  cacheEditor();
  trip.routeQueryDate = editorContent.querySelector("#panelDate").value;
  renderStationSelector(trip, result.stations);
}

/** 起讫区间输入表单：车站联想下拉列表（输入即查，点击选择），查询失败时也复用此表单并提示错误。 */
function renderRouteInput(trip, errorMsg = "") {
  const listEl = editorContent.querySelector(".station-list");
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
      <button class="ghost-button" data-action="save-manual" type="button">使用手填路线</button>
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
      cacheEditor();
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
    cacheEditor();
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
    trip.status = trip.statusExplicit ? trip.status : defaultTripStatus(trip.date);
    // 距离兜底：按起讫站坐标计算
    trip.distanceKm = estimateDistance(trip.origin, trip.destination, distanceOptionsForMode(trip.mode));
    trip.distanceSource = "estimated";
    trip.routeSource = "manual";
    cacheEditor();
    renderTripEditor();
  });

  wireRailStationPicker(listEl, ["routeFrom", "routeTo"]);
}

/** 渲染经停站选择器：上车/到达下拉 + 区间预览 + 确认。 */
function renderStationSelector(trip, stations) {
  const listEl = editorContent.querySelector(".station-list");
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
      <button class="primary-button" data-action="confirm" type="button">使用此区间</button>
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
    trip.origin = f.station_name;
    trip.destination = t.station_name;
    trip.departureTime = timeInputValue(f.start_time);
    trip.arrivalTime = timeInputValue(t.arrive_time);
    trip.routeStations = normalizeRailRouteStations(stations, Number(pickFrom.value), Number(pickTo.value));
    trip.routeSource = "timetable";
    trip.distanceSource = "estimated";
    trip.distanceKm = estimateDistance(trip.origin, trip.destination, distanceOptionsForMode(trip.mode));
    cacheEditor();
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
  const fromIndex = Number(editorContent.querySelector("#pickFrom").value);
  const toIndex = Number(editorContent.querySelector("#pickTo").value);
  if (fromIndex >= toIndex) {
    editorContent.querySelector(".station-preview").innerHTML = '<p class="ticket-error">上车站必须早于到达站</p>';
    return;
  }

  const rideDate = editorContent.querySelector("#rideDate")?.value;
  if (rideDate) trip.date = rideDate;

  const from = stations[fromIndex];
  const to = stations[toIndex];
  trip.origin = from.station_name;
  trip.destination = to.station_name;
  if (from.start_time !== "----") trip.departureTime = from.start_time;
  if (to.arrive_time !== "----") trip.arrivalTime = to.arrive_time;
  trip.status = trip.statusExplicit ? trip.status : defaultTripStatus(trip.date);
  // 距离兜底：按起讫站坐标计算直线距离（无接口数据时使用）
  trip.distanceKm = estimateDistance(trip.origin, trip.destination, distanceOptionsForMode(trip.mode));
    trip.distanceSource = "estimated";
  trip.routeStations = normalizeRailRouteStations(stations, fromIndex, toIndex);
  trip.routeSource = "timetable";
  trip.routeUserProvided = true;
  cacheEditor();
  renderTripEditor();
}

// ---------- 航班集成：用户手动登记 ----------



function flightAirlineInput(selected = "") {
  const airlines = [...new Set(Object.values(commonFlightAirlines))];
  const options = airlines.map((airline) => `<option value="${escapeHtml(airline)}"></option>`).join("");
  return `<input id="flightOperator" list="flightAirlineList" value="${escapeHtml(selected || "")}" placeholder="如 吉祥航空" required><datalist id="flightAirlineList">${options}</datalist>`;
}

function flightAirportInput(id, value = "", placeholder = "") {
  return `<input id="${id}" list="flightAirportList" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" required>`;
}

function flightAirportDatalist(query = "") {
  return `<datalist id="flightAirportList">${renderFlightAirportOptions(query)}</datalist>`;
}

function wireFlightAirportPicker(scopeEl) {
  const datalist = scopeEl.querySelector("#flightAirportList");
  if (!datalist) return;
  let frameId = 0;
  const refresh = (query) => {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => {
      datalist.innerHTML = renderFlightAirportOptions(query);
      frameId = 0;
    });
  };
  scopeEl.querySelectorAll("#previewOrigin, #previewDestination").forEach((input) => {
    input.addEventListener("focus", () => refresh(input.value));
    input.addEventListener("input", () => refresh(input.value));
  });
}

function renderFlightAirportOptions(query = "") {
  return findFlightAirportOptions(query)
    .map((airport) => {
      const labelParts = [
        airport.city,
        airport.code,
        airport.usage === "军民合用" ? "军民合用" : ""
      ].filter(Boolean);
      return `<option value="${escapeHtml(airport.name)}" label="${escapeHtml(labelParts.join(" · "))}"></option>`;
    })
    .join("");
}

function findFlightAirportOptions(query = "") {
  const normalizedQuery = normalizeAirportPickerQuery(query);
  const sortedAirports = getSortedAirportsForPicker();
  if (!normalizedQuery) {
    const popular = sortedAirports.filter((airport) => popularAirportCodes.has(airport.code));
    const seenCodes = new Set();
    return [...popular, ...sortedAirports]
      .filter((airport) => {
        if (seenCodes.has(airport.code)) return false;
        seenCodes.add(airport.code);
        return true;
      })
      .slice(0, airportPickerInitialLimit);
  }

  return sortedAirports
    .map((airport) => ({ airport, score: scoreAirportForQuery(airport, normalizedQuery) }))
    .filter((match) => Number.isFinite(match.score))
    .sort((a, b) => a.score - b.score || compareAirportsForPicker(a.airport, b.airport))
    .slice(0, airportPickerSearchLimit)
    .map((match) => match.airport);
}

function normalizeAirportPickerQuery(value = "") {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function scoreAirportForQuery(airport, query) {
  const queryUpper = query.toUpperCase();
  const name = String(airport.name || "").toLowerCase();
  const city = String(airport.city || "").toLowerCase();
  const code = String(airport.code || "").toUpperCase();
  const aliases = airport.searchAliases || [];
  if (code === queryUpper) return 0;
  if (code.startsWith(queryUpper)) return 1;
  if (name === query) return 2;
  if (city === query) return 3;
  if (name.startsWith(query)) return 4;
  if (city.startsWith(query)) return 5;
  if (aliases.some((alias) => String(alias).toLowerCase().startsWith(query))) return 6;
  if (name.includes(query)) return 8;
  if (city.includes(query)) return 9;
  if (aliases.some((alias) => String(alias).toLowerCase().includes(query))) return 10;
  return Infinity;
}

function getSortedAirportsForPicker() {
  if (!getSortedAirportsForPicker.cache) {
    getSortedAirportsForPicker.cache = commonAirports.slice().sort(compareAirportsForPicker);
  }
  return getSortedAirportsForPicker.cache;
}

function compareAirportsForPicker(a, b) {
  const aPopular = popularAirportCodes.has(a.code);
  const bPopular = popularAirportCodes.has(b.code);
  if (aPopular !== bPopular) return aPopular ? -1 : 1;
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

function shouldAutofillFlightAirline(currentAirline, fallbackAirline) {
  if (!fallbackAirline) return false;
  const current = String(currentAirline || "").trim();
  return !current || current === "待补全航司" || Object.values(commonFlightAirlines).includes(current);
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

  if (!backupTrips()) return;
  trips = trips.filter((item) => item.id !== tripId);
  if (selectedTripId === tripId) {
    selectedTripId = getVisibleTrips()[0]?.id || trips[0]?.id;
  }
  persistTrips();
  render();
}

function downloadJson(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportTrips() {
  if (!currentUser) return;
  downloadJson({ app: "leaves", version: 1, exportedAt: new Date().toISOString(), trips }, `leaves-trips-${localToday()}.json`);
}
function backupTrips() {
  try {
    localStorage.setItem(scopedStorageKey(`${storageKey}.backup`), JSON.stringify(trips));
    return true;
  } catch {
    notifyUser("无法保留操作前备份，请先导出记录并释放此设备存储空间。");
    return false;
  }
}

function openImportFilePicker(fileInput, label) {
  if (!currentUser) return;
  if (!fileInput) {
    window.alert(`导入失败：${label} 文件选择控件未加载，请刷新页面后重试。`);
    return;
  }
  fileInput.click();
}

function validImportedTrip(trip) {
  return trip && typeof trip.id === "string" && trip.id.length > 0 &&
    ["rail", "flight", "road", "ship"].includes(trip.mode) &&
    ["title", "origin", "destination", "date"].every((key) => typeof trip[key] === "string") &&
    /^\d{4}-\d{2}-\d{2}$/.test(trip.date) && Boolean(parseTripDate(trip.date)) &&
    ["operator", "notes", "departureTime", "arrivalTime", "status", "distanceSource"].every((key) => trip[key] === undefined || typeof trip[key] === "string") &&
    (trip.distanceKm == null || (Number.isFinite(Number(trip.distanceKm)) && Number(trip.distanceKm) >= 0)) &&
    (trip.routeStations === undefined || (Array.isArray(trip.routeStations) && trip.routeStations.every((station) => station && typeof (station.station_name || station.stationName || station.name) === "string")));
}
async function importTrips(file) {
  if (!currentUser || !file) return;
  const userId = currentUser.id;
  try {
    const parsed = JSON.parse(await file.text());
    if (currentUser?.id !== userId) return;
    const records = Array.isArray(parsed) ? parsed : parsed.trips;
    if (!Array.isArray(records)) throw new Error("invalid");
    const invalid = records.filter((trip) => !validImportedTrip(trip)).length;
    const duplicateIds = records.length - new Set(records.map((trip) => trip?.id)).size;
    previewImport(records, { replace: true, invalid, duplicate: duplicateIds, label: "恢复 JSON 备份" });
  } catch { notifyUser("无法读取备份，请选择完整的 Leaves JSON 备份文件。"); }
}
async function importRailTripsFromCsv(file) {
  if (!currentUser || !file) return;
  const userId = currentUser.id;
  try {
    const records = parseCsvRecords(await file.text());
    if (currentUser?.id !== userId) return;
    const imported = records.map(createRailTripFromCsvRecord).filter(Boolean);
    const existing = new Set(trips.map(getRailImportKey).filter(Boolean));
    const newTrips = []; let duplicate = 0;
    imported.forEach((trip) => {
      const key = getRailImportKey(trip);
      if (existing.has(key)) duplicate += 1;
      else { existing.add(key); newTrips.push(trip); }
    });
    previewImport(newTrips, { replace: false, invalid: records.length - imported.length, duplicate, label: "导入铁路记录" });
  } catch { notifyUser("无法读取 CSV，请选择包含车次、乘车日期和出发／到达站的文件。"); }
}
function previewImport(records, options) {
  document.querySelector("#moreMenu").open = false;
  importProposal = { records, ...options, userId: currentUser.id };
  document.querySelector("#importTitle").textContent = options.label;
  document.querySelector("#importPreview").innerHTML = `<p>${options.replace ? `将以备份中的 ${records.length} 条记录替换当前账号的 ${trips.length} 条记录，并同步到服务端。` : `将新增 ${records.length} 条铁路记录，已有记录保持不变。`}</p>
    <p>重复 ${options.duplicate} 条 · 无效 ${options.invalid} 条${options.replace ? "" : "（已跳过）"}</p>
    <p>${options.replace && (options.invalid || options.duplicate) ? "备份包含无效记录或重复标识，请修正后重试。" : "确认后保留操作前备份，可从“更多”恢复。"}</p>
    <div class="import-samples">${records.slice(0, 8).filter(validImportedTrip).map((trip) => `<p>${escapeHtml(trip.date)} · ${escapeHtml(trip.title)}<br>${escapeHtml(trip.origin)} → ${escapeHtml(trip.destination)}</p>`).join("")}</div>`;
  document.querySelector("#confirmImport").disabled = options.replace ? Boolean(options.invalid || options.duplicate) : records.length === 0;
  document.querySelector("#confirmImport").textContent = options.replace ? "备份当前记录并恢复" : "确认导入";
  document.querySelector("#importDialog").showModal();
}
function confirmImport() {
  if (!importProposal || importProposal.userId !== currentUser?.id) return;
  if (!backupTrips()) return;
  trips = importProposal.replace ? importProposal.records : [...importProposal.records, ...trips].sort(compareTripsByDateDesc);
  trips.forEach(rememberTransportProfile);
  selectedTripId = trips[0]?.id || null;
  persistTrips();
  setFilter("all");
  document.querySelector("#importDialog").close();
  notifyUser(`已${importProposal.replace ? "恢复" : "导入"} ${importProposal.records.length} 条记录；操作前备份可从“更多”恢复。`);
  importProposal = null;
}

function parseCsvRecords(text) {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  const dataRows = rows.filter((row) => row.some((cell) => String(cell || "").trim()) && !String(row[0] || "").trim().startsWith("#"));
  if (dataRows.length < 2) return [];

  const headers = dataRows[0].map(normalizeCsvHeader);
  return dataRows.slice(1).map((row) => {
    return headers.reduce((record, header, index) => {
      if (header) record[header] = String(row[index] || "").trim();
      return record;
    }, {});
  });
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function normalizeCsvHeader(header) {
  const normalized = String(header || "").trim().toLowerCase().replace(/\s+/g, "_");
  const aliases = {
    "交易时间": "trade_time",
    "积分变动": "point_delta",
    "收入/支出": "point_delta",
    "项目": "item",
    "积分有效期": "points_valid_until",
    "乘车人": "passenger",
    "乘车日期": "travel_date",
    "车次": "train_no",
    "出发站": "from_station",
    "上车站": "from_station",
    "到达站": "to_station",
    "席别": "seat_class",
    "车厢号": "coach_no",
    "订单号": "order_no",
    "备注": "remark"
  };
  return aliases[header] || normalized;
}

function createRailTripFromCsvRecord(record, index) {
  const trainNo = pickCsvValue(record, ["train_no", "remark_train_no", "车次"]).toUpperCase();
  const travelDate = normalizeCsvDate(pickCsvValue(record, ["travel_date", "date", "乘车日期"]));
  const routeText = pickCsvValue(record, ["route", "区间", "线路"]);
  const [routeFrom, routeTo] = splitCsvRoute(routeText);
  const origin = normalizePlace(pickCsvValue(record, ["from_station", "origin", "board_station_name", "出发站"]) || routeFrom);
  const destination = normalizePlace(pickCsvValue(record, ["to_station", "destination", "arrive_station_name", "到达站"]) || routeTo);
  const orderNo = pickCsvValue(record, ["order_no", "sequence_no", "订单号"]);

  if (!trainNo || !travelDate || !parseTripDate(travelDate) || !origin || !destination || origin === "待确认" || destination === "待确认") {
    return null;
  }

  const seatClass = pickCsvValue(record, ["seat_class", "seat_type", "席别"]);
  const coachNo = pickCsvValue(record, ["coach_no", "车厢号"]);
  const pointDelta = pickCsvValue(record, ["point_delta", "cumulate_point", "trade_point", "积分变动"]);
  const item = pickCsvValue(record, ["item", "trade_name", "项目"]) || "铁路车票";
  const pointsValidUntil = normalizeCsvDate(pickCsvValue(record, ["points_valid_until", "stop_date", "积分有效期"]));
  const tradeTime = pickCsvValue(record, ["trade_time", "trade_date", "交易时间"]);
  const notes = [
    "由 12306 积分明细 CSV 导入。",
    orderNo ? `订单号：${orderNo}` : "",
    seatClass ? `席别：${seatClass}` : "",
    coachNo ? `车厢号：${coachNo}` : "",
    pointDelta ? `积分：${pointDelta}` : "",
    pointsValidUntil ? `积分有效期：${pointsValidUntil}` : ""
  ].filter(Boolean).join(" ");

  return {
    id: createRailCsvTripId(orderNo, trainNo, travelDate, index),
    mode: "rail",
    title: trainNo,
    operator: "中国铁路",
    origin,
    destination,
    routeUserProvided: true,
    date: travelDate,
    departureTime: "待确认",
    arrivalTime: "待确认",
    distanceKm: estimateDistance(origin, destination, distanceOptionsForMode("rail")),
    distanceSource: "estimated",
    status: defaultTripStatus(travelDate),
    notes,
    source: "12306-points-csv",
    sourceOrderNo: orderNo,
    sourceTradeTime: tradeTime,
    sourcePointDelta: pointDelta,
    sourceItem: item,
    seatClass,
    coachNo
  };
}

function pickCsvValue(record, keys) {
  for (const key of keys) {
    const value = record[key] ?? record[normalizeCsvHeader(key)];
    if (String(value || "").trim()) return String(value).trim();
  }
  return "";
}

function normalizeCsvDate(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const loose = raw.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (loose) return `${loose[1]}-${loose[2].padStart(2, "0")}-${loose[3].padStart(2, "0")}`;
  return "";
}

function splitCsvRoute(routeText) {
  const match = String(routeText || "").match(/(.+?)(?:--|->|→|至|到)(.+)/);
  if (!match) return ["", ""];
  return [match[1].trim(), match[2].trim()];
}

function createRailCsvTripId(orderNo, trainNo, travelDate, index) {
  const stable = String(orderNo || `${travelDate}-${trainNo}-${index + 1}`).replace(/[^a-z0-9_-]/gi, "-");
  return `trip-12306-${stable}`;
}

function getRailImportKey(trip) {
  if (!trip || trip.mode !== "rail") return "";
  if (trip.sourceOrderNo) return `order:${trip.sourceOrderNo}`;
  const notesOrder = String(trip.notes || "").match(/订单号：([A-Z0-9]+)/i)?.[1];
  if (notesOrder) return `order:${notesOrder}`;
  return `trip:${trip.date}|${trip.title}|${trip.origin}|${trip.destination}`;
}

function compareTripsByDateDesc(a, b) {
  const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
  if (dateCompare !== 0) return dateCompare;
  return String(b.title || "").localeCompare(String(a.title || ""));
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
  let estimatedCount = 0;
  const unresolvedPlaces = new Set();
  let weekendTrips = 0;
  let nightTrips = 0;

  trips.forEach((trip) => {
    const mode = modeCounts[trip.mode] === undefined ? "road" : trip.mode;
    const distanceKm = Number(trip.distanceKm) || 0;
    modeCounts[mode] += 1;
    modeKm[mode] += distanceKm;
    if (trip.status === "completed") {
      totalKm += distanceKm;
      if (distanceKm > 0 && trip.distanceSource !== "manual") estimatedCount += 1;
    }

    if (trip.status === "completed") completedCount += 1;
    if (trip.status === "planned" || trip.status === "draft") plannedCount += 1;
    if (trip.status === "completed") {
      [trip.origin, trip.destination].filter(knownPlace).forEach((place) => {
        const city = resolveTripCity(place, trip.mode);
        if (city) cities.add(city);
        else unresolvedPlaces.add(place);
      });
    }

    const routeKnown = trip.origin && trip.destination && trip.origin !== "待确认" && trip.destination !== "待确认";
    if (routeKnown && trip.status === "completed") {
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
      if (trip.status === "completed") { month.count += 1; month.km += distanceKm; }
      monthMap.set(monthKey, month);
      const day = date.getDay();
      if (trip.status === "completed" && (day === 0 || day === 6)) weekendTrips += 1;
    }

    if (trip.status === "completed" && isNightDeparture(trip.departureTime)) nightTrips += 1;
  });

  datedTrips.sort((a, b) => a.date - b.date);
  const latestDatedTrips = [...datedTrips].sort((a, b) => b.date - a.date);
  const fallbackRecentTrips = trips.slice(0, 5).map((trip) => ({ trip, date: parseTripDate(trip.date) }));
  const recentTrips = (latestDatedTrips.length ? latestDatedTrips : fallbackRecentTrips).slice(0, 5);
  const longestTrip = trips.filter((trip) => trip.status === "completed").reduce((best, trip) => {
    return (Number(trip.distanceKm) || 0) > (Number(best?.distanceKm) || 0) ? trip : best;
  }, null);
  const topRoutes = [...routeMap.values()]
    .map((route) => ({ ...route, modes: [...route.modes] }))
    .sort((a, b) => b.count - a.count || b.km - a.km)
    .slice(0, 5);
  const anchorDate = parseTripDate(localToday()) || new Date();
  const monthly = getRecentMonthStats(monthMap, anchorDate);
  const dominantMode = Object.keys(modeCounts).reduce((best, mode) => {
    if (!best || modeCounts[mode] > modeCounts[best]) return mode;
    return best;
  }, "");

  return {
    totalTrips: trips.length,
    totalKm,
    estimatedCount,
    unresolvedCityCount: unresolvedPlaces.size,
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
  return Number.isNaN(date.getTime()) || date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day) ? null : date;
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
  const visible = getVisibleTrips().length;
  statsLine.textContent = `${activeFilter === "all" ? "全部" : modeLabel(activeFilter)} ${visible} 条 · 全部已完成 ${stats.completedCount} 条`;
  document.querySelector("#allRecords").textContent = `全部记录 (${trips.length})`;
}
function renderDashboard(stats = getTripStats()) {
  if (!dashboardMetricGrid) return;
  dashboardRange.textContent = stats.totalTrips ? `${formatDateLabel(stats.firstDate)} – ${formatDateLabel(stats.lastDate)} · 里程、城市仅统计已完成行程` : "暂无行程，登记后即可查看统计。";
  const total = `${stats.estimatedCount ? "约 " : ""}${formatNumber(stats.totalKm)} km`;
  dashboardSummary.textContent = total;
  dashboardMetricGrid.innerHTML = [
    metricCard("全部行程", formatNumber(stats.totalTrips), `${stats.completedCount} 条已完成`),
    metricCard("已完成里程", total, `${stats.estimatedCount} 条里程为估算或来源未确认`),
    metricCard("到访城市", formatNumber(stats.cityCount), stats.unresolvedCityCount ? `${stats.unresolvedCityCount} 个地点的城市待确认` : "同城机场与车站合并统计"),
    metricCard("计划 / 旧草稿", formatNumber(stats.plannedCount), "与是否填写时间分开记录")
  ].join("");
  renderModeBreakdown(stats); renderMonthlyTimeline(stats); renderTopRoutes(stats); renderRecentHighlights(stats);
}
function resolveTripCity(value, mode) {
  const name = String(value || "").trim().replace(/站$/, "");
  const airport = resolveAirportAlias(name);
  if (mode === "flight" && airport?.city) return `${airport.country || "CN"}:${airport.city}`;
  const cities = "北京 上海 广州 深圳 杭州 南京 苏州 无锡 常州 合肥 武汉 重庆 成都 西安 济南 天津 石家庄 太原 哈尔滨 沈阳 大连 昆明 贵阳 南昌 兰州 乌鲁木齐 南宁 海口 三亚 扬州 镇江 南通 盐城 绍兴 金华 义乌 台州 湖州 芜湖 安庆 蚌埠 六安 黄山 徐州 宁波 温州 瑞安 苍南 福州 厦门 长沙 郑州 青岛 桂林 阳朔 惠州 泉州".split(" ");
  const city = cities.find((city) => name === city || ["东", "西", "南", "北", "虹桥"].some((suffix) => name === city + suffix));
  if (city) return `CN:${city}`;
  if (airport?.city) return `${airport.country || "CN"}:${airport.city}`;
  return null;
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
          <div class="mode-bar" aria-hidden="true"><i style="width: ${percent}%; background: var(--${mode})"></i></div>
          <strong>${count}</strong>
        </div>
      `;
    })
    .join("");
}

function renderMonthlyTimeline(stats) {
  document.querySelector("#monthlyRange").textContent = `${stats.monthly[0].key} – ${stats.monthly[5].key} · 已完成`;
  const maxKm = Math.max(...stats.monthly.map((item) => item.km), 1);
  monthlyTimeline.innerHTML = stats.monthly
    .map((item) => {
      const percent = item.km ? Math.max(8, Math.round((item.km / maxKm) * 100)) : 0;
      return `
        <div class="timeline-item">
          <div class="timeline-track"><i style="height: ${percent}%"></i></div>
          <strong>${formatNumber(item.km)} km</strong>
          <span>${escapeHtml(item.label)}</span>
          <small>${formatNumber(item.count)} 次</small>
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
  const next = achievements.filter((item) => !item.unlocked).sort((a, b) => b.progress - a.progress)[0];
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

  const featured = [...unlocked.slice(-2), ...achievements.filter((item) => !item.unlocked).sort((a, b) => b.progress - a.progress).slice(0, 2)];
  document.querySelector("#toggleAchievements").textContent = showAllAchievements ? "只看已解锁与近期目标" : "查看全部成就";
  document.querySelector("#toggleAchievements").setAttribute("aria-expanded", String(showAllAchievements));
  achievementGrid.innerHTML = (showAllAchievements ? achievements : featured)
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
  const completed = trips.filter((trip) => trip.status === "completed");
  const completedModes = Object.fromEntries(["rail", "flight", "ship", "road"].map((mode) => [mode, completed.filter((trip) => trip.mode === mode).length]));
  const achievedStats = { ...stats, totalTrips: completed.length, modeCounts: completedModes, activeModeCount: Object.values(completedModes).filter(Boolean).length };
  return achievementDefinitions.map((definition) => {
    const value = Math.max(0, Number(definition.getValue(achievedStats)) || 0);
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


function renderRecords() {
  const query = document.querySelector("#recordSearch").value.trim().toLowerCase();
  const month = document.querySelector("#recordMonth").value;
  const mode = document.querySelector("#recordMode").value;
  const records = trips.filter((trip) => (!month || String(trip.date).startsWith(month)) && (mode === "all" || trip.mode === mode) && (!query || [trip.title, trip.origin, trip.destination, trip.notes].join(" ").toLowerCase().includes(query))).sort(compareTripsByDateDesc);
  const countText = records.length === trips.length ? `共 ${trips.length} 条行程` : `找到 ${records.length} 条 · 共 ${trips.length} 条`;
  document.querySelector("#recordCount").textContent = countText;
  const list = document.querySelector("#recordList");
  list.innerHTML = records.length ? renderRecordGroups(records) : '<p class="empty-records">没有匹配的记录，试试清除筛选。</p>';
  list.querySelectorAll("[data-record-id]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector("#recordsDialog").close();
    selectedTripId = button.dataset.recordId;
    activeFilter = "all";
    switchView("home");
    setFilter("all");
    heroOverlay.querySelector('[data-action="edit"]')?.focus();
  }));
}

function renderRecordGroups(records) {
  const groups = [];
  records.forEach((trip) => {
    const date = parseTripDate(trip.date);
    const key = date ? formatMonthKey(date) : "unknown";
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = {
        key,
        label: date ? `${date.getFullYear()}年${date.getMonth() + 1}月` : "日期待确认",
        items: []
      };
      groups.push(group);
    }
    group.items.push(trip);
  });
  return groups.map((group) => `
    <section class="record-section" aria-label="${escapeHtml(group.label)}">
      <div class="record-section-head"><span>${escapeHtml(group.label)}</span><small>${group.items.length} 条</small></div>
      <div class="record-group">
        ${group.items.map(renderRecordRow).join("")}
      </div>
    </section>
  `).join("");
}

function renderRecordRow(trip) {
  const tripMode = trip.mode || "road";
  const note = String(trip.notes || "").trim();
  const isSelected = trip.id === selectedTripId;
  return `<button class="record-row ${escapeHtml(tripMode)}${isSelected ? " active" : ""}" data-record-id="${escapeHtml(trip.id)}" type="button" aria-label="查看 ${escapeHtml(trip.title)} ${escapeHtml(trip.origin)} 到 ${escapeHtml(trip.destination)}" aria-current="${isSelected ? "true" : "false"}">
      <span class="record-date"><strong>${escapeHtml(formatRecordDay(trip.date))}</strong><small>${escapeHtml(modeLabel(tripMode))}</small></span>
      <span class="record-main">
        <span class="record-title"><strong>${escapeHtml(trip.origin)} → ${escapeHtml(trip.destination)}</strong><span>${escapeHtml(trip.title)}</span></span>
        <span class="record-meta"><i class="mode-dot ${escapeHtml(tripMode)}"></i>${escapeHtml(statusLabel(trip.status))} · ${distanceLabel(trip)}</span>
        ${note ? `<span class="record-note">${escapeHtml(note)}</span>` : ""}
      </span>
      <span class="record-open" aria-hidden="true"></span>
    </button>`;
}

function formatRecordDay(value) {
  const date = parseTripDate(value);
  return date ? String(date.getDate()).padStart(2, "0") : "--";
}
function setupWorkspaceInteractions() {
  const resizeWorkspace = () => {
    document.documentElement.style.setProperty("--dialog-height", `${window.visualViewport?.height || window.innerHeight}px`);
    document.documentElement.style.setProperty("--dialog-top", `${window.visualViewport?.offsetTop || 0}px`);
  };
  window.visualViewport?.addEventListener("resize", resizeWorkspace);
  window.visualViewport?.addEventListener("scroll", resizeWorkspace);
  resizeWorkspace();
  new ResizeObserver(() => {
    if (map && currentView === "home") {
      map.invalidateSize({ animate: false });
      if (selectedTripId) fitMapToTrip(selectedTripId);
    }
  }).observe(document.querySelector("#heroCard"));
  document.querySelector("#retrySave").addEventListener("click", persistTripsToServer);
  window.addEventListener("online", () => tripStore?.flush());
  document.querySelector("#resumeDraft").addEventListener("click", resumeEditor);
  document.querySelector("#pauseEditor").addEventListener("click", pauseTripEditor);
  editorDialog.addEventListener("cancel", (event) => { event.preventDefault(); pauseTripEditor(); });
  editorContent.addEventListener("input", () => { if (!editorContent.querySelector("#tripEditForm")) syncEditorFields(); });
  document.querySelector("#openQuickAdd").addEventListener("click", () => { switchView("home"); input.focus(); });
  document.querySelector("#allRecords").addEventListener("click", () => {
    document.querySelector("#recordMode").value = activeFilter;
    renderRecords(); document.querySelector("#recordsDialog").showModal(); document.querySelector("#recordSearch").focus();
  });
  document.querySelectorAll("#recordSearch, #recordMonth, #recordMode").forEach((field) => field.addEventListener("input", renderRecords));
  document.querySelector("#clearRecordFilters").addEventListener("click", () => {
    document.querySelector("#recordSearch").value = ""; document.querySelector("#recordMonth").value = ""; document.querySelector("#recordMode").value = "all"; renderRecords();
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  document.querySelector("#confirmImport").addEventListener("click", confirmImport);
  document.querySelector("#restorePrevious").addEventListener("click", () => {
    const backup = readLocalJson(scopedStorageKey(`${storageKey}.backup`), null) || readLocalJson(`${scopedStorageKey(storageKey)}.beforeSync`, null);
    if (!Array.isArray(backup)) { notifyUser("此设备还没有可恢复的操作前备份。"); return; }
    previewImport(backup, { replace: true, invalid: backup.filter((trip) => !validImportedTrip(trip)).length, duplicate: 0, label: "恢复操作前备份" });
  });
  document.querySelector("#toggleAchievements").addEventListener("click", () => { showAllAchievements = !showAllAchievements; renderAchievements(); });
  document.querySelectorAll('[role="tablist"]').forEach((tabs) => tabs.addEventListener("keydown", (event) => {
    const buttons = [...tabs.querySelectorAll('[role="tab"]')];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0 || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].click(); buttons[next].focus();
  }));
  document.addEventListener("click", (event) => {
    const menu = document.querySelector("#moreMenu");
    if (!menu.contains(event.target) || event.target.closest("button:not(#logoutButton)")) menu.open = false;
  });
  window.addEventListener("beforeunload", () => { if (editorDialog.open) { syncEditorFields(); cacheEditor(); } });
}


// Native datalist keeps keyboard selection available; manual text always remains valid.
function wireRailStationPicker(scope, ids = ["previewOrigin", "previewDestination"]) {
  const accountId = currentUser?.id;
  ids.forEach((id) => {
    const field = scope.querySelector(`#${id}`);
    if (!field) return;
    const options = document.createElement("datalist");
    options.id = `railOptions-${id}`;
    field.setAttribute("list", options.id);
    field.after(options);
    let timer;
    let generation = 0;
    const update = () => {
      clearTimeout(timer);
      const query = field.value.trim();
      const requestGeneration = ++generation;
      if (!query) { options.innerHTML = ""; return; }
      timer = setTimeout(async () => {
        if (!field.isConnected || currentUser?.id !== accountId) return;
        try {
          const response = await apiFetch(`/api/12306/search-stations?query=${encodeURIComponent(query)}&limit=8`);
          const payload = await response.json();
          if (!field.isConnected || requestGeneration !== generation || currentUser?.id !== accountId) return;
          options.innerHTML = (payload.success && Array.isArray(payload.stations) ? payload.stations : []).map((station) => `<option value="${escapeHtml(station.name)}" label="${escapeHtml(station.code || "")}"></option>`).join("");
        } catch { /* Keep manual entry available when station suggestions are unavailable. */ }
      }, 250);
    };
    field.addEventListener("input", update);
    field.addEventListener("focus", update);
  });
}
