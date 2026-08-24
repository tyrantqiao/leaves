// 航班查询服务 —— 航司字典（本地）+ OpenSky REST provider（可选 OAuth 凭证）
// 与铁路链路对齐：查询失败时返回结构化错误，由前端降级为手动补录。
"use strict";

const crypto = require("crypto");
const http = require("http");
const https = require("https");
const tls = require("tls");
const zlib = require("zlib");
const { USER_AGENT } = require("./12306-client");

// OpenSky Network REST API。OpenSky 目前使用 OAuth2 client credentials；
// Basic username/password 已被官方弃用。用户级凭证由 dev-server 注入。
const OPENSKY_API_ROOT = "https://opensky-network.org/api";
const OPENSKY_TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const OPENSKY_ARRIVALS_PATH = "/flights/arrival";
const OPENSKY_DEPARTURES_PATH = "/flights/departure";
const OPENSKY_TIMEOUT = 10000;
const TOKEN_REFRESH_MARGIN_SECONDS = 30;
const tokenCache = new Map();

// ---------- 航司字典（IATA 二字码 → 航司名，离线可用） ----------

const AIRLINES = {
  CA: "中国国际航空",
  MU: "中国东方航空",
  CZ: "中国南方航空",
  HU: "海南航空",
  MF: "厦门航空",
  "3U": "四川航空",
  ZH: "深圳航空",
  HO: "吉祥航空",
  "9C": "春秋航空",
  SC: "山东航空",
  GS: "天津航空",
  G5: "华夏航空",
  EU: "成都航空",
  GT: "桂林航空",
  QW: "青岛航空",
  PN: "西部航空",
  KN: "中国联合航空",
  JR: "幸福航空",
  DZ: "东海航空",
  TV: "西藏航空",
  GY: "多彩贵州航空",
  NS: "河北航空",
  RY: "江西航空",
  DR: "瑞丽航空",
  A6: "湖南航空",
  UQ: "乌鲁木齐航空",
  Y8: "金鹏航空",
  "8L": "祥鹏航空",
  AQ: "九元航空",
  FM: "上海航空",
  OQ: "重庆航空",
};

const AIRLINE_CALLSIGN_PREFIXES = {
  CA: "CCA",
  MU: "CES",
  CZ: "CSN",
  HU: "CHH",
  MF: "CXA",
  "3U": "CSC",
  ZH: "CSZ",
  HO: "DKH",
  "9C": "CQH",
  SC: "CDG",
  GS: "GCR",
  G5: "HXA",
  EU: "UEA",
  GT: "CGH",
  QW: "QDA",
  PN: "CHB",
  KN: "CUA",
  DZ: "EPA",
  TV: "TBA",
  GY: "CGZ",
  NS: "HBH",
  RY: "CJX",
  DR: "RLH",
  UQ: "CUH",
  Y8: "YZR",
  "8L": "LKE",
  AQ: "JYH",
  FM: "CSH",
  OQ: "CQN",
};

function getAirlineName(flightNo) {
  return AIRLINES[String(flightNo).slice(0, 2).toUpperCase()] || "";
}

function callsignCandidates(flightNo) {
  const normalized = String(flightNo || "").trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^([A-Z0-9]{2})(\d{3,4})$/);
  if (!match) return [normalized];
  const prefix = AIRLINE_CALLSIGN_PREFIXES[match[1]];
  return [...new Set([normalized, prefix ? `${prefix}${match[2]}` : ""])].filter(Boolean);
}

// ---------- 机场字典（城市/机场名/IATA/ICAO → 标准机场信息） ----------

