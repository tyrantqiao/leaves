const http = require("http");
const fs = require("fs");
const path = require("path");

const ticketService = require("./server/ticket-service");
const stationService = require("./server/station-service");
const flightService = require("./server/flight-service");
const { createAuthService } = require("./server/auth-service");

const root = __dirname;
const port = Number(process.env.LEAVES_PORT || 4173);
const host = process.env.LEAVES_HOST || "127.0.0.1";
const isProduction = process.env.NODE_ENV === "production";
const readOnly = ["1", "true", "yes"].includes(
  String(process.env.LEAVES_READ_ONLY || "").toLowerCase()
);
const corsOrigin = String(
  process.env.LEAVES_CORS_ORIGIN || (isProduction ? "" : "*")
).trim();
const allowedCorsOrigins = new Set(
  corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const maxBodyBytes = Number(process.env.LEAVES_MAX_BODY_BYTES || 2 * 1024 * 1024);

// 行程持久化目录可在服务器上指向独立的 shared/data 目录。
const DATA_DIR = process.env.LEAVES_DATA_DIR
  ? path.resolve(process.env.LEAVES_DATA_DIR)
  : path.join(root, "data");
const authService = createAuthService({
  dataDir: DATA_DIR,
  isProduction,
  maxUsers: Number(process.env.LEAVES_MAX_USERS || 5),
  sessionDays: Number(process.env.LEAVES_SESSION_DAYS || 30)
});

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
  "/api/12306/query-transfer": { method: "POST", handler: ticketService.queryTransferValidated },
  "/api/12306/train-route": { method: "POST", handler: ticketService.getTrainRouteStationsValidated },
  "/api/12306/train-no": { method: "POST", handler: ticketService.getTrainNoByTrainCodeValidated },
  "/api/12306/current-time": { method: "GET", handler: ticketService.getCurrentTimeValidated },
  "/api/flight/search": { method: "POST", handler: flightService.searchFlightValidated }
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function setResponseHeaders(response, request) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  if (!corsOrigin) return;
  if (corsOrigin === "*") {
    if (request.headers.origin) {
      response.setHeader("Access-Control-Allow-Origin", request.headers.origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      response.setHeader("Access-Control-Allow-Origin", "*");
    }
  } else if (request.headers.origin && allowedCorsOrigins.has(request.headers.origin)) {
    response.setHeader("Access-Control-Allow-Origin", request.headers.origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let tooLarge = false;
    request.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBodyBytes) tooLarge = true;
      if (!tooLarge) chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        if (tooLarge) {
          reject(new Error(`请求体不能超过 ${maxBodyBytes} 字节`));
          return;
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error("请求体不是合法 JSON"));
      }
    });
    request.on("error", reject);
  });
}

function tripsFileForUser(user) {
  return path.join(DATA_DIR, "users", `${user.id}.trips.json`);
}

function settingsFileForUser(user) {
  return path.join(DATA_DIR, "users", `${user.id}.settings.json`);
}

function readUserSettings(user) {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsFileForUser(user), "utf8"));
    return {
      opensky:
        parsed && typeof parsed.opensky === "object" && parsed.opensky
          ? {
              clientId: String(parsed.opensky.clientId || ""),
              clientSecret: String(parsed.opensky.clientSecret || ""),
              proxyUrl: String(parsed.opensky.proxyUrl || ""),
              updatedAt: parsed.opensky.updatedAt || null
            }
          : null
    };
  } catch (e) {
    return { opensky: null };
  }
}

function writeUserSettings(user, settings) {
  const file = settingsFileForUser(user);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(settings, null, 2));
  fs.renameSync(tempFile, file);
}

function publicUserSettings(settings) {
  const opensky = settings.opensky || null;
  return {
    opensky: {
      clientId: opensky?.clientId || "",
      proxyUrl: opensky?.proxyUrl || "",
      hasClientSecret: Boolean(opensky?.clientSecret),
      updatedAt: opensky?.updatedAt || null
    }
  };
}

