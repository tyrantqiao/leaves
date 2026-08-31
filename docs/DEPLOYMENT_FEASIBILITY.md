# Leaves 服务器部署与域名绑定可行性报告

## 1. 结论

把 Leaves 部署到服务器，并绑定到 `tyrantqiao.com` 域名下提供服务是可行的，但需要先明确产品形态：

- **演示版 Web 原型**：可较快上线，用于自己预览、给朋友体验、收集反馈。
- **正式 Web 服务**：需要补齐账号、数据库、权限、安全、日志、数据源合规和运维体系。
- **Windows 桌面版 + 云服务**：桌面端继续作为主产品，服务器提供账号、同步、数据补全和备份能力。

推荐路线：**先上线 `leaves.tyrantqiao.com` 演示版，再逐步改造成“Web 服务 + Windows 桌面端共用 API”的架构**。不要一开始把当前原型直接作为公开生产服务长期运行。

## 2. 当前项目状态

当前仓库已经具备以下能力：

- 有可运行的 Node 本地服务：`npm start`
- 有桌面/网页交互原型：`apps/desktop-prototype/index.html`
- 有本地地图资源和 Leaflet 地图能力。
- 有铁路/航班相关的本地代理服务模块。
- 有本地行程持久化能力，当前主要依赖 `localStorage` 与本地 JSON 文件。

当前限制：

- 服务默认监听 `127.0.0.1`，只能本机访问。
- `dev-server.js` 是开发/原型服务，不是生产 Web 服务。
- 没有用户登录、权限、账号隔离。
- 数据不是数据库级持久化，无法支撑多用户。
- API CORS 当前偏开发模式，公开服务需要收紧。
- 12306、地图瓦片等外部数据源需要合规和稳定性评估；航班信息采用用户手动登记，不接 OpenSky 或 OCR。
- 没有 HTTPS、反向代理、进程守护、日志、监控、备份策略。

## 3. 推荐域名规划

不建议直接把主域名 `tyrantqiao.com` 全部指向 Leaves，除非这个域名只服务本项目。更推荐：

| 用途 | 推荐域名 |
| --- | --- |
| Leaves Web 应用 | `leaves.tyrantqiao.com` |
| Leaves API | `api.leaves.tyrantqiao.com` 或 `leaves.tyrantqiao.com/api` |
| 官网/介绍页 | `tyrantqiao.com` |
| 管理后台 | `admin.leaves.tyrantqiao.com` |

推荐第一阶段使用：

```text
https://leaves.tyrantqiao.com
https://leaves.tyrantqiao.com/api
```

这样部署和 HTTPS 配置更简单，也避免跨域复杂度。

## 4. 部署架构建议

### 4.1 演示版架构

适合短期上线验证：

```text
User Browser
  -> tyrantqiao.com DNS
  -> Nginx/Caddy HTTPS
  -> Node prototype server
  -> local JSON data / localStorage
```

优点：

- 改造量小。
- 能快速在线访问。
- 适合演示地图、登记、回顾交互。

缺点：

- 不适合多人正式使用。
- 数据隔离弱。
- 无账号系统。
- 无生产级安全边界。

### 4.2 正式服务架构

适合公开产品：

```text
Web / Tauri Client
  -> HTTPS Reverse Proxy
  -> API Service
  -> PostgreSQL / SQLite single-user mode
  -> Provider Adapters
  -> Queue / Scheduled Jobs
```

推荐技术：

- 前端：React + TypeScript
- Web 构建：Vite
- 桌面端：Tauri
- API：Node.js/Fastify、NestJS，或 Rust/Axum
- 数据库：PostgreSQL；个人单用户可先 SQLite
- 附件：暂不规划上传能力，减少服务器存储和隐私压力
- 反向代理：Caddy 或 Nginx
- HTTPS：Let's Encrypt 自动证书
- 进程管理：Docker Compose、systemd 或 PM2

## 5. 需要改造的内容

### 5.1 服务监听与部署配置

当前服务只监听：

```js
const host = "127.0.0.1";
```

服务器部署需要改为可配置：

```text
LEAVES_HOST=127.0.0.1
LEAVES_PORT=4173
```

建议仍让 Node 服务监听 `127.0.0.1`，由 Nginx/Caddy 对外暴露 HTTPS。不要让 Node 直接裸露到公网。

### 5.2 前后端拆分

当前 `desktop-prototype` 混合了静态页面和 API 服务。正式版本建议拆分：

```text
apps/
  web/          # Web 前端
  desktop/      # Tauri 桌面端
services/
  api/          # 服务端 API
packages/
  domain/       # 共用领域模型
  providers/    # 数据源适配器
```

短期也可以保留当前结构，但至少需要把 `dev-server.js` 改名/改造为 `server.js` 或独立 API 服务。

### 5.3 数据存储

当前 JSON 文件适合原型，不适合正式服务。需要改造为：

- 单用户早期：SQLite
- 多用户正式版：PostgreSQL

必须新增：

- users
- sessions
- trips
- segments
- places
- geometries
- attachments
- provider_raw_sources
- audit_logs

### 5.4 账号与权限

如果部署到公网，必须支持至少一种登录方式：

- 邮箱 + 密码
- GitHub/OAuth 登录
- 管理员邀请码
- 单用户私有部署密码

最小可行方案：

- `LEAVES_ADMIN_EMAIL`
- 首次启动创建管理员
- 所有行程 API 必须登录后访问
- 每条行程绑定 `user_id`

### 5.5 API 安全

需要补齐：

- HTTPS-only
- Cookie `HttpOnly` / `Secure` / `SameSite`
- CSRF 防护，或使用 Bearer token
- CORS 白名单：只允许 `https://leaves.tyrantqiao.com`
- 请求体大小限制
- API rate limit
- 错误信息脱敏
- Provider 凭证只保存在服务器环境变量中