const AIRPORTS = [
  {
    name: "北京首都",
    fullName: "北京首都国际机场",
    city: "北京",
    iata: "PEK",
    icao: "ZBAA",
    aliases: ["北京", "首都", "首都机场", "北京首都机场"],
  },
  {
    name: "北京大兴",
    fullName: "北京大兴国际机场",
    city: "北京",
    iata: "PKX",
    icao: "ZBAD",
    aliases: ["大兴", "大兴机场", "北京大兴机场"],
  },
  {
    name: "上海浦东",
    fullName: "上海浦东国际机场",
    city: "上海",
    iata: "PVG",
    icao: "ZSPD",
    aliases: ["上海", "浦东", "浦东机场", "上海浦东机场"],
  },
  {
    name: "上海虹桥",
    fullName: "上海虹桥国际机场",
    city: "上海",
    iata: "SHA",
    icao: "ZSSS",
    aliases: ["虹桥", "虹桥机场", "上海虹桥机场"],
  },
  {
    name: "惠州平潭",
    fullName: "惠州平潭机场",
    city: "惠州",
    iata: "HUZ",
    icao: "ZGHZ",
    aliases: ["惠州", "平潭", "平潭机场", "惠州机场", "惠州平潭机场"],
  },
  { name: "杭州萧山", fullName: "杭州萧山国际机场", city: "杭州", iata: "HGH", icao: "ZSHC", aliases: ["杭州", "萧山", "萧山机场", "杭州萧山机场"] },
  { name: "广州白云", fullName: "广州白云国际机场", city: "广州", iata: "CAN", icao: "ZGGG", aliases: ["广州", "白云", "白云机场", "广州白云机场"] },
  { name: "深圳宝安", fullName: "深圳宝安国际机场", city: "深圳", iata: "SZX", icao: "ZGSZ", aliases: ["深圳", "宝安", "宝安机场", "深圳宝安机场"] },
  { name: "成都双流", fullName: "成都双流国际机场", city: "成都", iata: "CTU", icao: "ZUUU", aliases: ["成都", "双流", "双流机场", "成都双流机场"] },
  { name: "成都天府", fullName: "成都天府国际机场", city: "成都", iata: "TFU", icao: "ZUTF", aliases: ["天府", "天府机场", "成都天府机场"] },
  { name: "西安咸阳", fullName: "西安咸阳国际机场", city: "西安", iata: "XIY", icao: "ZLXY", aliases: ["西安", "咸阳", "咸阳机场", "西安咸阳机场"] },
  { name: "南京禄口", fullName: "南京禄口国际机场", city: "南京", iata: "NKG", icao: "ZSNJ", aliases: ["南京", "禄口", "禄口机场", "南京禄口机场"] },
  { name: "武汉天河", fullName: "武汉天河国际机场", city: "武汉", iata: "WUH", icao: "ZHHH", aliases: ["武汉", "天河", "天河机场", "武汉天河机场"] },
  { name: "重庆江北", fullName: "重庆江北国际机场", city: "重庆", iata: "CKG", icao: "ZUCK", aliases: ["重庆", "江北", "江北机场", "重庆江北机场"] },
  { name: "合肥新桥", fullName: "合肥新桥国际机场", city: "合肥", iata: "HFE", icao: "ZSOF", aliases: ["合肥", "新桥", "新桥机场", "合肥新桥机场"] },
  { name: "厦门高崎", fullName: "厦门高崎国际机场", city: "厦门", iata: "XMN", icao: "ZSAM", aliases: ["厦门", "高崎", "高崎机场", "厦门高崎机场"] },
  { name: "长沙黄花", fullName: "长沙黄花国际机场", city: "长沙", iata: "CSX", icao: "ZGHA", aliases: ["长沙", "黄花", "黄花机场", "长沙黄花机场"] },
  { name: "郑州新郑", fullName: "郑州新郑国际机场", city: "郑州", iata: "CGO", icao: "ZHCC", aliases: ["郑州", "新郑", "新郑机场", "郑州新郑机场"] },
  { name: "昆明长水", fullName: "昆明长水国际机场", city: "昆明", iata: "KMG", icao: "ZPPP", aliases: ["昆明", "长水", "长水机场", "昆明长水机场"] },
  { name: "贵阳龙洞堡", fullName: "贵阳龙洞堡国际机场", city: "贵阳", iata: "KWE", icao: "ZUGY", aliases: ["贵阳", "龙洞堡", "龙洞堡机场"] },
  { name: "海口美兰", fullName: "海口美兰国际机场", city: "海口", iata: "HAK", icao: "ZJHK", aliases: ["海口", "美兰", "美兰机场"] },
  { name: "三亚凤凰", fullName: "三亚凤凰国际机场", city: "三亚", iata: "SYX", icao: "ZJSY", aliases: ["三亚", "凤凰", "凤凰机场"] },
  { name: "青岛胶东", fullName: "青岛胶东国际机场", city: "青岛", iata: "TAO", icao: "ZSQD", aliases: ["青岛", "胶东", "胶东机场"] },
  { name: "济南遥墙", fullName: "济南遥墙国际机场", city: "济南", iata: "TNA", icao: "ZSJN", aliases: ["济南", "遥墙", "遥墙机场"] },
  { name: "大连周水子", fullName: "大连周水子国际机场", city: "大连", iata: "DLC", icao: "ZYTL", aliases: ["大连", "周水子", "周水子机场"] },
  { name: "沈阳桃仙", fullName: "沈阳桃仙国际机场", city: "沈阳", iata: "SHE", icao: "ZYTX", aliases: ["沈阳", "桃仙", "桃仙机场"] },
  { name: "哈尔滨太平", fullName: "哈尔滨太平国际机场", city: "哈尔滨", iata: "HRB", icao: "ZYHB", aliases: ["哈尔滨", "太平", "太平机场"] },
  { name: "天津滨海", fullName: "天津滨海国际机场", city: "天津", iata: "TSN", icao: "ZBTJ", aliases: ["天津", "滨海", "滨海机场"] },
  { name: "石家庄正定", fullName: "石家庄正定国际机场", city: "石家庄", iata: "SJW", icao: "ZBSJ", aliases: ["石家庄", "正定", "正定机场"] },
  { name: "太原武宿", fullName: "太原武宿国际机场", city: "太原", iata: "TYN", icao: "ZBYN", aliases: ["太原", "武宿", "武宿机场"] },
  { name: "温州龙湾", fullName: "温州龙湾国际机场", city: "温州", iata: "WNZ", icao: "ZSWZ", aliases: ["温州", "龙湾", "龙湾机场"] },
  { name: "宁波栎社", fullName: "宁波栎社国际机场", city: "宁波", iata: "NGB", icao: "ZSNB", aliases: ["宁波", "栎社", "栎社机场"] },
  { name: "福州长乐", fullName: "福州长乐国际机场", city: "福州", iata: "FOC", icao: "ZSFZ", aliases: ["福州", "长乐", "长乐机场"] },
  { name: "南昌昌北", fullName: "南昌昌北国际机场", city: "南昌", iata: "KHN", icao: "ZSCN", aliases: ["南昌", "昌北", "昌北机场"] },
  { name: "南宁吴圩", fullName: "南宁吴圩国际机场", city: "南宁", iata: "NNG", icao: "ZGNN", aliases: ["南宁", "吴圩", "吴圩机场"] },
  { name: "兰州中川", fullName: "兰州中川国际机场", city: "兰州", iata: "LHW", icao: "ZLLL", aliases: ["兰州", "中川", "中川机场"] },
  { name: "乌鲁木齐地窝堡", fullName: "乌鲁木齐地窝堡国际机场", city: "乌鲁木齐", iata: "URC", icao: "ZWWW", aliases: ["乌鲁木齐", "地窝堡", "地窝堡机场"] },
  { name: "无锡硕放", fullName: "苏南硕放国际机场", city: "无锡", iata: "WUX", icao: "ZSWX", aliases: ["无锡", "硕放", "硕放机场", "苏南硕放"] },
  { name: "揭阳潮汕", fullName: "揭阳潮汕国际机场", city: "揭阳", iata: "SWA", icao: "ZGOW", aliases: ["揭阳", "潮汕", "潮汕机场"] },
  { name: "珠海金湾", fullName: "珠海金湾机场", city: "珠海", iata: "ZUH", icao: "ZGSD", aliases: ["珠海", "金湾", "金湾机场"] },
];