function currentApiUser(request, response) {
  const user = authService.currentUser(request);
  if (!user) {
    response.setHeader("Set-Cookie", authService.clearCookie());
    sendJson(response, 401, { success: false, error: "请先登录" });
    return null;
  }
  return user;
}

async function handleAuthRequest(request, response, pathname) {
  if (pathname === "/api/auth/me") {
    if (request.method !== "GET") {
      sendJson(response, 405, { success: false, error: "仅支持 GET 请求" });
      return true;
    }
    const user = authService.currentUser(request);
    if (!user) {
      response.setHeader("Set-Cookie", authService.clearCookie());
      sendJson(response, 401, { success: false, authenticated: false, error: "请先登录" });
      return true;
    }
    sendJson(response, 200, { success: true, authenticated: true, user });
    return true;
  }

  if (pathname === "/api/auth/register" || pathname === "/api/auth/login") {
    if (request.method !== "POST") {
      sendJson(response, 405, { success: false, error: "仅支持 POST 请求" });
      return true;
    }
    try {
      const body = await readJsonBody(request);
      const result =
        pathname === "/api/auth/register"
          ? await authService.register(body.username, body.password)
          : await authService.login(body.username, body.password);
      if (result.cookie) response.setHeader("Set-Cookie", result.cookie);
      sendJson(response, result.status, result.payload);
    } catch (e) {
      sendJson(response, 400, { success: false, error: e.message });
    }
    return true;
  }

  if (pathname === "/api/auth/logout") {
    if (request.method !== "POST") {
      sendJson(response, 405, { success: false, error: "仅支持 POST 请求" });
      return true;
    }
    const result = authService.logout(request);
    response.setHeader("Set-Cookie", result.cookie);
    sendJson(response, result.status, result.payload);
    return true;
  }

  return false;
}

