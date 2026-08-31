# Leaves 数据模型

## 1. 核心实体

### Trip

一次完整出行，可以包含一个或多个 segment。MVP 可以先让一个 trip 等于一个 segment。

```sql
trips (
  id text primary key,
  title text not null,
  mode text not null,
  status text not null,
  departure_time text,
  arrival_time text,
  origin_place_id text,
  destination_place_id text,
  distance_km real,
  cost_amount real,
  cost_currency text,
  notes text,
  created_at text not null,
  updated_at text not null
)
```

### Segment

一段具体交通记录，例如一趟航班、一趟高铁、一次打车。

```sql
segments (
  id text primary key,
  trip_id text not null,
  mode text not null,
  provider text,
  external_id text,
  service_number text,
  operator_name text,
  vehicle_name text,
  cabin_or_seat text,
  departure_time text,
  arrival_time text,
  origin_place_id text,
  destination_place_id text,
  planned_geometry_id text,
  actual_geometry_id text,
  raw_source_id text
)
```

### Place

地点可以是机场、车站、城市、酒店、上车点或手动标记点。

```sql
places (
  id text primary key,
  name text not null,
  type text not null,
  code text,
  city text,
  region text,
  country text,
  latitude real,
  longitude real,
  created_at text not null
)
```

### Geometry

路线几何信息。航班可以是大圆弧线，铁路/公路可以是 polyline。

```sql
geometries (
  id text primary key,
  type text not null,
  encoding text not null,
  data text not null,
  distance_km real,
  created_at text not null
)
```

### Attachment

暂不实现。当前产品方向不上传票据、登机牌、截图或照片，也不做 OCR；航班信息由用户手动登记。

```sql
attachments (
  id text primary key,
  trip_id text,
  segment_id text,
  file_path text not null,
  media_type text,
  title text,
  captured_at text,
  created_at text not null
)
```

### RawSource

外部 provider 的原始响应。

```sql
raw_sources (
  id text primary key,
  provider text not null,
  request_hash text,
  payload text not null,
  fetched_at text not null
)
```

## 2. 枚举建议

### mode

```text
flight
rail
coach
taxi
ride_hailing
self_drive
ferry
walk
other
```

### status

```text
draft
planned
completed
cancelled
unknown
```

### place.type

```text
airport
rail_station
bus_station
address
city
poi
manual
```

## 3. 输入解析结果

快速登记框不直接写入 trip，而是先生成 draft。

```ts
type ParsedInput = {
  rawText: string;
  detectedMode: TravelMode | "unknown";
  serviceNumber?: string;
  date?: string;
  originText?: string;
  destinationText?: string;
  confidence: number;
};
```

## 4. MVP 简化

静态原型阶段可以把 trips、places、geometry 合并成浏览器 localStorage JSON。正式 Tauri 版本再迁移到 SQLite。
