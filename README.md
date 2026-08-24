# Leaves

Leaves 是一个 Windows 优先的个人出行记录软件。它的目标不是替代航班雷达或铁路调度系统，而是让用户用最少输入记录一次出行，并在之后用地图、时间线和统计视图回看自己的移动轨迹。

## MVP 方向与完成状态

> ✅ = 已在桌面原型中实现并验证；⏳ = 待正式 Tauri 版本落地。

- ✅ 快速登记：输入航班号、铁路车次号、起终点，自动识别交通方式并生成草稿（票据截图 OCR 待 Phase 2）。
- ✅ 行程时间线：按日期回看航班、铁路、道路记录，支持方式筛选。
- ✅ 地图回顾：Leaflet 真实地图上显示航线弧线、铁路/公路线、城市点位，支持单程聚焦与重置视角。
- ✅ 账号入口：进入 Leaves 前先登录或注册，行程按账号隔离保存。
- ✅ 本地优先：账号维度 localStorage 缓存 + 本地服务文件持久化（正式版替换为 SQLite）。
- ✅ 行程管理：新增、内联编辑、删除行程，JSON 一键导入导出。
- ✅ 12306 铁路查询：登记车次后通过经停站选择补全真实发到时刻（逻辑移植自 mcp-server-12306）。
- ⏳ 数据源可替换：通过 provider adapter 接入航班、铁路、地图、OCR 等能力。

## 当前产出

- [产品需求文档](docs/PRD.md)
- [技术架构](docs/TECHNICAL_ARCHITECTURE.md)
- [数据模型](docs/DATA_MODEL.md)
- [开发路线图](docs/ROADMAP.md)
- [服务器部署与域名绑定可行性报告](docs/DEPLOYMENT_FEASIBILITY.md)
- [服务器部署手册](docs/DEPLOYMENT.md)
- [账号与轻量数据库方案](docs/AUTH_SQLITE_PLAN.md)
- [桌面交互原型](apps/desktop-prototype/index.html)

## 一键安装与启动

前置要求：Node.js 16+（运行时无需任何第三方依赖，Leaflet 已内置在 `apps/desktop-prototype/vendor/`）。

在项目根目录执行：

```powershell
# 一键安装（仅维护需要，运行不依赖）
npm install

# 一键启动原型（默认端口 4173）
npm start
```

启动后访问：

```text
http://127.0.0.1:4173
```

自定义端口：

```powershell
$env:LEAVES_PORT=8080; npm start
```

账号登录、行程持久化、12306 查询都依赖本地服务。直接双击 HTML 只适合静态资源调试，无法完成登录：

```text
apps/desktop-prototype/index.html
```

### 地图资源的离线策略

项目可完全独立运行，全部核心资源均内置在 `apps/desktop-prototype/vendor/`，不依赖任何 CDN：
1. **本地 Leaflet**：`vendor/leaflet/` 内置官方发行版，离线也能启动地图。
2. **本地矢量底图**：`vendor/china-provinces.js` 内置中国省级边界 GeoJSON，以 `<script>` 方式加载（兼容 `file://` 双击打开）。完全断网时，这份矢量数据直接充当底图，路线弧线与城市点位叠加其上。
3. **在线瓦片自动切换（可选增强）**：联网时优先加载 OpenStreetMap 瓦片，连续失败自动切换到高德地图瓦片，矢量底图退为浅色描边；工具栏会显示当前底图源。

调试入口：在 URL 后加 `#offline`（如 `http://127.0.0.1:4173/#offline`）可强制模拟完全离线，验证本地矢量底图效果。

主要用于验证第一屏、快速登记、地图回顾和时间线交互。

### 一屏交互设计（参考 FlightVault）

原型采用沉浸式单屏布局，所有操作集中在一个屏幕内完成：

1. **顶栏**：品牌 + 快速登记输入框（航班号/车次号/路线），登记后立即在主卡展示。
2. **主卡（Hero）**：当前行程大卡片，地图作为背景，底部渐变区承载超大号起终点（如 上海 → 杭州）、方式徽章、编号/日期/时间等精简信息；编辑与删除在卡内直接完成。
3. **底部行程条**：横向滚动的紧凑行程卡片，点击即切换主卡并聚焦地图；筛选（全部/飞行/铁路/道路）与统计（条数/里程/城市）收敛为一行。

信息层级从“多栏铺开”改为“一屏聚焦”：核心信息即时可见，次要信息（编辑表单等）按需展开。

## 12306 铁路查询（本地代理）

后端将 mcp-server-12306 的核心逻辑移植为 Node 本地代理（`apps/desktop-prototype/server/`），前端通过同源 `/api/12306/*` 调用，避免跨域问题：