const AIRPORT_BY_ICAO = Object.create(null);
const AIRPORT_BY_IATA = Object.create(null);
const AIRPORT_ICAO = Object.create(null);

for (const airport of AIRPORTS) {
  AIRPORT_BY_ICAO[airport.icao] = airport;
  AIRPORT_BY_IATA[airport.iata] = airport;
  const aliases = [airport.name, airport.fullName, airport.city, airport.iata, airport.icao, ...airport.aliases];
  for (const alias of aliases) {
    const key = normalizeAirportToken(alias);
    if (key && !AIRPORT_ICAO[key]) AIRPORT_ICAO[key] = airport.icao;
  }
}

function normalizeAirportToken(name) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/国际机场$/, "机场")
    .replace(/机场$/, "")
    .replace(/市$/, "");
}

/** 城市/机场名/IATA/ICAO → 标准机场信息；无法识别返回 null。 */
function resolveAirport(name) {
  const value = normalizeAirportToken(name);
  if (!value) return null;
  if (/^[A-Z]{4}$/.test(value)) return AIRPORT_BY_ICAO[value] || null;
  if (/^[A-Z]{3}$/.test(value)) return AIRPORT_BY_IATA[value] || null;
  const icao = AIRPORT_ICAO[value];
  if (icao) return AIRPORT_BY_ICAO[icao] || null;
  const bySuffix = AIRPORTS.find((airport) =>
    [airport.name, airport.fullName, ...airport.aliases].some((alias) => {
      const token = normalizeAirportToken(alias);
      return token && token !== value && token.endsWith(value);
    })
  );
  return bySuffix || null;
}

/** 城市/机场名 → ICAO 码；已是 4 位字母码时原样返回，无法识别返回空串。 */
function resolveAirportIcao(name) {
  return resolveAirport(name)?.icao || "";
}

function airportFromIcao(icao) {
  return AIRPORT_BY_ICAO[String(icao || "").trim().toUpperCase()] || null;
}

// ---------- 本地航班时刻表（离线兜底 provider） ----------

const LOCAL_FLIGHT_SCHEDULES = [
  {
    flight_no: "HO2274",
    airline: "吉祥航空",
    operating_dates: ["2026-07-20"],
    dep_airport: "惠州平潭",
    arr_airport: "上海浦东",
    departure_time: "21:05",
    arrival_time: "23:25",
    source_note: "用户补充的历史机票记录",
  },
];

function lookupLocalFlight(flightNo, flightDate) {
  const normalizedNo = String(flightNo || "").trim().toUpperCase();
  const item = LOCAL_FLIGHT_SCHEDULES.find((flight) => {
    if (flight.flight_no !== normalizedNo) return false;
    if (Array.isArray(flight.operating_dates)) return flight.operating_dates.includes(flightDate);
    return true;
  });
  if (!item) return null;

  const depAirport = resolveAirport(item.dep_airport);
  const arrAirport = resolveAirport(item.arr_airport);
  return {
    ...item,
    depAirport,
    arrAirport,
    duration: formatDuration(item.departure_time, item.arrival_time),
  };
}

