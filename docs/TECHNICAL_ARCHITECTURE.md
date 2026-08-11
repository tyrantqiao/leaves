# Leaves 技术架构

## 1. 推荐架构

第一版采用本地优先桌面架构：

```text
Tauri desktop shell
  -> React + TypeScript UI
  -> Local service commands
  -> SQLite database
  -> Provider adapters
  -> Map rendering
```

Tauri 负责 Windows 桌面能力、文件访问、系统托盘和打包。React 负责交互界面。SQLite 保存用户行程、地点、轨迹、附件和 provider 原始响应。

## 2. 模块拆分

```text
apps/
  desktop/              # 正式 Tauri + React 应用
  desktop-prototype/    # 当前静态交互原型
docs/
  PRD.md
  TECHNICAL_ARCHITECTURE.md
  DATA_MODEL.md
  ROADMAP.md
```

正式应用建议继续拆成：

```text
src/
  features/
    quick-add/
    trips/
    map/
    stats/
    settings/
  providers/
    flight/
    rail/
    road/
    map/
    ocr/
  storage/
    migrations/
    repositories/
  shared/
    domain/
    ui/
    utils/
```

## 3. Provider Adapter

外部数据源必须隔离在 provider 层，不直接散落在页面中。

```text
User input
  -> Input parser
  -> Resolver
  -> Provider adapter
  -> Normalized trip draft
  -> User confirmation
  -> Local trip record
```

建议接口：

```ts
export interface TripProvider {
  name: string;
  supports(input: ParsedInput): boolean;
  resolve(input: ParsedInput): Promise<TripDraft[]>;
}
```

### 航班

- 正式商业数据源优先选择 FlightAware AeroAPI 等合规接口。
- OpenSky 可用于技术验证和低成本轨迹补全，但覆盖率、额度、调用方式需要单独评估。
- 不建议把抓取 Flightradar24 页面作为产品数据源。

### 铁路

- 国内铁路车次信息应优先寻找合规数据源或静态基础库。
- MVP 可以先采用用户确认模式：车次号识别 + 日期 + 起终点 + 时间。
- 不建议把 12306 非公开接口作为核心依赖。

### 打车/大巴/自驾

- 先通过起点、终点、时间、费用、备注记录。
- 地图路线可以由地图 routing provider 补全为近似线路。
- 后续支持票据截图 OCR、邮件导入、CSV 导入。

## 4. 地图方案

地图层使用 MapLibre GL JS。正式实现时需要支持：

- Point layer：机场、车站、城市、上下车点。
- Line layer：铁路、公路、自驾路线。
- Arc layer：航班大圆弧线。
- Cluster layer：密集城市点位聚合。
- Replay mode：按时间播放年度行程。

MVP 不要求真实底图离线。先保证路线数据结构正确，后续再接入在线或离线瓦片。

## 5. 本地数据与隐私

- 默认所有数据保存在本机。
- 外部 provider 的原始响应单独保存，便于排查和重算。
- 附件放在应用数据目录，数据库只保存路径和元信息。
- 用户必须能导出 JSON/CSV，并能完整备份本地数据库。

## 6. 风险

- 航班/铁路数据源成本和稳定性。
- 国内地图和海外地图的服务可用性差异。
- 票据 OCR 的准确率和隐私风险。
- 航班号/车次号本身不唯一，通常需要日期才能准确匹配。