| 接口 | 方法 | 能力 |
| --- | --- | --- |
| `/api/12306/search-stations` | GET | 车站搜索（中文/拼音/简拼/三字码） |
| `/api/12306/query-transfer` | POST | 中转换乘方案 |
| `/api/12306/train-route` | POST | 经停站与时刻表 |
| `/api/12306/train-no` | POST | 车次号 → 官方唯一编号 |
| `/api/12306/current-time` | GET | 当前时间 |
| `/api/flight/search` | POST | 航班号 + 乘机日查询，返回航司、起降机场、机场代码与时刻 |
| `/api/user/settings/opensky` | GET/PUT | 当前账号的 OpenSky clientId/clientSecret 维护（secret 不回显） |
| `/api/user/settings/opensky/test` | POST | 使用 OpenSky OAuth2 client credentials 换 token 测试 |
| `/api/opensky/request` | POST | 受控代理 OpenSky REST：states、flights、tracks |

前端集成：

- **登记过往行程**：登记日期允许任意历史日期（默认今天）。查询车次时**查询日期与登记日期分离**——查询日期用于 12306 接口（自动取今天，今天查不到自动试明天，仅影响查询不影响登记），登记日期保存的是实际乘车日期；选站面板与手动保存表单中均可单独修改“乘车日期”（如今天登记 8 月 2 日的行程）。
- **上下车站选择（纯车次号直查）**：登记铁路车次后自动查询——**只需输入车次号**（如 `G7254`），后端通过 12306 官方搜索接口自动定位车次（始发/终到站 + 官方编号），无需填写起讫区间；定位成功后显示成功提示（“已查询到车次信息”）并展示全部经停站下拉列表让用户选择出发/到达站；自动定位失败时回退到车站联想下拉，仍可直接填写起讫区间点击“直接保存”手动登记（不依赖 12306）。确认的区间会被记住，下次登记同一车次更快直达。
- **距离兜底**：保存时按起讫站坐标计算直线距离（内置 90+ 城市/车站坐标表，支持城市级回退），无接口里程数据时自动补上。
- **编辑表单联动**：草稿态编辑铁路车次时，若查询到经停站，起点/终点自动切换为经停站下拉选择（带成功提示）；查询不到则保持文本输入。
- **自动补全**：查询到经停站后按用户选择的上下车站写入真实发到时刻；无法查询时保留手动补录。
- **航班补全**：登记航班后可在 Hero 卡片点击“航班查询”，输入航班号与乘机日查询；当前内置本地航班表可离线补全 `HO2274` 在 `2026-07-20` 的惠州平潭 → 上海浦东、21:05 → 23:25 信息，未收录航班会优先用当前账号保存的 OpenSky REST 凭证查询，到离港查询仍无结果时回退到航司识别和手动补录。
- **OpenSky 凭证维护**：点击顶栏用户名进入账号设置，可保存/测试/清除 OpenSky `clientId` 与 `clientSecret`；后端使用 OAuth2 client credentials 换取 Bearer token 并做 30 分钟级缓存，前端不会读取已保存的 `clientSecret`。如果本机代理/VPN 使用 fake-ip，设置里可填写 `Proxy URL`（如 `http://127.0.0.1:7890`），也可通过 `LEAVES_HTTPS_PROXY` / `HTTPS_PROXY` 环境变量配置。
- **OpenSky 网络排障**：测试时报 `connect EACCES 198.18.x.x:443` 通常表示 OpenSky 域名被代理软件解析到了 fake-ip，但 Node 后端没有走代理；填写账号设置中的 `Proxy URL` 后重试，或设置代理环境变量并重启 `npm start`。
- **查询日期限制**：12306 查询日期仅支持今天到 14 天后；登记日期保存真实出行日，可填写历史日期。
- **账号与本地持久化**：进入应用前先通过 `/api/auth/register` 或 `/api/auth/login` 建立 session；行程数据双写保存到当前账号自己的浏览器 localStorage key 和本地文件 `apps/desktop-prototype/data/users/<user-id>.trips.json`（通过 `/api/data/trips` 读写，重启/换浏览器不丢）。

实现要点（移植自 [mcp-server-12306](https://github.com/drfccv/mcp-server-12306)，MIT License）：浏览器模拟请求头 + init 会话 Cookie 维持 + 网络重试 + 反爬拦截检测 + 车站名↔三字码转换（内置 3400+ 车站数据）。车站数据与查询均为本地代理完成，断网时自动降级为纯手工登记，不影响离线使用。

## 推荐正式技术栈

- Desktop shell: Tauri 2
- Frontend: React + TypeScript
- Local data: SQLite
- Map: MapLibre GL JS
- Provider layer: FlightAware/OpenSky/rail provider/manual provider adapters

## 下一步

优先把静态原型升级成 Tauri + React 项目，并保留当前原型里的核心交互：顶部快速登记、左侧行程时间线、中部地图、右侧详情与统计。
