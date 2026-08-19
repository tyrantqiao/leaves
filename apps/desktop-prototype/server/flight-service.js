// 航班查询服务 —— 航司字典（本地）+ OpenSky provider（可选凭证）
// 与铁路链路对齐：查询失败时返回结构化错误，由前端降级为手动补录。
"use strict";

const { httpGet, USER_AGENT } = require("./12306-client");

// OpenSky Network REST API（历史到离港记录）。匿名额度受限，
// 可通过环境变量 LEAVES_OPENSKY_USER / LEAVES_OPENSKY_PASS 提供 Basic 凭证提升可用性。
const OPENSKY_ARRIVALS_URL = "https://opensky-network.org/api/flights/arrivals";
const OPENSKY_DEPARTURES_URL = "https://opensky-network.org/api/flights/departures";

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

function getAirlineName(flightNo) {
  return AIRLINES[String(flightNo).slice(0, 2).toUpperCase()] || "";
}

// ---------- 机场字典（城市/机场名 → ICAO，供 OpenSky 到离港查询定位机场） ----------

const AIRPORT_ICAO = {
  "北京首都": "ZBAA",
  "北京大兴": "ZBAD",
  北京: "ZBAA",
  "上海浦东": "ZSPD",
  "上海虹桥": "ZSSS",
  上海: "ZSPD",
  杭州: "ZSHC",
  广州: "ZGGG",
  深圳: "ZGSZ",
  成都: "ZUUU",
  "成都天府": "ZUTF",
  西安: "ZLXY",
  南京: "ZSNJ",
  武汉: "ZHHH",
  重庆: "ZUCK",
  惠州: "ZGHZ",
  合肥: "ZSOF",
  厦门: "ZSAM",
  长沙: "ZGHA",
  郑州: "ZHCC",
  昆明: "ZPPP",
  贵阳: "ZUGY",
  海口: "ZJHK",
  三亚: "ZJSY",
  青岛: "ZSQD",
  济南: "ZSJN",
  大连: "ZYTL",
  沈阳: "ZYTX",
  哈尔滨: "ZYHB",
  天津: "ZBTJ",
  石家庄: "ZBSJ",
  太原: "ZBYN",
  温州: "ZSWZ",
  宁波: "ZSNB",
  福州: "ZSFZ",
  南昌: "ZSCN",
  南宁: "ZGNN",
  兰州: "ZLLL",
  乌鲁木齐: "ZWWW",
  无锡: "ZSWX",
  揭阳潮汕: "ZGOW",
  珠海: "ZGSD",
};

