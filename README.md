# Leaves

Leaves 是一个 Windows 优先的个人出行记录软件。它的目标不是替代航班雷达或铁路调度系统，而是让用户用最少输入记录一次出行，并在之后用地图、时间线和统计视图回看自己的移动轨迹。

## MVP 方向与完成状态

> ✅ = 已在桌面原型中实现并验证；⏳ = 待正式 Tauri 版本落地。

- ✅ 快速登记：输入航班号、铁路车次号、起终点，自动识别交通方式并生成草稿（票据截图 OCR 待 Phase 2）。
- ✅ 行程时间线：按日期回看航班、铁路、道路记录，支持方式筛选。
- ✅ 地图回顾：Leaflet 真实地图上显示航线弧线、铁路/公路线、城市点位，支持单程聚焦与重置视角。
- ✅ 本地优先：localStorage 本地持久化，离线可查历史行程（正式版替换为 SQLite）。
- ✅ 行程管理：新增、内联编辑、删除行程，JSON 一键导入导出。
- ⏳ 数据源可替换：通过 provider adapter 接入航班、铁路、地图、OCR 等能力。

## 当前产出

- [产品需求文档](docs/PRD.md)
- [技术架构](docs/TECHNICAL_ARCHITECTURE.md)
- [数据模型](docs/DATA_MODEL.md)
- [开发路线图](docs/ROADMAP.md)
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

也可以不启动服务器，在 Windows 上直接双击打开：

```text
apps/desktop-prototype/index.html
```

### 地图资源的离线策略

项目可完全独立运行，地图加载分三层降级：

1. **本地 Leaflet**：`vendor/leaflet/` 内置官方发行版，不依赖任何 CDN，离线也能启动地图。
2. **在线瓦片自动切换**：底图优先 OpenStreetMap，连续失败后自动切换到高德地图瓦片，工具栏会显示当前底图源。
3. **离线示意模式**：若所有在线瓦片都不可用，地图保留路线弧线、城市点位和交互，仅无底图瓦片。

主要用于验证第一屏、快速登记、地图回顾和时间线交互。

## 推荐正式技术栈

- Desktop shell: Tauri 2
- Frontend: React + TypeScript
- Local data: SQLite
- Map: MapLibre GL JS
- Provider layer: FlightAware/OpenSky/rail provider/manual provider adapters

## 下一步

优先把静态原型升级成 Tauri + React 项目，并保留当前原型里的核心交互：顶部快速登记、左侧行程时间线、中部地图、右侧详情与统计。
