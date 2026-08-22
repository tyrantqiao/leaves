"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const scryptAsync = promisify(crypto.scrypt);
const COOKIE_NAME = "leaves_session";
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function createAuthService(options) {
  const dataDir = options.dataDir;
  const authFile = path.join(dataDir, "auth.json");
  const maxUsers = Number(options.maxUsers || 5);
  const sessionDays = Number(options.sessionDays || 30);
  const isProduction = Boolean(options.isProduction);

  function nowIso() {
    return new Date().toISOString();
  }

  function readStore() {
    try {
      const parsed = JSON.parse(fs.readFileSync(authFile, "utf8"));
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : []
      };
    } catch (e) {
      return { users: [], sessions: [] };
    }
  }

  function writeStore(store) {
    fs.mkdirSync(dataDir, { recursive: true });
    const tempFile = `${authFile}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2));
    fs.renameSync(tempFile, authFile);
  }

  function normalizeUsername(username) {
    return String(username || "").trim().toLowerCase();
  }

  function publicUser(user) {
    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    };
  }

  function validateCredentials(username, password) {
    const normalized = normalizeUsername(username);
    if (!/^[a-z0-9_-]{3,32}$/.test(normalized)) {
      return { ok: false, error: "账号名需为 3-32 位字母、数字、下划线或短横线" };
    }
    if (String(password || "").length < 10) {
      return { ok: false, error: "密码至少需要 10 位" };
    }
    return { ok: true, normalized };
  }

  async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("base64");
    const derived = await scryptAsync(String(password), salt, 64, SCRYPT_PARAMS);
    return `scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt}$${derived.toString("base64")}`;
  }

  async function verifyPassword(password, encodedHash) {
    const parts = String(encodedHash || "").split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;

    const params = Object.fromEntries(
      parts[1].split(",").map((entry) => {
        const [key, value] = entry.split("=");
        return [key, Number(value)];
      })
    );
    const salt = parts[2];
    const expected = Buffer.from(parts[3], "base64");
    const derived = await scryptAsync(String(password), salt, expected.length, {
      N: params.N || SCRYPT_PARAMS.N,
      r: params.r || SCRYPT_PARAMS.r,
      p: params.p || SCRYPT_PARAMS.p,
      maxmem: SCRYPT_PARAMS.maxmem
    });
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  }

  function hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("base64");
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  }

  function makeSessionCookie(token) {
    const maxAge = Math.max(1, sessionDays) * 24 * 60 * 60;
    const secure = isProduction ? "; Secure" : "";
    return `${COOKIE_NAME}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
  }

  function makeClearCookie() {
    const secure = isProduction ? "; Secure" : "";
    return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
  }

  function parseCookies(request) {
    return Object.fromEntries(
      String(request.headers.cookie || "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const index = part.indexOf("=");
          if (index < 0) return [part, ""];
          return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
        })
    );
  }

  function cleanupExpiredSessions(store) {
    const now = Date.now();
    const before = store.sessions.length;
    store.sessions = store.sessions.filter((session) => Date.parse(session.expiresAt) > now);
    return store.sessions.length !== before;
  }

  function createSession(store, userId) {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + Math.max(1, sessionDays) * 24 * 60 * 60 * 1000).toISOString();
    store.sessions.push({
      id: makeId("session"),
      userId,
      tokenHash: hashToken(token),
      createdAt: nowIso(),
      expiresAt,
      lastSeenAt: nowIso()
    });
    return token;
  }

  async function register(username, password) {
    const validation = validateCredentials(username, password);
    if (!validation.ok) return { status: 400, payload: { success: false, error: validation.error } };

    const store = readStore();
    cleanupExpiredSessions(store);
    if (store.users.filter((user) => !user.disabledAt).length >= maxUsers) {
      return { status: 403, payload: { success: false, error: `账号数量已达上限（${maxUsers} 个）` } };
    }
    if (store.users.some((user) => user.usernameNormalized === validation.normalized)) {
      return { status: 409, payload: { success: false, error: "账号名已存在" } };
    }

    const user = {
      id: makeId("user"),
      username: String(username).trim(),
      usernameNormalized: validation.normalized,
      passwordHash: await hashPassword(password),
      passwordVersion: 1,
      createdAt: nowIso(),
      disabledAt: null
    };
    store.users.push(user);
    const token = createSession(store, user.id);
    writeStore(store);
    return { status: 201, cookie: makeSessionCookie(token), payload: { success: true, user: publicUser(user) } };
  }

  async function login(username, password) {
    const normalized = normalizeUsername(username);
    const store = readStore();
    cleanupExpiredSessions(store);
    const user = store.users.find((item) => item.usernameNormalized === normalized && !item.disabledAt);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      if (store.sessions.length) writeStore(store);
      return { status: 401, payload: { success: false, error: "账号名或密码不正确" } };
    }
    const token = createSession(store, user.id);
    writeStore(store);
    return { status: 200, cookie: makeSessionCookie(token), payload: { success: true, user: publicUser(user) } };
  }

  function currentUser(request) {
    const token = parseCookies(request)[COOKIE_NAME];
    if (!token) return null;

    const store = readStore();
    const changed = cleanupExpiredSessions(store);
    const tokenHash = hashToken(token);
    const session = store.sessions.find((item) => item.tokenHash === tokenHash);
    if (!session) {
      if (changed) writeStore(store);
      return null;
    }
    const user = store.users.find((item) => item.id === session.userId && !item.disabledAt);
    if (!user) {
      store.sessions = store.sessions.filter((item) => item.id !== session.id);
      writeStore(store);
      return null;
    }

    const lastSeenAt = Date.parse(session.lastSeenAt || "");
    if (!lastSeenAt || Date.now() - lastSeenAt > 60 * 60 * 1000) {
      session.lastSeenAt = nowIso();
      writeStore(store);
    } else if (changed) {
      writeStore(store);
    }
    return publicUser(user);
  }

  function logout(request) {
    const token = parseCookies(request)[COOKIE_NAME];
    if (token) {
      const store = readStore();
      const tokenHash = hashToken(token);
      store.sessions = store.sessions.filter((session) => session.tokenHash !== tokenHash);
      writeStore(store);
    }
    return { status: 200, cookie: makeClearCookie(), payload: { success: true } };
  }

  return {
    register,
    login,
    logout,
    currentUser,
    clearCookie: makeClearCookie
  };
}

module.exports = {
  COOKIE_NAME,
  createAuthService
};
