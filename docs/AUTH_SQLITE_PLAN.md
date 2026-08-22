# Leaves 账号与轻量数据库方案

本文用于把当前单用户 JSON 原型升级为最多 5 个账号的小型在线服务。目标是先满足个人和小圈子使用，不引入大型数据库和复杂账号体系。

## 结论

推荐使用 SQLite 作为第一阶段服务端数据库：

- 单文件部署，数据库文件放在 `/opt/leaves/shared/data/leaves.sqlite`。
- 支持事务、唯一约束、外键和索引，比 JSON 整体覆盖写入更安全。
- 当前账号上限只有 5 个，读写量很低，SQLite 足够。
- 可以开启 WAL 模式，提高并发读写体验。
- 以后需要开放公众注册或多设备同步时，再迁移 PostgreSQL。

Node 层有两种实现方式：

| 方案 | 优点 | 风险 |
| --- | --- | --- |
| `node:sqlite` | Node 内置，不增加 npm 原生依赖；当前本地 Node 25 和服务器 Node 22 均可用 | 服务器 Node 22 会提示 experimental warning，需要固定 Node 版本并保留替换空间 |
| `better-sqlite3` | 社区成熟、同步 API 简洁 | 原生依赖，Windows 和服务器安装部署更重 |

第一版建议使用一个 `storage` 适配层封装 SQLite 操作。MVP 可以先用 `node:sqlite`，如果后续要降低实验 API 风险，再把适配层切到 `better-sqlite3`。

## 数据隔离模型

所有用户数据必须绑定 `user_id`，接口只能读取当前登录用户自己的数据。

核心规则：

- `users.id` 是账号主键。
- `trips.user_id` 必须指向 `users.id`。
- 查询行程时永远带 `WHERE user_id = ?`。
- 更新和删除行程时同时匹配 `id` 和 `user_id`。
- 导入 JSON 时只写入当前用户空间。
- 管理后台暂不做，避免扩大权限面。

## 账号规则

第一阶段账号体系保持轻量：

- 注册需要账号名和密码。
- 账号总数上限为 5 个，通过 `LEAVES_MAX_USERS=5` 控制。
- 账号名做规范化：去首尾空格、转小写，建议只允许字母、数字、下划线和短横线。
- 账号名唯一。
- 密码不允许明文存储。
- 建议密码最短 10 位；生产环境可以提高到 12 位。
- 删除账号第一版可以先不做；需要禁用时使用 `disabled_at`。

注册流程必须在事务中检查账号数量，避免并发注册突破 5 个上限：

```sql
BEGIN IMMEDIATE;
SELECT COUNT(*) FROM users WHERE disabled_at IS NULL;
-- 如果 >= 5，回滚并返回 403
INSERT INTO users (...);
COMMIT;
```

## 密码存储

这里应使用“密码哈希”，不是可逆加密。服务端永远不能知道用户原始密码。

推荐第一版使用 Node `crypto.scrypt`：

- 每个用户生成独立随机 `salt`。
- 保存 `algorithm`、参数、`salt`、`hash`。
- 登录时重新计算 hash，并用 `crypto.timingSafeEqual` 比较。
- 不保存明文密码，不记录密码到日志。

存储格式示例：

```text
scrypt$N=32768,r=8,p=1$base64_salt$base64_hash
```

如果以后引入依赖，可迁移到 Argon2id。表中保留 `password_version` 字段，方便平滑升级哈希算法。

## Session 方案

不建议第一版使用 JWT。更轻量也更容易失效控制的方式是数据库 session：

- 登录成功后生成 32 字节随机 token。
- Cookie 只保存原始 token，设置 `HttpOnly`、`SameSite=Lax`、生产环境 `Secure`。
- 数据库只保存 `token_hash`，不保存原始 token。
- 每次请求把 cookie token 哈希后查询 `sessions`。
- 登出时删除当前 session。
- 默认有效期 30 天。

## Schema 草案

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_trips_user_updated ON trips(user_id, updated_at DESC);
```

`trips.payload_json` 第一版保留当前前端行程 JSON 结构，迁移成本最低。等数据模型稳定后，再拆出 `segments`、`places`、`geometry` 等表。

## API 设计

新增账号 API：

| Method | Path | 说明 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 注册账号；账号数达到 5 返回 `403` |
| `POST` | `/api/auth/login` | 登录并写入 session cookie |
| `POST` | `/api/auth/logout` | 删除当前 session |
| `GET` | `/api/auth/me` | 返回当前登录用户 |

行程 API 调整：

| Method | Path | 说明 |
| --- | --- | --- |
| `GET` | `/api/data/trips` | 返回当前用户行程 |
| `PUT` | `/api/data/trips` | 覆盖当前用户行程 |

未登录访问 `/api/data/trips` 返回 `401`。前端收到 `401` 时显示登录/注册界面。

## 迁移策略

当前线上数据在 `/opt/leaves/shared/data/trips.json`。迁移步骤：

1. 上线新版本前备份 `trips.json`。
2. 部署 SQLite schema。
3. 创建第一个账号。
4. 把旧 `trips.json` 导入第一个账号的 `trips` 表。
5. 保留旧 JSON 文件作为只读备份，不再写入。

## 实施步骤

1. 新增 `server/storage/sqlite-store.js`，封装用户、session、trip CRUD。
2. 新增 `server/auth-service.js`，处理密码哈希、注册、登录、cookie。
3. `dev-server.js` 接入 auth middleware。
4. 修改 `/api/data/trips` 为按当前用户读写。
5. 前端增加登录/注册视图，登录后再加载行程。
6. 增加迁移脚本 `scripts/migrate-trips-json-to-sqlite.js`。
7. 更新部署环境变量：

```bash
LEAVES_DB_PATH=/opt/leaves/shared/data/leaves.sqlite
LEAVES_MAX_USERS=5
LEAVES_SESSION_DAYS=30
```

## 验收清单

- 第 6 个账号注册返回 `403`。
- 数据库里没有明文密码。
- 账号 A 看不到账号 B 的行程。
- 账号 A 无法通过修改请求体更新账号 B 的行程。
- 退出登录后访问 `/api/data/trips` 返回 `401`。
- 刷新浏览器后 session 仍有效。
- `trips.json` 能迁移到首个账号。