### 5.6 地图服务

当前地图可以用于原型，但公网产品需要稳定瓦片源。

选择：

- 国内访问优先：高德、腾讯地图、天地图等合规服务。
- 海外/全球访问：MapTiler、Mapbox、OpenStreetMap 生态。
- 离线/私有化：自建瓦片服务，成本较高。

注意：公开产品不应长期大量依赖免费公共瓦片服务。需要评估服务条款、额度、商用限制和中国大陆访问稳定性。

### 5.7 交通数据源

铁路和航班数据是上线风险最高的部分。

铁路：

- 不建议把非公开 12306 接口作为公开生产服务核心依赖。
- 可保留为个人工具/私有部署能力。
- 正式公网产品需要合规数据源、缓存、降级和免责声明。

航班：

- 当前采用用户手动登记，不接 OpenSky、FlightAware 或 OCR。
- 远端服务器不承担照片上传、图像识别或航班 provider 查询压力。

### 5.8 隐私与合规

行程数据属于高度个人化的位置与出行信息。公网部署必须考虑：

- 隐私政策
- 用户数据导出和删除
- 数据备份和恢复
- 最小化采集
- 管理员不可随意查看用户私人行程
- 不上传票据、登机牌、截图或照片，优先降低敏感信息采集面

如果服务器部署在中国大陆，并使用 `tyrantqiao.com` 对外提供网站服务，通常需要：

- ICP 备案
- 公安备案视业务情况办理
- 云服务商域名接入备案配置

如果部署在香港、新加坡、日本或美国服务器，一般不需要大陆 ICP 备案，但中国大陆访问速度和稳定性需要评估。

## 6. 服务器配置建议

### 6.1 演示版

```text
1 vCPU
1 GB RAM
20 GB SSD
Node.js 20 LTS
Caddy/Nginx
```

适合少量访问和产品演示。

### 6.2 个人正式版

```text
1-2 vCPU
2 GB RAM
40 GB SSD
SQLite/PostgreSQL
每日备份
```

### 6.3 多用户版本

```text
2-4 vCPU
4-8 GB RAM
PostgreSQL managed instance
Redis optional
日志和监控
```

## 7. 部署步骤草案

### 7.1 DNS

在域名 DNS 控制台添加：

```text
leaves.tyrantqiao.com  A      <server-ip>
```

如果使用云平台托管前端，也可能是：

```text
leaves.tyrantqiao.com  CNAME  <platform-domain>
```

### 7.2 服务器

建议使用 Ubuntu LTS：

```text
/opt/leaves
  current/
  shared/
    data/
    logs/
    backups/
```

### 7.3 反向代理

Caddy 示例：

```caddyfile
leaves.tyrantqiao.com {
  reverse_proxy 127.0.0.1:4173
}
```

Nginx 示例：

```nginx
server {
  server_name leaves.tyrantqiao.com;

  location / {
    proxy_pass http://127.0.0.1:4173;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 7.4 进程守护

短期可用 PM2：

```bash
pm2 start apps/desktop-prototype/dev-server.js --name leaves
pm2 save
```

正式建议 Docker Compose 或 systemd。

## 8. 分阶段计划

### Phase A: 演示版上线

目标：让 `leaves.tyrantqiao.com` 可以访问当前原型。

改造：

- 增加生产启动参数。
- 禁止公网写入本地 JSON，或加一个简单管理员密码。
- 配置 Nginx/Caddy + HTTPS。
- 添加基础日志。
- 添加 `.env.example`。
- 补充部署 README。

预计工作量：1-2 天。

### Phase B: 私有可用版

目标：自己长期使用，不丢数据。

改造：

- SQLite 存储。
- 管理员登录。
- 行程 CRUD API。
- 数据备份导出。
- Provider 凭证环境变量化。

预计工作量：1-2 周。

### Phase C: 公网多用户版

目标：让其他用户注册使用。

改造：

- PostgreSQL。
- 多用户权限隔离。
- 邮箱验证/登录。
- 隐私政策和数据删除。
- API 限流。
- Provider 缓存。
- 监控告警。
- 数据源合规替换。

预计工作量：4-8 周。

## 9. 风险清单

| 风险 | 等级 | 说明 | 建议 |
| --- | --- | --- | --- |
| 公开暴露行程数据 | 高 | 当前无登录和权限 | 上线前必须加鉴权 |
| 数据丢失 | 高 | JSON/localStorage 不适合生产 | 迁移 SQLite/PostgreSQL |
| 12306 接口稳定性 | 高 | 非正式公开 API 风险 | 私有使用或寻找合规数据源 |
| 地图服务条款 | 中 | 公共瓦片不适合长期重度使用 | 接入正式地图服务 |
| 域名备案 | 中 | 大陆服务器需要备案 | 先选海外或提前备案 |
| 运维复杂度 | 中 | 需要证书、日志、备份 | 使用 Caddy + Docker Compose 简化 |

## 10. 推荐下一步

下一步建议先做 **Phase A 演示版上线准备**：

1. 新增 `.env.example`。
2. 改造 `dev-server.js`，支持 `LEAVES_HOST`、生产模式和安全响应头。
3. 增加只读演示模式，避免公网用户随意写入服务器数据。
4. 增加 `docs/DEPLOYMENT.md`，写清楚服务器部署、DNS、HTTPS、PM2/systemd 流程。
5. 再决定是否进入 SQLite + 登录的私有可用版。

最终目标架构应是：**`leaves.tyrantqiao.com` 提供 Web 应用，Windows Tauri 客户端复用同一套 API，用户数据在本地和云端之间可同步。**
