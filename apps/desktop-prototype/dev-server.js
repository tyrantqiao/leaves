const http = require("http");
const fs = require("fs");
const path = require("path");

const ticketService = require("./server/ticket-service");
const stationService = require("./server/station-service");

const root = __dirname;
const port = Number(process.env.LEAVES_PORT || 4173);
const host = "127.0.0.1";

// 本地数据文件（行程持久化）
const DATA_DIR = path.join(root, "data");
const TRIPS_FILE = path.join(DATA_DIR, "trips.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8"
};

// 12306 API 路由表：路径 → { method, handler(args) }
const API_ROUTES = {
  "/api/12306/search-stations": { method: "GET", handler: ticketService.searchStationsValidated },
  "/api/12306/query-tickets": { method: "POST", handler: ticketService.queryTicketsValidated },
  "/api/12306/query-ticket-price": { method: "POST", handler: ticketService.queryTicketPriceValidated },
  "/api/12306/query-transfer": { method: "POST", handler: ticketService.queryTransferValidated },
  "/api/12306/train-route": { method: "POST", handler: ticketService.getTrainRouteStationsValidated },
  "/api/12306/train-no": { method: "POST", handler: ticketService.getTrainNoByTrainCodeValidated },
  "/api/12306/current-time": { method: "GET", handler: ticketService.getCurrentTimeValidated }
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error("请求体不是合法 JSON"));
      }
    });
    request.on("error", reject);
  });
}

async function handleApiRequest(request, response, pathname, searchParams) {
  // 行程数据持久化：GET 读文件（无文件返回空数组），PUT 整体覆盖写入
  if (pathname === "/api/data/trips") {
    if (request.method === "GET") {
      fs.readFile(TRIPS_FILE, (error, data) => {
        if (error) {
          sendJson(response, 200, []);
          return;
        }
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        });
        response.end(data);
      });
      return true;
    }

    if (request.method === "PUT") {
      try {
        const body = await readJsonBody(request);
        if (!Array.isArray(body)) {
          sendJson(response, 400, { success: false, error: "请求体必须是行程数组" });
          return true;
        }
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFile(TRIPS_FILE, JSON.stringify(body, null, 2), (error) => {
          if (error) {
            sendJson(response, 500, { success: false, error: `写入失败: ${error.message}` });
            return;
          }
          sendJson(response, 200, { success: true, saved: body.length });
        });
      } catch (e) {
        sendJson(response, 400, { success: false, error: e.message });
      }
      return true;
    }

    sendJson(response, 405, { success: false, error: "仅支持 GET/PUT" });
    return true;
  }

  const route = API_ROUTES[pathname];
  if (!route) return false;

  if (request.method !== route.method) {
    sendJson(response, 405, { success: false, error: `仅支持 ${route.method} 请求` });
    return true;
  }

  let args = {};
  if (request.method === "GET") {
    for (const [key, value] of searchParams) {
      if (key === "limit") {
        args[key] = Number(value);
      } else {
        args[key] = value;
      }
    }
  } else {
    try {
      args = await readJsonBody(request);
    } catch (e) {
      sendJson(response, 400, { success: false, error: e.message });
      return true;
    }
  }

  try {
    const result = await route.handler(args);
    sendJson(response, 200, result);
  } catch (e) {
    console.error(`[12306] ${pathname} 处理异常: ${e.message}`);
    sendJson(response, 500, { success: false, error: `服务内部错误: ${e.message}` });
  }
  return true;
}

// 启动时加载车站数据（约 3400 个）
stationService.loadStations();

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${host}:${port}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;

  // 12306 API 路由（优先于静态文件）
  if (pathname.startsWith("/api/")) {
    const handled = await handleApiRequest(request, response, pathname, requestUrl.searchParams);
    if (handled) return;
    sendJson(response, 404, { success: false, error: `未知接口: ${pathname}` });
    return;
  }

  const filePath = path.normalize(path.join(root, decodeURIComponent(pathname)));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      // 原型开发阶段禁用缓存，避免用户看到旧版本页面/资源
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Leaves prototype running at http://${host}:${port}`);
});