function formatDuration(startTime, endTime) {
  const start = parseTimeMinutes(startTime);
  const end = parseTimeMinutes(endTime);
  if (start == null || end == null) return "";
  const minutes = end >= start ? end - start : end + 24 * 60 - start;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}分钟`;
  return mins ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

function parseTimeMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function flightResultPayload({
  flightNo,
  airline,
  departureTime = "",
  arrivalTime = "",
  depAirport = null,
  arrAirport = null,
  duration = "",
  source,
  hint = "",
}) {
  return {
    flight_no: flightNo,
    airline,
    departure_time: departureTime,
    arrival_time: arrivalTime,
    duration,
    dep_airport: depAirport?.name || "",
    arr_airport: arrAirport?.name || "",
    dep_airport_name: depAirport?.fullName || "",
    arr_airport_name: arrAirport?.fullName || "",
    dep_airport_city: depAirport?.city || "",
    arr_airport_city: arrAirport?.city || "",
    dep_airport_iata: depAirport?.iata || "",
    arr_airport_iata: arrAirport?.iata || "",
    dep_airport_icao: depAirport?.icao || "",
    arr_airport_icao: arrAirport?.icao || "",
    source,
    hint,
  };
}

// ---------- 日期校验（航班历史动态通常只保留有限天数，这里放宽到今天+60天） ----------

function validateDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function validateFlightDate(dateStr) {
  if (!validateDate(dateStr)) {
    return { ok: false, error: "日期格式错误，请使用 YYYY-MM-DD 格式" };
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const queryDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);
  if (queryDate > maxDate) {
    return { ok: false, error: "暂不支持查询 60 天以后的航班（尚未生成动态数据）" };
  }
  return { ok: true, error: "" };
}

// ---------- 响应构造（与 ticket-service 对齐） ----------

function ok(data) {
  return { success: true, ...data };
}

function err(error, extra = {}) {
  return { success: false, error, ...extra };
}

// ---------- OpenSky provider ----------

class OpenSkyApiError extends Error {
  constructor(message, extra = {}) {
    super(message);
    this.extra = extra;
  }
}

function normalizeOpenSkyCredentials(credentials = {}) {
  const clientId = String(credentials.clientId || credentials.client_id || "").trim();
  const clientSecret = String(credentials.clientSecret || credentials.client_secret || "").trim();
  const proxyUrl = String(credentials.proxyUrl || credentials.proxy_url || "").trim();
  return { clientId, clientSecret, proxyUrl };
}

function resolveOpenSkyCredentials(credentials = {}) {
  const userCredentials = normalizeOpenSkyCredentials(credentials);
  if (userCredentials.clientId && userCredentials.clientSecret) return userCredentials;

  return normalizeOpenSkyCredentials({
    clientId: process.env.LEAVES_OPENSKY_CLIENT_ID,
    clientSecret: process.env.LEAVES_OPENSKY_CLIENT_SECRET,
    proxyUrl: process.env.LEAVES_OPENSKY_PROXY || process.env.LEAVES_HTTPS_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy,
  });
}

function hasOpenSkyCredentials(credentials) {
  const normalized = normalizeOpenSkyCredentials(credentials);
  return Boolean(normalized.clientId && normalized.clientSecret);
}

function tokenCacheKey(credentials) {
  return crypto
    .createHash("sha256")
    .update(`${credentials.clientId}\0${credentials.clientSecret}\0${credentials.proxyUrl || ""}`)
    .digest("hex");
}

function normalizeProxyUrl(rawProxyUrl) {
  const value = String(rawProxyUrl || "").trim();
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `http://${value}`);
  } catch (e) {
    throw new OpenSkyApiError("OpenSky 代理地址格式无效，请使用 http://host:port", {
      code: "invalid_proxy",
    });
  }
}

function proxyUrlForRequest(urlObj, explicitProxyUrl = "") {
  if (explicitProxyUrl) return normalizeProxyUrl(explicitProxyUrl);
  const proxyEnv =
    urlObj.protocol === "https:"
      ? process.env.LEAVES_HTTPS_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy
      : process.env.LEAVES_HTTP_PROXY || process.env.HTTP_PROXY || process.env.http_proxy;
  return normalizeProxyUrl(proxyEnv);
}

function proxyAuthHeader(proxyUrl) {
  if (!proxyUrl.username && !proxyUrl.password) return "";
  return `Basic ${Buffer.from(`${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`).toString("base64")}`;
}

function shouldUseProxy(urlObj, proxyUrl) {
  if (!proxyUrl) return false;
  const noProxy = String(process.env.NO_PROXY || process.env.no_proxy || "");
  if (!noProxy) return true;
  const hostname = urlObj.hostname.toLowerCase();
  return !noProxy
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule === "*") return true;
      if (rule.startsWith(".")) return hostname.endsWith(rule);
      return hostname === rule || hostname.endsWith(`.${rule}`);
    });
}

function proxySupportMessage() {
  return "检测到 OpenSky 域名被解析到 198.18/198.19 fake-ip，但 Leaves 后端没有走代理；请在账号设置里填写 Proxy URL（例如 http://127.0.0.1:7890），或设置 LEAVES_HTTPS_PROXY/HTTPS_PROXY 后重启服务。";
}

function isBenchmarkFakeIp(address) {
  return /^198\.(18|19)\./.test(String(address || ""));
}

