// 车站数据服务 —— 移植自 mcp-server-12306（MIT License, https://github.com/drfccv/mcp-server-12306）
// 解析 12306 官方车站列表 JS，支持中文名/拼音/简拼/三字码的精确与模糊搜索。
"use strict";

const fs = require("fs");
const path = require("path");

const RESOURCE_PATH = path.join(__dirname, "resources", "station_name.js");

const stations = [];

function isCode(value) {
  return /^[A-Z]{3}$/.test(value);
}

function isPinyin(value) {
  return /^[a-z]{2,}$/.test(value);
}

function isPyShort(value) {
  return /^[a-z]{1,8}$/.test(value);
}

/** 解析 12306 车站 JS（@id|站名|三字码|拼音|简拼|编号|区域码|城市|...），带字段顺序自动修正。 */
function parseStationContent(content) {
  const match = content.match(/var station_names ?= ?'(.*?)';/s) || content.match(/'(@[^']+)';/s);
  if (!match) return [];

  const result = [];
  for (const raw of match[1].split("@").filter(Boolean)) {
    const parts = raw.split("|");
    if (parts.length < 8) continue;

    let name = parts[1].trim();
    let code = parts[2].trim();
    let pinyin = parts[3].trim();
    let pyShort = parts[4].trim();
    const city = parts[7].trim();

    // 字段顺序异常时尝试排列组合修正
    if (!isCode(code)) {
      const found = parts.slice(1, 5).find(isCode);
      if (found) code = found;
    }
    if (!isPinyin(pinyin)) {
      const found = parts.slice(1, 6).find(isPinyin);
      if (found) pinyin = found;
    }
    if (!isPyShort(pyShort)) {
      const found = parts.slice(1, 7).find(isPyShort);
      if (found) pyShort = found;
    }

    result.push({ name, code, pinyin, pyShort, num: parts[5].trim(), city });
  }
  return result;
}

function normalizeName(value) {
  const trimmed = String(value || "").trim();
  return trimmed.endsWith("站") && trimmed.length > 2 ? trimmed.slice(0, -1) : trimmed;
}

/** 加载车站数据（进程启动时调用一次）。 */
function loadStations() {
  if (stations.length) return stations;
  if (!fs.existsSync(RESOURCE_PATH)) {
    console.error(`[12306] 找不到车站数据文件: ${RESOURCE_PATH}`);
    return stations;
  }
  const content = fs.readFileSync(RESOURCE_PATH, "utf8");
  stations.push(...parseStationContent(content));
  console.log(`[12306] 已加载 ${stations.length} 个车站`);
  return stations;
}

/** 按站名精确匹配（兼容"站"后缀）。 */
function getStationByName(rawName) {
  const name = normalizeName(rawName);
  return stations.find((s) => s.name === name) || null;
}

/** 按三字码精确匹配。 */
function getStationByCode(code) {
  return stations.find((s) => s.code === code) || null;
}

/** 站名/三字码 → 三字码（无法识别返回 null）。 */
function getStationCode(rawName) {
  if (!rawName) return null;
  const name = normalizeName(rawName);
  const byName = stations.find((s) => s.name === name);
  if (byName) return byName.code;
  return stations.find((s) => s.code === name)?.code || null;
}

/** 模糊搜索：中文名/拼音/简拼/三字码/城市，先精确后模糊。 */
function searchStations(query, limit = 10) {
  const q = normalizeName(query).toLowerCase();
  if (!q) return [];

  const results = [];
  const matched = new Set();

  // 1. 精确匹配
  for (const s of stations) {
    if (q === s.name.toLowerCase() || q === s.code.toLowerCase() || q === s.pinyin.toLowerCase() || q === s.pyShort.toLowerCase()) {
      results.push(s);
      matched.add(s);
      if (results.length >= limit) return results;
    }
  }

  // 2. 模糊匹配（含城市）
  for (const s of stations) {
    if (matched.has(s)) continue;
    if (
      s.name.toLowerCase().includes(q) ||
      s.pinyin.toLowerCase().includes(q) ||
      s.pyShort.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.city && s.city.toLowerCase().includes(q))
    ) {
      results.push(s);
      if (results.length >= limit) break;
    }
  }
  return results;
}

module.exports = {
  loadStations,
  getStationByName,
  getStationByCode,
  getStationCode,
  searchStations,
};
