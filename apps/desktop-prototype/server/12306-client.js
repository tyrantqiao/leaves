// 12306 HTTP 客户端 —— 移植自 mcp-server-12306（MIT License, https://github.com/drfccv/mcp-server-12306）
// 模拟浏览器请求头、init 会话 Cookie 维持、网络错误自动重试、反爬虫拦截检测。
"use strict";

const http = require("http");
const https = require("https");
const zlib = require("zlib");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

// 中国铁路 12306 API 常量
const HTTP_URLS = {
  init: "https://kyfw.12306.cn/otn/leftTicket/init",
  query_left_ticket: "https://kyfw.12306.cn/otn/leftTicket/queryI",
  query_transfer: "https://kyfw.12306.cn/lcquery/queryG",
  query_route_stations: "https://kyfw.12306.cn/otn/czxx/queryByTrainNo",
};

const HTTP_HEADERS = {
  "User-Agent": USER_AGENT,
  Referer: "https://kyfw.12306.cn/otn/leftTicket/init",
  Host: "kyfw.12306.cn",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "zh-CN,zh;q=0.9",
  Connection: "keep-alive",
  "X-Requested-With": "XMLHttpRequest",
  Origin: "https://kyfw.12306.cn",
};

const HTTP_TIMEOUT = 8000;
const MAX_REDIRECTS = 5;

/** 带重定向跟随、Cookie 收集、gzip 解压的 GET 请求。
 * useDefaultHeaders=false 时不带 12306 业务头（用于 search.12306.cn 等独立域名）。 */
function httpGet(url, { headers = {}, cookies = [], params = null, useDefaultHeaders = true } = {}) {
  return new Promise((resolve, reject) => {
    const doRequest = (targetUrl, redirects, history) => {
      let urlObj;
      try {
        urlObj = new URL(targetUrl);
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            urlObj.searchParams.set(key, value);
          }
        }
      } catch (e) {
        reject(e);
        return;
      }

      const lib = urlObj.protocol === "https:" ? https : http;
      const mergedHeaders = useDefaultHeaders ? { ...HTTP_HEADERS, ...headers } : { ...headers };
      const req = lib.request(
        urlObj,
        {
          method: "GET",
          headers: { ...mergedHeaders, Cookie: cookies.join("; ") },
          rejectUnauthorized: false,
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const isRedirect = res.statusCode >= 300 && res.statusCode < 400 && res.headers.location;
            if (isRedirect) {
              if (redirects >= MAX_REDIRECTS) {
                reject(new Error(`重定向次数超过限制 (${MAX_REDIRECTS})`));
                return;
              }
              const next = new URL(res.headers.location, targetUrl).toString();
              history.push({ statusCode: res.statusCode, location: res.headers.location, url: targetUrl });
              req.destroy();
              doRequest(next, redirects + 1, history);
              return;
            }

            let body = Buffer.concat(chunks);
            const encoding = String(res.headers["content-encoding"] || "");
            if (encoding.includes("gzip")) {
              try {
                body = zlib.gunzipSync(body);
              } catch (e) {
                /* 忽略解压失败，使用原始内容 */
              }
            }

            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body.toString("utf8"),
              url: targetUrl,
              history,
            });
          });
        }
      );

      req.setTimeout(HTTP_TIMEOUT, () => {
        req.destroy(new Error("请求超时"));
      });
      req.on("error", reject);
      req.end();
    };

    doRequest(url, 0, []);
  });
}

/** 收集响应中的 Set-Cookie（保持会话）。 */
function collectCookies(resp, jar) {
  const setCookies = resp.headers["set-cookie"];
  if (!setCookies) return;
  for (const raw of setCookies) {
    const name = raw.split(";")[0];
    const key = name.split("=")[0].trim();
    const existing = jar.findIndex((c) => c.startsWith(`${key}=`));
    if (existing >= 0) jar.splice(existing, 1);
    jar.push(name);
  }
}

/** 判断是否为 12306 反爬虫/错误响应。 */
function isErrorResponse(resp) {
  const finalUrl = String(resp.url || "");
  return (
    resp.statusCode !== 200 ||
    finalUrl.includes("error.html") ||
    finalUrl.includes("/ntce/") ||
    finalUrl.includes("resources/error")
  );
}

class ApiError extends Error {
  constructor(message, extra = {}) {
    super(message);
    this.extra = extra;
  }
}

class RetryExhaustedError extends Error {}

/** 带重试地执行 12306 请求：每次尝试先访问 init 端点维持会话 Cookie。
 * 仅网络类异常重试；业务错误（ApiError）直接抛给调用方。 */
async function requestWithRetry(operation, handler, retries = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const cookieJar = [];
      const initResp = await httpGet(HTTP_URLS.init);
      collectCookies(initResp, cookieJar);
      return await handler(cookieJar);
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }
      lastError = e;
      if (attempt < retries - 1) {
        console.warn(`[12306] ${operation} 网络请求失败，正在重试 (${attempt + 1}/${retries}): ${e.message}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
    }
  }
  throw new RetryExhaustedError(`网络请求失败 (已重试${retries}次): ${lastError ? lastError.message : "未知错误"}`);
}

/** 带会话与重试的 GET + JSON 解析。 */
async function getJson(operation, url, params, options = {}) {
  return requestWithRetry(operation, async (cookieJar) => {
    const resp = await httpGet(url, { params, ...options, cookies: cookieJar });
    collectCookies(resp, cookieJar);

    if (isErrorResponse(resp)) {
      throw new ApiError("12306 接口返回异常或反爬虫拦截", {
        statusCode: resp.statusCode,
        finalUrl: resp.url,
        detail: resp.body.slice(0, 200),
      });
    }

    try {
      return JSON.parse(resp.body);
    } catch (e) {
      throw new ApiError("12306 响应解析失败", { detail: resp.body.slice(0, 200) });
    }
  });
}

module.exports = {
  HTTP_URLS,
  HTTP_HEADERS,
  USER_AGENT,
  ApiError,
  RetryExhaustedError,
  httpGet,
  collectCookies,
  isErrorResponse,
  requestWithRetry,
  getJson,
};