function decorateNetworkError(error, urlObj, proxyUrl) {
  if (error instanceof OpenSkyApiError) return error;
  if (error.code === "EACCES" && isBenchmarkFakeIp(error.address)) {
    return new OpenSkyApiError(proxySupportMessage(), {
      code: "network_eacces_fake_ip",
      address: error.address,
      port: error.port || 443,
      proxyConfigured: Boolean(proxyUrl),
    });
  }
  if (error.code === "ECONNREFUSED" && proxyUrl) {
    return new OpenSkyApiError(`OpenSky 代理连接失败：${proxyUrl.host}，请检查代理是否运行。`, {
      code: "proxy_connection_refused",
      proxy: `${proxyUrl.protocol}//${proxyUrl.host}`,
    });
  }
  return error;
}

function makeProxyAgent(urlObj, proxyUrl) {
  if (urlObj.protocol !== "https:") return undefined;
  if (proxyUrl.protocol !== "http:") {
    throw new OpenSkyApiError("当前仅支持 http:// 代理地址", { code: "unsupported_proxy_protocol" });
  }

  const agent = new https.Agent({ keepAlive: false });
  agent.createConnection = (options, callback) => {
    let done = false;
    const finish = (error, socket) => {
      if (done) return;
      done = true;
      callback(error, socket);
    };

    const port = Number(urlObj.port || 443);
    const connectHeaders = {
      Host: `${urlObj.hostname}:${port}`,
    };
    const auth = proxyAuthHeader(proxyUrl);
    if (auth) connectHeaders["Proxy-Authorization"] = auth;

    const connectReq = http.request({
      host: proxyUrl.hostname,
      port: Number(proxyUrl.port || 80),
      method: "CONNECT",
      path: `${urlObj.hostname}:${port}`,
      headers: connectHeaders,
    });

    connectReq.setTimeout(OPENSKY_TIMEOUT, () => {
      connectReq.destroy(new OpenSkyApiError("OpenSky 代理连接超时", { code: "proxy_timeout" }));
    });
    connectReq.once("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        finish(new OpenSkyApiError(`OpenSky 代理 CONNECT 失败：HTTP ${res.statusCode}`, {
          code: "proxy_connect_failed",
          statusCode: res.statusCode,
        }));
        return;
      }

      const tlsSocket = tls.connect({
        socket,
        servername: urlObj.hostname,
        rejectUnauthorized: false,
      });
      tlsSocket.once("secureConnect", () => finish(null, tlsSocket));
      tlsSocket.once("error", finish);
    });
    connectReq.once("error", finish);
    connectReq.end();
  };
  return agent;
}

function httpRequest(url, { method = "GET", headers = {}, body = null, timeout = OPENSKY_TIMEOUT, proxyUrl = "" } = {}) {
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      reject(e);
      return;
    }

    let proxy;
    let agent;
    try {
      proxy = proxyUrlForRequest(urlObj, proxyUrl);
      if (shouldUseProxy(urlObj, proxy)) agent = makeProxyAgent(urlObj, proxy);
    } catch (e) {
      reject(e);
      return;
    }

    const lib = urlObj.protocol === "https:" ? https : http;
    const req = lib.request(
      urlObj,
      {
        method,
        headers,
        agent,
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          let raw = Buffer.concat(chunks);
          const encoding = String(res.headers["content-encoding"] || "");
          if (encoding.includes("gzip")) {
            try {
              raw = zlib.gunzipSync(raw);
            } catch (e) {
              /* 使用原始响应体 */
            }
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: raw.toString("utf8"),
            url,
          });
        });
      }
    );

    req.setTimeout(timeout, () => {
      req.destroy(new Error("请求超时"));
    });
    req.on("error", (error) => {
      reject(decorateNetworkError(error, urlObj, proxy));
    });
    if (body) req.write(body);
    req.end();
  });
}

async function requestOpenSkyToken(credentials) {
  const normalized = normalizeOpenSkyCredentials(credentials);
  if (!normalized.clientId || !normalized.clientSecret) {
    throw new OpenSkyApiError("请先配置 OpenSky clientId 和 clientSecret", { code: "missing_credentials" });
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: normalized.clientId,
    client_secret: normalized.clientSecret,
  }).toString();

  const resp = await httpRequest(OPENSKY_TOKEN_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
    body,
    proxyUrl: normalized.proxyUrl,
  });

  let payload = {};
  try {
    payload = JSON.parse(resp.body || "{}");
  } catch (e) {
    throw new OpenSkyApiError("OpenSky token 响应不是合法 JSON", {
      statusCode: resp.statusCode,
      detail: resp.body.slice(0, 200),
    });
  }

  if (resp.statusCode < 200 || resp.statusCode >= 300 || !payload.access_token) {
    throw new OpenSkyApiError(payload.error_description || payload.error || "OpenSky 凭证验证失败", {
      statusCode: resp.statusCode,
      code: "auth_failed",
    });
  }

  const expiresIn = Number(payload.expires_in || 1800);
  return {
    accessToken: payload.access_token,
    expiresIn,
    expiresAt: Date.now() + Math.max(30, expiresIn - TOKEN_REFRESH_MARGIN_SECONDS) * 1000,
  };
}