async function handleApiRequest(request, response, pathname, searchParams) {
  // 跨域预检（file:// 页面跨域访问本地 API）
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Cache-Control": "no-store"
    });
    response.end();
    return true;
  }

  if (pathname.startsWith("/api/auth/")) {
    return handleAuthRequest(request, response, pathname);
  }

  if (pathname === "/api/user/settings") {
    const user = currentApiUser(request, response);
    if (!user) return true;

    if (request.method !== "GET") {
      sendJson(response, 405, { success: false, error: "仅支持 GET 请求" });
      return true;
    }
    sendJson(response, 200, { success: true, settings: publicUserSettings(readUserSettings(user)) });
    return true;
  }

  if (pathname === "/api/user/settings/opensky") {
    const user = currentApiUser(request, response);
    if (!user) return true;

    if (request.method === "GET") {
      sendJson(response, 200, { success: true, opensky: publicUserSettings(readUserSettings(user)).opensky });
      return true;
    }

    if (request.method === "PUT") {
      if (readOnly) {
        sendJson(response, 403, { success: false, error: "当前服务处于只读演示模式" });
        return true;
      }
      try {
        const body = await readJsonBody(request);
        const settings = readUserSettings(user);
        if (body.clear) {
          settings.opensky = null;
          writeUserSettings(user, settings);
          sendJson(response, 200, { success: true, opensky: publicUserSettings(settings).opensky });
          return true;
        }

        const clientId = String(body.clientId || "").trim();
        const clientSecret = String(body.clientSecret || "").trim();
        const proxyUrl = String(body.proxyUrl || "").trim();
        const previousSecret = settings.opensky?.clientSecret || "";
        if (!clientId) {
          sendJson(response, 400, { success: false, error: "clientId 不能为空" });
          return true;
        }
        if (!clientSecret && !previousSecret) {
          sendJson(response, 400, { success: false, error: "clientSecret 不能为空" });
          return true;
        }

        settings.opensky = {
          clientId,
          clientSecret: clientSecret || previousSecret,
          proxyUrl,
          updatedAt: new Date().toISOString()
        };
        writeUserSettings(user, settings);
        sendJson(response, 200, { success: true, opensky: publicUserSettings(settings).opensky });
      } catch (e) {
        sendJson(response, 400, { success: false, error: e.message });
      }
      return true;
    }

    sendJson(response, 405, { success: false, error: "仅支持 GET/PUT" });
    return true;
  }

  if (pathname === "/api/user/settings/opensky/test") {
    const user = currentApiUser(request, response);
    if (!user) return true;
    if (request.method !== "POST") {
      sendJson(response, 405, { success: false, error: "仅支持 POST 请求" });
      return true;
    }
    try {
      const body = await readJsonBody(request);
      const settings = readUserSettings(user);
      const credentials = {
        clientId: String(body.clientId || settings.opensky?.clientId || "").trim(),
        clientSecret: String(body.clientSecret || settings.opensky?.clientSecret || "").trim(),
        proxyUrl: String(body.proxyUrl || settings.opensky?.proxyUrl || "").trim()
      };
      const result = await flightService.testOpenSkyCredentialsValidated(credentials);
      sendJson(response, result.success ? 200 : 400, result);
    } catch (e) {
      sendJson(response, 400, { success: false, error: e.message, ...(e.extra || {}) });
    }
    return true;
  }

  if (pathname === "/api/opensky/request") {
    const user = currentApiUser(request, response);
    if (!user) return true;
    if (request.method !== "POST") {
      sendJson(response, 405, { success: false, error: "仅支持 POST 请求" });
      return true;
    }
    try {
      const body = await readJsonBody(request);
      const result = await flightService.openskyRestRequestValidated(body, {
        openskyCredentials: readUserSettings(user).opensky
      });
      sendJson(response, 200, result);
    } catch (e) {
      sendJson(response, 500, { success: false, error: `OpenSky 请求失败: ${e.message}` });
    }
    return true;
  }

  // 行程数据持久化：登录后按用户读写自己的文件，避免账号之间共享同一份 trips.json
  if (pathname === "/api/data/trips") {
    const user = authService.currentUser(request);
    if (!user) {
      response.setHeader("Set-Cookie", authService.clearCookie());
      sendJson(response, 401, { success: false, error: "请先登录后再访问行程数据" });
      return true;
    }
    const tripsFile = tripsFileForUser(user);

    if (request.method === "GET") {
      fs.readFile(tripsFile, (error, data) => {
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
      if (readOnly) {
        sendJson(response, 403, { success: false, error: "当前服务处于只读演示模式" });
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (!Array.isArray(body)) {
          sendJson(response, 400, { success: false, error: "请求体必须是行程数组" });
          return true;
        }
        fs.mkdirSync(path.dirname(tripsFile), { recursive: true });
        fs.writeFile(tripsFile, JSON.stringify(body, null, 2), (error) => {
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
    if (pathname === "/api/flight/search") {
      const user = authService.currentUser(request);
      if (user) args.openskyCredentials = readUserSettings(user).opensky;
    }
    const result = await route.handler(args);
    sendJson(response, 200, result);
  } catch (e) {
    console.error(`[api] ${pathname} 处理异常: ${e.message}`);
    sendJson(response, 500, { success: false, error: `服务内部错误: ${e.message}` });
  }
  return true;
}

// 启动时加载车站数据（约 3400 个）
stationService.loadStations();

const server = http.createServer(async (request, response) => {
  setResponseHeaders(response, request);
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

  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (filePath !== root && !filePath.startsWith(rootPrefix)) {
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

    // 注入本地 API 地址：file:// 双击打开时用于跨域访问持久化接口
    if (pathname === "/index.html") {
      const html = data
        .toString("utf8")
        .replace(
          "</head>",
          `<script>window.LEAVES_API_BASE = "http://${host}:${port}";<\/script></head>`
        );
      response.writeHead(200, {
        "Content-Type": contentTypes[".html"] || "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      response.end(html);
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
  console.log(
    `Leaves prototype running at http://${host}:${port} (${isProduction ? "production" : "development"}, ${
      readOnly ? "read-only" : "writable"
    })`
  );
});