/** 城市/机场名 → ICAO 码；已是 4 位字母码时原样返回，无法识别返回空串。 */
function resolveAirportIcao(name) {
  const value = String(name || "")
    .trim()
    .replace(/机场$/, "")
    .replace(/市$/, "");
  if (!value) return "";
  if (/^[A-Z]{4}$/i.test(value)) return value.toUpperCase();
  if (AIRPORT_ICAO[value]) return AIRPORT_ICAO[value];
  // 后缀回退："浦东"/"浦东机场" → "上海浦东"，"首都" → "北京首都"
  const bySuffix = Object.keys(AIRPORT_ICAO).find((key) => key !== value && key.endsWith(value));
  return bySuffix ? AIRPORT_ICAO[bySuffix] : "";
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

function formatTime(unixSeconds) {
  if (!unixSeconds) return "";
  const dt = new Date(unixSeconds * 1000);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

/** 查询单个机场的到/离港记录，按 callsign 匹配航班号（匿名 401/限流时返回 null）。 */
async function fetchOpenSkyFlight(url, airportIcao, begin, end, callsign) {
  const headers = { "User-Agent": USER_AGENT };
  const user = process.env.LEAVES_OPENSKY_USER;
  const pass = process.env.LEAVES_OPENSKY_PASS;
  if (user && pass) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  }

  let resp;
  try {
    resp = await httpGet(url, {
      params: { airport: airportIcao, begin: String(begin), end: String(end) },
      headers,
      useDefaultHeaders: false,
    });
  } catch (e) {
    return null;
  }
  if (resp.statusCode !== 200) return null;

  let list;
  try {
    list = JSON.parse(resp.body);
  } catch (e) {
    return null;
  }
  if (!Array.isArray(list)) return null;

  return (
    list.find((f) => String(f.callsign || "").trim().toUpperCase() === callsign) || null
  );
}

/** 通过 OpenSky 到离港记录查询航班（需要用户提供机场 ICAO 码）。
 * 返回 { departureTime, arrivalTime, estDepartureIcao, estArrivalIcao, source } 或 null。 */
async function queryOpenSky(flightNo, flightDate, depAirportIcao, arrAirportIcao) {
  const [y, m, d] = flightDate.split("-").map(Number);
  // 覆盖当日全天（含跨天到达），本地时区换算为 Unix 秒
  const begin = Math.floor(new Date(y, m - 1, d, 0, 0, 0).getTime() / 1000);
  const end = Math.floor(new Date(y, m - 1, d + 1, 6, 0, 0).getTime() / 1000);
  const callsign = flightNo.toUpperCase();

  let arrival = null;
  let departure = null;

  if (arrAirportIcao) {
    arrival = await fetchOpenSkyFlight(OPENSKY_ARRIVALS_URL, arrAirportIcao, begin, end, callsign);
  }
  if (depAirportIcao) {
    departure = await fetchOpenSkyFlight(OPENSKY_DEPARTURES_URL, depAirportIcao, begin, end, callsign);
  }

  const hit = arrival || departure;
  if (!hit) return null;

  return {
    departureTime: formatTime(hit.estimatedDepartureTime || (departure && departure.firstSeen)),
    arrivalTime: formatTime(hit.estimatedArrivalTime || (arrival && arrival.lastSeen)),
    estDepartureIcao: hit.estDepartureIcao || (departure && departure.estArrivalIcao) || depAirportIcao || "",
    estArrivalIcao: hit.estArrivalIcao || arrAirportIcao || "",
    source: "opensky",
  };
}

// ========== 航班查询入口 ==========

/** 按航班号+日期查询航班信息。
 * 参数：flight_no（必填）、flight_date（必填 YYYY-MM-DD）、dep_airport_icao / arr_airport_icao（可选）。
 * 航司名始终由本地字典解析；时刻/机场依赖 OpenSky，缺凭证或未命中时返回 provider_failed。 */
async function searchFlightValidated(args) {
  const flightNo = String(args.flight_no || "").trim().toUpperCase();
  const flightDate = String(args.flight_date || "").trim();
  // 机场参数支持名称（惠州 / 上海浦东）或 ICAO 码（ZGHZ），名称走字典解析
  const depIcao = resolveAirportIcao(args.dep_airport_icao || args.dep_airport);
  const arrIcao = resolveAirportIcao(args.arr_airport_icao || args.arr_airport);

  if (!/^[A-Z0-9]{2}\d{3,4}$/.test(flightNo)) {
    return err("航班号格式无效（如 HO2274、CA1234）");
  }

  const dateCheck = validateFlightDate(flightDate);
  if (!dateCheck.ok) return err(dateCheck.error);

  const airline = getAirlineName(flightNo);

  // 无机场 ICAO 码时 OpenSky 无法定位到离港记录，仅返回本地航司信息
  if (!depIcao && !arrIcao) {
    return ok({
      flight_no: flightNo,
      airline,
      departure_time: "",
      arrival_time: "",
      source: "local",
      hint: "未提供机场 ICAO 码，仅解析出航司信息；时刻与机场需手动补全。",
    });
  }

  const online = await queryOpenSky(flightNo, flightDate, depIcao, arrIcao);
  if (!online) {
    return err("OpenSky 未查询到该航班（可能需要凭证、机场 ICAO 码或该日期无 ADS-B 记录）", {
      flight_no: flightNo,
      airline,
      provider_failed: true,
    });
  }

  return ok({
    flight_no: flightNo,
    airline,
    departure_time: online.departureTime,
    arrival_time: online.arrivalTime,
    dep_airport_icao: online.estDepartureIcao,
    arr_airport_icao: online.estArrivalIcao,
    source: online.source,
  });
}

module.exports = {
  AIRLINES,
  AIRPORT_ICAO,
  getAirlineName,
  resolveAirportIcao,
  searchFlightValidated,
};