async function getOpenSkyToken(credentials) {
  const normalized = normalizeOpenSkyCredentials(credentials);
  const key = tokenCacheKey(normalized);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

  const token = await requestOpenSkyToken(normalized);
  tokenCache.set(key, token);
  return token.accessToken;
}

function clearOpenSkyToken(credentials) {
  const normalized = normalizeOpenSkyCredentials(credentials);
  if (normalized.clientId && normalized.clientSecret) tokenCache.delete(tokenCacheKey(normalized));
}

function buildOpenSkyUrl(pathname, params = {}) {
  const url = new URL(pathname, OPENSKY_API_ROOT);
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null && item !== "") url.searchParams.append(key, String(item));
      });
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function parseJsonBody(resp) {
  if (!resp.body) return null;
  try {
    return JSON.parse(resp.body);
  } catch (e) {
    throw new OpenSkyApiError("OpenSky 响应不是合法 JSON", {
      statusCode: resp.statusCode,
      detail: resp.body.slice(0, 200),
    });
  }
}

function rateLimitFromHeaders(headers = {}) {
  return {
    remaining: headers["x-rate-limit-remaining"] || "",
    retryAfterSeconds: headers["x-rate-limit-retry-after-seconds"] || "",
  };
}

async function openSkyGet(pathname, params, credentials = {}, retryOnUnauthorized = true) {
  const resolvedCredentials = resolveOpenSkyCredentials(credentials);
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };

  if (hasOpenSkyCredentials(resolvedCredentials)) {
    headers.Authorization = `Bearer ${await getOpenSkyToken(resolvedCredentials)}`;
  }

  const resp = await httpRequest(buildOpenSkyUrl(pathname, params), {
    headers,
    proxyUrl: resolvedCredentials.proxyUrl,
  });
  if (resp.statusCode === 401 && hasOpenSkyCredentials(resolvedCredentials) && retryOnUnauthorized) {
    clearOpenSkyToken(resolvedCredentials);
    return openSkyGet(pathname, params, resolvedCredentials, false);
  }
  return resp;
}

const OPENSKY_REST_OPERATIONS = {
  statesAll: {
    path: "/states/all",
    params: ["time", "icao24", "lamin", "lomin", "lamax", "lomax", "extended"],
    arrayParams: ["icao24"],
  },
  statesOwn: {
    path: "/states/own",
    params: ["time", "icao24", "serials"],
    arrayParams: ["icao24", "serials"],
    requiresAuth: true,
  },
  flightsAll: {
    path: "/flights/all",
    params: ["begin", "end"],
    required: ["begin", "end"],
    maxIntervalSeconds: 2 * 60 * 60,
  },
  flightsAircraft: {
    path: "/flights/aircraft",
    params: ["icao24", "begin", "end"],
    required: ["icao24", "begin", "end"],
    maxIntervalSeconds: 2 * 24 * 60 * 60,
  },
  flightsArrival: {
    path: "/flights/arrival",
    params: ["airport", "begin", "end"],
    required: ["airport", "begin", "end"],
    maxIntervalSeconds: 2 * 24 * 60 * 60,
  },
  flightsDeparture: {
    path: "/flights/departure",
    params: ["airport", "begin", "end"],
    required: ["airport", "begin", "end"],
    maxIntervalSeconds: 2 * 24 * 60 * 60,
  },
  track: {
    path: "/tracks",
    params: ["icao24", "time"],
    required: ["icao24", "time"],
  },
};

function parseOpenSkyInteger(value, name) {
  if (value == null || value === "") return "";
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new OpenSkyApiError(`${name} 必须是非负 Unix 秒时间戳`, { code: "invalid_param" });
  }
  return parsed;
}

function normalizeOpenSkyRestParams(operation, input = {}) {
  const params = {};
  for (const name of operation.params) {
    const value = input[name];
    if (value == null || value === "") continue;

    if (operation.arrayParams?.includes(name)) {
      params[name] = Array.isArray(value) ? value.filter((item) => item != null && item !== "") : [value];
      continue;
    }

    if (["time", "begin", "end"].includes(name)) {
      params[name] = parseOpenSkyInteger(value, name);
    } else if (name === "extended") {
      params[name] = Number(value) ? 1 : 0;
    } else if (["lamin", "lomin", "lamax", "lomax"].includes(name)) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new OpenSkyApiError(`${name} 必须是有效数字`, { code: "invalid_param" });
      }
      params[name] = parsed;
    } else {
      params[name] = String(value).trim();
    }
  }

  for (const name of operation.required || []) {
    if (params[name] == null || params[name] === "" || (Array.isArray(params[name]) && !params[name].length)) {
      throw new OpenSkyApiError(`缺少 OpenSky 参数：${name}`, { code: "missing_param" });
    }
  }

  if (operation.maxIntervalSeconds && params.begin != null && params.end != null) {
    if (params.end <= params.begin) {
      throw new OpenSkyApiError("end 必须晚于 begin", { code: "invalid_interval" });
    }
    if (params.end - params.begin > operation.maxIntervalSeconds) {
      throw new OpenSkyApiError(`该 OpenSky 接口查询时间范围不能超过 ${operation.maxIntervalSeconds} 秒`, {
        code: "interval_too_large",
      });
    }
  }

  if (params.icao24 && !Array.isArray(params.icao24)) {
    params.icao24 = String(params.icao24).trim().toLowerCase();
  }
  if (Array.isArray(params.icao24)) {
    params.icao24 = params.icao24.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  }
  if (params.airport) params.airport = String(params.airport).trim().toUpperCase();
  return params;
}

