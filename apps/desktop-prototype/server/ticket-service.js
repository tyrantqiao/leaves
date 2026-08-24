// 票务查询核心 —— 移植自 mcp-server-12306（MIT License, https://github.com/drfccv/mcp-server-12306）
// 车次号转换 / 经停站 / 中转换乘 / 车站搜索 / 当前时间。
"use strict";

const { HTTP_URLS, USER_AGENT, getJson, httpGet, ApiError, RetryExhaustedError } = require("./12306-client");
const stationService = require("./station-service");

// 12306 官网搜索接口：按车次号直接定位（无需起讫区间），返回始发/终到站与官方编号
const SEARCH_URL = "https://search.12306.cn/search/v1/train/search";

// ---------- 日期校验（12306 预售期为今天到 14 天后） ----------

function validateDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function validateDateNotPast(dateStr) {
  if (!validateDate(dateStr)) {
    return { ok: false, error: "日期格式错误，请使用 YYYY-MM-DD 格式" };
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const queryDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 14);

  if (queryDate < today) {
    return { ok: false, error: `出发日期不能早于今天（${formatDate(today)}），12306无法查询历史日期的车次信息` };
  }
  if (queryDate > maxDate) {
    return { ok: false, error: `出发日期不能晚于${formatDate(maxDate)}，12306仅支持提前14天购票` };
  }
  return { ok: true, error: "" };
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ---------- 响应构造 ----------

function ok(data) {
  return { success: true, ...data };
}

function err(error, extra = {}) {
  return { success: false, error, ...extra };
}

// ---------- 字段提取 ----------

/** 从 12306 记录中提取非空座位字段，可选排除占位值（如 '--'）。 */
function extractSeats(record, mapping, exclude) {
  const result = {};
  for (const [field, name] of Object.entries(mapping)) {
    const value = record[field];
    if (value && value !== exclude) {
      result[name] = value;
    }
  }
  return result;
}

// 中转方案座位字段 → 输出键名映射
const TRANSFER_SEAT_MAP = {
  swz_num: "商务座",
  tz_num: "特等座",
  zy_num: "一等座",
  ze_num: "二等座",
  gr_num: "高级软卧",
  rw_num: "软卧",
  rz_num: "一等卧",
  yw_num: "硬卧",
  yz_num: "硬座",
  wz_num: "无座",
};

/** 站名/三字码 → 三字码，无法识别时附带模糊搜索建议。 */
async function ensureTelecode(value) {
  return stationService.getStationCode(value);
}

function stationSuggestions(value) {
  return stationService.searchStations(value, 3).map((s) => ({
    name: s.name,
    code: s.code,
    pinyin: s.pinyin,
    py_short: s.pyShort,
  }));
}

/** 按车次号直接定位车次：返回始发/终到站与官方编号（无需用户提供区间）。 */
async function findTrainByCode(trainCode, trainDate) {
  const dateCompact = String(trainDate || "").replace(/-/g, "");
  const resp = await httpGet(SEARCH_URL, {
    params: { keyword: trainCode, date: dateCompact },
    headers: { Referer: "https://www.12306.cn/", "User-Agent": USER_AGENT },
    useDefaultHeaders: false
  });
  let parsed;
  try {
    parsed = JSON.parse(resp.body);
  } catch (e) {
    return null;
  }
  if (!parsed || parsed.status !== true || !Array.isArray(parsed.data) || !parsed.data.length) return null;
  const item = parsed.data[0];
  if (!item || !item.from_station || !item.to_station) return null;
  return {
    train_no: item.train_no || item.station_train_code || trainCode,
    train_code: item.station_train_code || trainCode,
    from_station: item.from_station,
    to_station: item.to_station,
    total_num: item.total_num || 0
  };
}

// ========== 1. 车站搜索 ==========

async function searchStationsValidated(args) {
  const query = String(args.query || "").trim();
  const limit = Number.isInteger(args.limit) && args.limit >= 1 && args.limit <= 50 ? args.limit : 10;

  if (!query) return err("请输入搜索关键词");

  const matches = stationService.searchStations(query, limit);
  if (!matches.length) {
    return err("未找到匹配的车站", {
      query,
      count: 0,
      stations: [],
      suggestions: ["尝试完整城市名称 (如: 北京)", "尝试拼音 (如: beijing)", "尝试简拼 (如: bj)", "检查拼写是否正确"],
    });
  }

  return ok({
    query,
    count: matches.length,
    stations: matches.map((s) => ({ name: s.name, code: s.code, pinyin: s.pinyin, py_short: s.pyShort })),
  });
}

// ========== 2. 车次号 → 官方唯一编号 ==========

async function getTrainNoByTrainCodeValidated(args) {
  const trainCode = String(args.train_code || "").trim().toUpperCase();
  let fromStation = String(args.from_station || "").trim().toUpperCase();
  let toStation = String(args.to_station || "").trim().toUpperCase();
  const trainDate = String(args.train_date || "").trim();

  const check = validateDateNotPast(trainDate);
  if (!check.ok) return err(check.error);

  const fromCode = await ensureTelecode(fromStation);
  if (!fromCode) return err(`出发站无效或无法识别：${fromStation}`);
  fromStation = fromCode;

  const toCode = await ensureTelecode(toStation);
  if (!toCode) return err(`到达站无效或无法识别：${toStation}`);
  toStation = toCode;

  let ticketsData;
  try {
    const json = await getJson("车次号转换", HTTP_URLS.query_left_ticket, {
      "leftTicketDTO.train_date": trainDate,
      "leftTicketDTO.from_station": fromStation,
      "leftTicketDTO.to_station": toStation,
      purpose_codes: "ADULT",
    });
    ticketsData = (json.data && json.data.result) || [];
  } catch (e) {
    return handleApiError(e, "车次号转换");
  }

  if (!ticketsData.length) {
    return err(`未找到该线路的车次数据（${fromStation}->${toStation} ${trainDate}）`);
  }

  let found = null;
  const debugCodes = [];
  for (const ticketStr of ticketsData) {
    const parts = ticketStr.split("|");
    const idx = parts.indexOf("预订");
    if (idx < 0) continue;
    const info = { train_no: parts[idx + 1].trim(), train_code: parts[idx + 2].trim().toUpperCase() };
    debugCodes.push(info.train_code);
    if (info.train_code === trainCode) {
      found = info.train_no;
      break;
    }
  }

  if (!found) {
    return err("未找到该车次号的列车编号", {
      train_code: trainCode,
      from_station: fromStation,
      to_station: toStation,
      train_date: trainDate,
      available_trains: debugCodes,
    });
  }

  return ok({ train_code: trainCode, train_no: found, from_station: fromStation, to_station: toStation, train_date: trainDate });
}

// ========== 3. 经停站查询 ==========

async function getTrainRouteStationsValidated(args) {
  try {
    let trainNo = String(args.train_no || "").trim();
    let fromStation = String(args.from_station || "").trim().toUpperCase();
    let toStation = String(args.to_station || "").trim().toUpperCase();
    const trainDate = String(args.train_date || "").trim();

    if (!trainNo) return err("车次编号(train_no)不能为空");
    if (!trainDate) return err("出发日期不能为空");

    const check = validateDateNotPast(trainDate);
    if (!check.ok) return err(check.error);

    // 用户提供区间时转三字码；纯车次号可省略区间（由 search 接口自动定位）
    const hasUserRoute = fromStation && fromStation !== "待确认" && toStation && toStation !== "待确认";
    let fromCode = hasUserRoute ? await ensureTelecode(fromStation) : null;
    let toCode = hasUserRoute ? await ensureTelecode(toStation) : null;
    if (hasUserRoute && (!fromCode || !toCode)) {
      return err(`车站无效或无法识别：${!fromCode ? fromStation : toStation}`);
    }

    // 车次号：优先用官方搜索接口直接定位（支持无区间输入）
    const isTrainCode = /^[A-Z]+\d+$/.test(trainNo);
    if (isTrainCode) {
      if (!fromCode || !toCode) {
        const found = await findTrainByCode(trainNo, trainDate);
        if (found && found.train_no && found.from_station && found.to_station) {
          trainNo = found.train_no;
          fromStation = found.from_station;
          toStation = found.to_station;
          fromCode = await ensureTelecode(found.from_station);
          toCode = await ensureTelecode(found.to_station);
        }
      }

      // 仍有区间但无官方编号：用 12306 leftTicket 数据转换
      if (fromCode && toCode && !/^\d/.test(trainNo)) {
        const convertResult = await getTrainNoByTrainCodeValidated({
          train_code: trainNo,
          from_station: fromCode,
          to_station: toCode,
          train_date: trainDate,
        });
        if (!convertResult.success) return convertResult;
        trainNo = convertResult.train_no;
      }

      if (!fromCode || !toCode) {
        return err(`无法定位车次 ${trainNo} 的区间信息，请补充起讫站后重试`);
      }
    } else if (!fromCode || !toCode) {
      return err("使用列车编号查询时必须提供起讫站");
    }

    let jsonData;
    try {
      jsonData = await getJson("查询经停站", HTTP_URLS.query_route_stations, {
        train_no: trainNo,
        from_station_telecode: fromStation,
        to_station_telecode: toStation,
        depart_date: trainDate,
      });
    } catch (e) {
      return handleApiError(e, "查询经停站");
    }

    if (!jsonData || !jsonData.data) return err("12306 接口返回空数据");

    const data = jsonData.data;
    let stations = data.data || [];
    if (!stations.length && data.middleList) {
      stations = data.middleList.flatMap((m) => m.fullList || []);
    }
    if (!stations.length && data.fullList) stations = data.fullList;
    if (!stations.length && data.route) stations = data.route;

    if (!stations.length) return err("未找到经停站信息", { train_no: trainNo });

    return ok({
      train_no: trainNo,
      train_date: trainDate,
      count: stations.length,
      stations: stations.map((s) => ({
        station_no: s.station_no || s.from_station_no || "",
        station_name: s.station_name || s.from_station_name || "",
        arrive_time: s.arrive_time || "----",
        start_time: s.start_time || "----",
        stopover_time: s.stopover_time || "----",
      })),
    });
  } catch (e) {
    return err("查询经停站失败", { detail: `${e.constructor.name}: ${e.message}` });
  }
}

// ========== 4. 中转换乘查询 ==========

async function queryTransferValidated(args) {
  try {
    const fromStation = String(args.from_station || "").trim();
    const toStation = String(args.to_station || "").trim();
    const trainDate = String(args.train_date || "").trim();
    const middleStation = String(args.middle_station || "").trim();
    const isShowWZ = (String(args.isShowWZ || "N").trim().toUpperCase() || "N");
    const purposeCodes = (String(args.purpose_codes || "00").trim().toUpperCase() || "00");

    if (!fromStation || !toStation || !trainDate) return err("请输入出发站、到达站和出发日期");

    const check = validateDateNotPast(trainDate);
    if (!check.ok) return err(check.error);

    const fromCode = await ensureTelecode(fromStation);
    if (!fromCode) return err(`出发站无效或无法识别：${fromStation}`);
    const toCode = await ensureTelecode(toStation);
    if (!toCode) return err(`到达站无效或无法识别：${toStation}`);

    let middleStationCode = "";
    if (middleStation) {
      middleStationCode = (await ensureTelecode(middleStation)) || middleStation;
    }

    let allTransferList = [];
    try {
      // 分页抓取全部中转方案（每页 10 条）
      allTransferList = await fetchAllTransfers({
        trainDate,
        fromCode,
        toCode,
        middleStationCode,
        isShowWZ,
        purposeCodes,
      });
    } catch (e) {
      return handleApiError(e, "中转查询");
    }

    if (!allTransferList.length) {
      return err("未查到中转方案", { from_station: fromStation, to_station: toStation, train_date: trainDate, count: 0, transfers: [] });
    }

    const transfers = [];
    for (const item of allTransferList) {
      try {
        const fullList = item.fullList || item.trainList || [];
        if (fullList.length < 2) continue;
        transfers.push({
          middle_station: item.middle_station_name || fullList[0].to_station_name || "",
          wait_time: item.wait_time || "",
          total_duration: item.all_lishi || "",
          segments: fullList.map((seg) => ({
            train_code: seg.station_train_code || "",
            from_station: seg.from_station_name || "",
            to_station: seg.to_station_name || "",
            start_time: seg.start_time || "",
            arrive_time: seg.arrive_time || "",
            duration: seg.lishi || "",
            seats: extractSeats(seg, TRANSFER_SEAT_MAP, "--"),
          })),
        });
      } catch (e) {
        console.warn(`[12306] 解析中转方案失败: ${e.message}`);
      }
    }

    return ok({ from_station: fromStation, to_station: toStation, train_date: trainDate, count: transfers.length, transfers });
  } catch (e) {
    return err("查询中转失败", { detail: `${e.constructor.name}: ${e.message}` });
  }
}

/** 中转分页抓取（每页 10 条，直到取完）。 */
async function fetchAllTransfers({ trainDate, fromCode, toCode, middleStationCode, isShowWZ, purposeCodes }) {
  const all = [];
  const pageSize = 10;
  let resultIndex = 0;

  while (true) {
    const json = await getJson("中转查询", HTTP_URLS.query_transfer, {
      train_date: trainDate,
      from_station_telecode: fromCode,
      to_station_telecode: toCode,
      middle_station: middleStationCode,
      result_index: String(resultIndex),
      can_query: "Y",
      isShowWZ,
      purpose_codes: purposeCodes,
      channel: "E",
    });
    const transferList = (json.data && json.data.middleList) || [];
    if (!transferList.length) break;
    all.push(...transferList);
    if (transferList.length < pageSize) break;
    resultIndex += pageSize;
  }
  return all;
}

// ========== 5. 当前时间 ==========

async function getCurrentTimeValidated() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return ok({
    timezone: "Asia/Shanghai",
    datetime: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    date: formatDate(now),
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    timestamp: Math.floor(now.getTime() / 1000),
  });
}

// ---------- 错误统一处理 ----------

function handleApiError(e, operation) {
  if (e instanceof ApiError) {
    return err(e.message, e.extra);
  }
  if (e instanceof RetryExhaustedError) {
    return err(e.message);
  }
  console.error(`[12306] ${operation} 失败: ${e.constructor.name}: ${e.message}`);
  return err(`${operation}失败`, { detail: `${e.constructor.name}: ${e.message}` });
}

module.exports = {
  searchStationsValidated,
  getTrainNoByTrainCodeValidated,
  getTrainRouteStationsValidated,
  queryTransferValidated,
  getCurrentTimeValidated,
  findTrainByCode,
  stationService,
};