async function testOpenSkyCredentialsValidated(args = {}) {
  const credentials = normalizeOpenSkyCredentials(args);
  const token = await requestOpenSkyToken(credentials);
  tokenCache.set(tokenCacheKey(credentials), token);
  return ok({
    authenticated: true,
    expiresIn: token.expiresIn,
  });
}

async function openskyRestRequestValidated(args = {}, context = {}) {
  const operationName = String(args.operation || "").trim();
  const operation = OPENSKY_REST_OPERATIONS[operationName];
  if (!operation) {
    return err("未知 OpenSky REST 操作", {
      operations: Object.keys(OPENSKY_REST_OPERATIONS),
    });
  }

  const credentials = resolveOpenSkyCredentials(context.openskyCredentials || args.openskyCredentials || {});
  if (operation.requiresAuth && !hasOpenSkyCredentials(credentials)) {
    return err("该 OpenSky 接口需要先配置 clientId/clientSecret", { needsCredentials: true });
  }

  let params;
  try {
    params = normalizeOpenSkyRestParams(operation, args.params || {});
  } catch (e) {
    return err(e.message, e.extra || {});
  }

  let resp;
  try {
    resp = await openSkyGet(operation.path, params, credentials);
  } catch (e) {
    if (e instanceof OpenSkyApiError) return err(e.message, e.extra || {});
    return err(`OpenSky 请求失败：${e.message}`);
  }

  const rateLimit = rateLimitFromHeaders(resp.headers);
  if (resp.statusCode === 404) {
    return ok({
      operation: operationName,
      statusCode: 404,
      data: Array.isArray(parseJsonBody({ ...resp, body: resp.body || "[]" })) ? [] : null,
      rateLimit,
      hint: "OpenSky 未找到该时间范围内的数据",
    });
  }
  if (resp.statusCode === 401) {
    return err("OpenSky 认证失败，请检查 clientId/clientSecret", {
      statusCode: resp.statusCode,
      needsCredentials: true,
      rateLimit,
    });
  }
  if (resp.statusCode === 429) {
    return err("OpenSky API 额度已用尽，请稍后再试", {
      statusCode: resp.statusCode,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      rateLimit,
    });
  }
  if (resp.statusCode < 200 || resp.statusCode >= 300) {
    return err(`OpenSky API 返回 ${resp.statusCode}`, {
      statusCode: resp.statusCode,
      detail: resp.body.slice(0, 200),
      rateLimit,
    });
  }

  let data;
  try {
    data = parseJsonBody(resp);
  } catch (e) {
    return err(e.message, e.extra || {});
  }
  return ok({
    operation: operationName,
    statusCode: resp.statusCode,
    data,
    rateLimit,
    authenticated: hasOpenSkyCredentials(credentials),
  });
}

function formatTime(unixSeconds) {
  if (!unixSeconds) return "";
  const dt = new Date(unixSeconds * 1000);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

/** 查询单个机场的到/离港记录，按 callsign 匹配航班号（401/限流时返回 null 或结构化错误）。 */
async function fetchOpenSkyFlight(pathname, airportIcao, begin, end, callsigns, credentials) {
  let resp;
  try {
    resp = await openSkyGet(pathname, { airport: airportIcao, begin, end }, credentials);
  } catch (e) {
    if (e instanceof OpenSkyApiError) throw e;
    return null;
  }
  if (resp.statusCode === 404) return null;
  if (resp.statusCode === 401) {
    throw new OpenSkyApiError("OpenSky 认证失败，请检查 clientId/clientSecret", {
      statusCode: resp.statusCode,
      code: "auth_failed",
    });
  }
  if (resp.statusCode === 429) {
    throw new OpenSkyApiError("OpenSky API 额度已用尽，请稍后再试", {
      statusCode: resp.statusCode,
      code: "rate_limited",
      retryAfterSeconds: resp.headers["x-rate-limit-retry-after-seconds"] || "",
    });
  }
  if (resp.statusCode !== 200) return null;

  const list = parseJsonBody(resp);
  if (!Array.isArray(list)) return null;

  const targets = new Set(callsigns.map((item) => String(item || "").trim().toUpperCase()));
  return list.find((f) => targets.has(String(f.callsign || "").trim().toUpperCase())) || null;
}

/** 通过 OpenSky 到离港记录查询航班（需要用户提供机场 ICAO 码）。
 * 返回 { departureTime, arrivalTime, estDepartureIcao, estArrivalIcao, source } 或 null。 */
async function queryOpenSky(flightNo, flightDate, depAirportIcao, arrAirportIcao, credentials) {
  const [y, m, d] = flightDate.split("-").map(Number);
  // 覆盖当日全天（含跨天到达），本地时区换算为 Unix 秒
  const begin = Math.floor(new Date(y, m - 1, d, 0, 0, 0).getTime() / 1000);
  const end = Math.floor(new Date(y, m - 1, d + 1, 6, 0, 0).getTime() / 1000);
  const callsigns = callsignCandidates(flightNo);

  let arrival = null;
  let departure = null;

  if (arrAirportIcao) {
    arrival = await fetchOpenSkyFlight(OPENSKY_ARRIVALS_PATH, arrAirportIcao, begin, end, callsigns, credentials);
  }
  if (depAirportIcao) {
    departure = await fetchOpenSkyFlight(OPENSKY_DEPARTURES_PATH, depAirportIcao, begin, end, callsigns, credentials);
  }

  const hit = arrival || departure;
  if (!hit) return null;

  return {
    departureTime: formatTime(hit.estimatedDepartureTime || hit.firstSeen || (departure && departure.firstSeen)),
    arrivalTime: formatTime(hit.estimatedArrivalTime || hit.lastSeen || (arrival && arrival.lastSeen)),
    estDepartureIcao:
      hit.estDepartureAirport || hit.estDepartureIcao || (departure && departure.estDepartureAirport) || depAirportIcao || "",
    estArrivalIcao:
      hit.estArrivalAirport || hit.estArrivalIcao || (arrival && arrival.estArrivalAirport) || arrAirportIcao || "",
    callsign: String(hit.callsign || "").trim(),
    icao24: hit.icao24 || "",
    source: "opensky",
  };
}

// ========== 航班查询入口 ==========

/** 按航班号+日期查询航班信息。
 * 参数：flight_no（必填）、flight_date（必填 YYYY-MM-DD）、dep_airport_icao / arr_airport_icao（可选）。
 * 查询顺序：本地航班表 → OpenSky（需要机场）→ 本地航司解析。 */
async function searchFlightValidated(args) {
  const flightNo = String(args.flight_no || "").trim().toUpperCase();
  const flightDate = String(args.flight_date || "").trim();
  // 机场参数支持名称（惠州 / 上海浦东）或 ICAO 码（ZGHZ），名称走字典解析
  const depAirport = resolveAirport(args.dep_airport_icao || args.dep_airport);
  const arrAirport = resolveAirport(args.arr_airport_icao || args.arr_airport);
  const depIcao = depAirport?.icao || "";
  const arrIcao = arrAirport?.icao || "";
  const openskyCredentials = resolveOpenSkyCredentials(args.openskyCredentials || {});

  if (!/^[A-Z0-9]{2}\d{3,4}$/.test(flightNo)) {
    return err("航班号格式无效（如 HO2274、CA1234）");
  }

  const dateCheck = validateFlightDate(flightDate);
  if (!dateCheck.ok) return err(dateCheck.error);

  const airline = getAirlineName(flightNo);

  const localFlight = lookupLocalFlight(flightNo, flightDate);
  if (localFlight) {
    return ok(
      flightResultPayload({
        flightNo,
        airline: localFlight.airline || airline,
        departureTime: localFlight.departure_time,
        arrivalTime: localFlight.arrival_time,
        depAirport: localFlight.depAirport,
        arrAirport: localFlight.arrAirport,
        duration: localFlight.duration,
        source: "local-timetable",
        hint: localFlight.source_note || "",
      })
    );
  }

  // 无机场 ICAO 码时 OpenSky 无法定位到离港记录，仅返回本地航司信息
  if (!depIcao && !arrIcao) {
    return ok(
      flightResultPayload({
        flightNo,
        airline,
        source: "local",
        hint: "本地航班表未收录该航班，且未提供机场；请填写起降机场或接入正式航班 provider。",
      })
    );
  }

  let online;
  try {
    online = await queryOpenSky(flightNo, flightDate, depIcao, arrIcao, openskyCredentials);
  } catch (e) {
    if (e instanceof OpenSkyApiError) {
      return err(e.message, {
        flight_no: flightNo,
        airline,
        provider_failed: true,
        ...(e.extra || {}),
      });
    }
    return err(`OpenSky 请求失败：${e.message}`, {
      flight_no: flightNo,
      airline,
      provider_failed: true,
    });
  }
  if (!online) {
    return err("OpenSky 未查询到该航班（可能需要凭证、机场 ICAO 码或该日期无 ADS-B 记录）", {
      flight_no: flightNo,
      airline,
      provider_failed: true,
    });
  }

  return ok(
    flightResultPayload({
      flightNo,
      airline,
      departureTime: online.departureTime,
      arrivalTime: online.arrivalTime,
      depAirport: airportFromIcao(online.estDepartureIcao) || depAirport,
      arrAirport: airportFromIcao(online.estArrivalIcao) || arrAirport,
      duration: formatDuration(online.departureTime, online.arrivalTime),
      source: online.source,
    })
  );
}

module.exports = {
  AIRLINES,
  AIRPORTS,
  AIRPORT_ICAO,
  AIRLINE_CALLSIGN_PREFIXES,
  getAirlineName,
  callsignCandidates,
  resolveAirport,
  resolveAirportIcao,
  lookupLocalFlight,
  openskyRestRequestValidated,
  testOpenSkyCredentialsValidated,
  searchFlightValidated,
};
