"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const chinaCsvPath = path.join(root, "apps", "desktop-prototype", "server", "resources", "china-railway-stations.csv");
const stationNamePath = path.join(root, "apps", "desktop-prototype", "server", "resources", "station_name.js");
const outputPath = path.join(root, "apps", "desktop-prototype", "rail-station-coordinates.js");

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function station(country, name, lng, lat, aliases = [], precision = "station") {
  return [country, name, Number(lng), Number(lat), aliases, precision];
}

function loadChinaStations() {
  const csv = fs.readFileSync(chinaCsvPath, "utf8").replace(/^\uFEFF/, "");
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const records = [];
  const seen = new Set();

  for (const line of lines.slice(1)) {
    const [name, rawLng, rawLat] = parseCsvLine(line).map((value) => value.trim());
    const lng = Number(rawLng);
    const lat = Number(rawLat);
    if (!name || !Number.isFinite(lng) || !Number.isFinite(lat) || seen.has(name)) continue;
    seen.add(name);
    records.push(station("CN", name, lng, lat));
  }

  return records;
}

function load12306Stations() {
  const content = fs.readFileSync(stationNamePath, "utf8");
  const match = content.match(/var station_names ?= ?'(.*?)';/s);
  if (!match) return [];

  const byName = new Map();
  for (const raw of match[1].split("@").filter(Boolean)) {
    const parts = raw.split("|");
    const name = String(parts[1] || "").trim();
    if (!name || byName.has(name)) continue;
    byName.set(name, {
      name,
      code: String(parts[2] || "").trim(),
      city: String(parts[7] || "").trim()
    });
  }
  return [...byName.values()];
}

const chinaFallbackCoordinates = {
  "北海": [109.119254, 21.473343],
  "海口": [110.19989, 20.04422],
  "延边": [129.508946, 42.891255],
  "防城港": [108.35472, 21.68686],
  "黑河": [127.528226, 50.245329],
  "华阴": [110.092286, 34.565359],
  "黄山": [118.337476, 29.714655],
  "嘉兴": [120.755486, 30.746129],
  "南阳": [112.528321, 32.990833],
  "香港": [114.169361, 22.319304],
  "香港西九龙": [114.165703, 22.304928],
  "秀山": [109.007094, 28.448248],
  "珠海": [113.576677, 22.270978],
  "珠海机场": [113.375828, 22.006886],
  "珠海长隆": [113.536199, 22.098812],
  "横琴": [113.548323, 22.124871],
  "横琴北": [113.53291, 22.145168],
  "井湾": [113.52647, 22.17961],
  "前山": [113.520824, 22.243134],
  "十字门": [113.53843, 22.18077],
  "湾仔": [113.53653, 22.20404],
  "湾仔北": [113.53444, 22.21231],
  "湛江": [110.359377, 21.270708],
  "安溪": [118.186014, 25.056824],
  "呼伦贝尔": [119.765744, 49.211574],
  "白银": [104.138872, 36.545123],
  "莱芜": [117.676723, 36.213813],
  "来舟": [118.149307, 26.646983],
  "马桥河": [129.619822, 44.586103],
  "兴安": [122.037796, 46.082373],
  "朝阳": [120.450372, 41.573734],
  "阿拉善": [105.706422, 38.844814],
  "沙县": [117.792551, 26.397073],
  "云浮": [112.044491, 22.929801],
  "河池": [108.085261, 24.692931],
  "白山": [126.424581, 41.940316]
};

function append12306Fallbacks(chinaStations) {
  const byName = new Map(chinaStations.map((record) => [record[1], record]));
  const additions = [];

  for (const record of load12306Stations()) {
    if (byName.has(record.name)) continue;
    const cityMatch = byName.get(record.city);
    const manual = chinaFallbackCoordinates[record.name] || chinaFallbackCoordinates[record.city];
    const fallback = cityMatch ? [cityMatch[2], cityMatch[3]] : manual;
    if (!fallback) continue;

    const aliases = [record.code, record.city && record.city !== record.name ? record.city : ""].filter(Boolean);
    const generated = station("CN", record.name, fallback[0], fallback[1], aliases, cityMatch ? "city-station-fallback" : "city-fallback");
    additions.push(generated);
    byName.set(record.name, generated);
  }

  return [...chinaStations, ...additions];
}

const internationalStations = [
  station("JP", "东京", 139.767125, 35.681236, ["东京站", "東京", "東京駅", "Tokyo", "Tokyo Station"]),
  station("JP", "新宿", 139.700464, 35.689729, ["新宿站", "新宿駅", "Shinjuku", "Shinjuku Station"]),
  station("JP", "涩谷", 139.701238, 35.658034, ["涩谷站", "渋谷", "渋谷駅", "Shibuya", "Shibuya Station"]),
  station("JP", "上野", 139.777043, 35.713768, ["上野站", "上野駅", "Ueno", "Ueno Station"]),
  station("JP", "品川", 139.738999, 35.628471, ["品川站", "品川駅", "Shinagawa", "Shinagawa Station"]),
  station("JP", "京都", 135.758766, 34.985849, ["京都站", "京都駅", "Kyoto", "Kyoto Station"]),
  station("JP", "新大阪", 135.500093, 34.73348, ["新大阪站", "新大阪駅", "Shin-Osaka", "Shin Osaka"]),
  station("JP", "大阪", 135.495951, 34.702485, ["大阪站", "大阪駅", "Osaka", "Osaka Station", "梅田", "Umeda"]),
  station("JP", "难波", 135.500155, 34.666263, ["难波站", "なんば", "Namba", "Namba Station"]),
  station("JP", "奈良", 135.818989, 34.680976, ["奈良站", "奈良駅", "Nara", "Nara Station"]),
  station("JP", "广岛", 132.475012, 34.397498, ["广岛站", "広島", "広島駅", "Hiroshima", "Hiroshima Station"]),
  station("JP", "博多", 130.420653, 33.59019, ["博多站", "博多駅", "Hakata", "Hakata Station"]),
  station("JP", "金泽", 136.648698, 36.578057, ["金泽站", "金沢", "金沢駅", "Kanazawa", "Kanazawa Station"]),
  station("JP", "名古屋", 136.881537, 35.170694, ["名古屋站", "名古屋駅", "Nagoya", "Nagoya Station"]),
  station("JP", "札幌", 141.350784, 43.068612, ["札幌站", "札幌駅", "Sapporo", "Sapporo Station"]),
  station("JP", "小田原", 139.155778, 35.25642, ["小田原站", "小田原駅", "Odawara", "Odawara Station"]),
  station("JP", "箱根汤本", 139.103606, 35.233487, ["箱根湯本", "箱根湯本駅", "Hakone-Yumoto", "Hakone Yumoto"]),
  station("JP", "镰仓", 139.550167, 35.319225, ["镰仓站", "鎌倉", "鎌倉駅", "Kamakura", "Kamakura Station"]),

  station("KR", "首尔", 126.970606, 37.554648, ["首尔站", "서울", "서울역", "Seoul", "Seoul Station"]),
  station("KR", "龙山", 126.96479, 37.529849, ["龙山站", "용산", "용산역", "Yongsan", "Yongsan Station"]),
  station("KR", "清凉里", 127.048469, 37.580178, ["清凉里站", "청량리", "Cheongnyangni"]),
  station("KR", "釜山", 129.039317, 35.115215, ["釜山站", "부산", "부산역", "Busan", "Busan Station"]),
  station("KR", "东大邱", 128.628827, 35.879722, ["东大邱站", "동대구", "Dongdaegu", "Daegu"]),
  station("KR", "庆州", 129.138689, 35.798091, ["庆州站", "경주", "Gyeongju"]),
  station("KR", "仁川机场", 126.451408, 37.447493, ["仁川机场站", "仁川国际机场", "Incheon Airport", "Incheon Airport Terminal 1"]),

  station("TH", "曼谷中央", 100.54098, 13.804587, ["曼谷中央站", "邦苏", "Bang Sue", "Krung Thep Aphiwat", "Bangkok Central"]),
  station("TH", "曼谷华南蓬", 100.516809, 13.737283, ["华南蓬", "华南蓬站", "Hua Lamphong", "Bangkok Railway Station"]),
  station("TH", "大城", 100.57892, 14.356812, ["大城站", "Ayutthaya", "Ayutthaya Station"]),
  station("TH", "清迈", 99.017015, 18.78382, ["清迈站", "Chiang Mai", "Chiang Mai Station"]),
  station("TH", "素叻他尼", 99.171868, 9.133879, ["素叻他尼站", "Surat Thani", "Surat Thani Station"]),

  station("VN", "河内", 105.841172, 21.024581, ["河内站", "Ga Hà Nội", "Hanoi", "Hanoi Station"]),
  station("VN", "西贡", 106.680618, 10.782499, ["西贡站", "胡志明市站", "Ga Sài Gòn", "Saigon", "Ho Chi Minh City"]),
  station("VN", "岘港", 108.209229, 16.070274, ["岘港站", "Ga Đà Nẵng", "Da Nang", "Da Nang Station"]),
  station("VN", "顺化", 107.578537, 16.456394, ["顺化站", "Ga Huế", "Hue", "Hue Station"]),
  station("VN", "芽庄", 109.184338, 12.248945, ["芽庄站", "Ga Nha Trang", "Nha Trang"]),
  station("VN", "老街", 103.970259, 22.485907, ["老街站", "Ga Lào Cai", "Lao Cai"]),

  station("MY", "吉隆坡中央", 101.686898, 3.134158, ["吉隆坡中央车站", "KL Sentral", "Kuala Lumpur Sentral"]),
  station("MY", "北海", 100.363582, 5.394243, ["北海站", "Butterworth", "Butterworth Station"]),
  station("MY", "新山中央", 103.764752, 1.462681, ["新山中央车站", "JB Sentral", "Johor Bahru Sentral"]),
  station("MY", "怡保", 101.073423, 4.597087, ["怡保站", "Ipoh", "Ipoh Station"]),
  station("MY", "金马士", 102.618981, 2.582845, ["金马士站", "Gemas", "Gemas Station"]),
  station("SG", "兀兰火车关卡", 103.785694, 1.443889, ["兀兰", "Woodlands Train Checkpoint", "Woodlands CIQ"]),

  station("GB", "伦敦圣潘克拉斯", -0.12518, 51.53153, ["圣潘克拉斯", "London St Pancras", "St Pancras International"]),
  station("GB", "伦敦国王十字", -0.123557, 51.532103, ["国王十字", "London King's Cross", "Kings Cross"]),
  station("GB", "伦敦帕丁顿", -0.176174, 51.516674, ["帕丁顿", "London Paddington", "Paddington"]),
  station("GB", "伦敦维多利亚", -0.144718, 51.495214, ["维多利亚", "London Victoria", "Victoria Station"]),
  station("GB", "伦敦滑铁卢", -0.113247, 51.503165, ["滑铁卢", "London Waterloo", "Waterloo"]),
  station("GB", "爱丁堡韦弗利", -3.188245, 55.952394, ["爱丁堡", "Edinburgh Waverley"]),
  station("GB", "约克", -1.093094, 53.958021, ["约克站", "York", "York Station"]),
  station("GB", "曼彻斯特皮卡迪利", -2.230902, 53.477401, ["曼彻斯特", "Manchester Piccadilly"]),
  station("GB", "利物浦莱姆街", -2.978438, 53.407317, ["利物浦", "Liverpool Lime Street"]),

  station("FR", "巴黎北站", 2.355329, 48.880931, ["Gare du Nord", "Paris Nord", "Paris Gare du Nord"]),
  station("FR", "巴黎里昂站", 2.373032, 48.8443, ["Gare de Lyon", "Paris Gare de Lyon"]),
  station("FR", "巴黎蒙帕纳斯", 2.321041, 48.841172, ["Gare Montparnasse", "Paris Montparnasse"]),
  station("FR", "巴黎东站", 2.359999, 48.876986, ["Gare de l'Est", "Paris Est"]),
  station("FR", "斯特拉斯堡", 7.735975, 48.585073, ["Strasbourg", "Strasbourg Station"]),
  station("FR", "里昂帕尔迪厄", 4.859436, 45.760586, ["Lyon Part-Dieu", "Lyon Part Dieu"]),
  station("FR", "马赛圣夏尔", 5.380155, 43.302574, ["Marseille Saint-Charles", "Marseille St Charles"]),
  station("FR", "尼斯城", 7.261953, 43.704947, ["Nice-Ville", "Nice Ville"]),
  station("FR", "波尔多圣让", -0.556494, 44.825873, ["Bordeaux Saint-Jean", "Bordeaux St Jean"]),
  station("FR", "阿维尼翁TGV", 4.785928, 43.921958, ["Avignon TGV"]),

  station("IT", "罗马特米尼", 12.502124, 41.900879, ["Roma Termini", "Rome Termini"]),
  station("IT", "米兰中央", 9.204592, 45.486292, ["Milano Centrale", "Milan Central"]),
  station("IT", "佛罗伦萨新圣母", 11.248017, 43.776778, ["Firenze Santa Maria Novella", "Firenze SMN"]),
  station("IT", "威尼斯圣露西亚", 12.321121, 45.441015, ["Venezia Santa Lucia", "Venezia S. Lucia"]),
  station("IT", "那不勒斯中央", 14.271202, 40.852793, ["Napoli Centrale", "Naples Central"]),
  station("IT", "都灵新门", 7.677631, 45.062958, ["Torino Porta Nuova", "Turin Porta Nuova"]),
  station("IT", "博洛尼亚中央", 11.342567, 44.505825, ["Bologna Centrale"]),

  station("ES", "马德里阿托查", -3.690633, 40.406555, ["Madrid Atocha", "Atocha"]),
  station("ES", "马德里查马丁", -3.6823, 40.4721, ["Madrid Chamartin", "Madrid Chamartín"]),
  station("ES", "巴塞罗那桑兹", 2.140608, 41.379124, ["Barcelona Sants", "Sants"]),
  station("ES", "塞维利亚圣胡斯塔", -5.974112, 37.392314, ["Sevilla Santa Justa", "Seville Santa Justa"]),
  station("ES", "瓦伦西亚华金索罗利亚", -0.38103, 39.459107, ["Valencia Joaquin Sorolla", "Valencia Joaquín Sorolla"]),
  station("ES", "格拉纳达", -3.609048, 37.184043, ["Granada", "Granada Station"]),
  station("ES", "马拉加玛利亚桑布拉诺", -4.432915, 36.711339, ["Malaga Maria Zambrano", "Málaga María Zambrano"]),

  station("DE", "柏林中央", 13.369402, 52.525085, ["Berlin Hauptbahnhof", "Berlin Hbf", "Berlin Central"]),
  station("DE", "慕尼黑中央", 11.558327, 48.140232, ["Munich Hauptbahnhof", "Munich Hbf", "München Hbf"]),
  station("DE", "法兰克福中央", 8.663789, 50.107145, ["Frankfurt Hauptbahnhof", "Frankfurt Hbf", "Frankfurt Main Hbf"]),
  station("DE", "科隆中央", 6.95873, 50.942821, ["Köln Hauptbahnhof", "Koln Hbf", "Cologne Hbf"]),
  station("DE", "汉堡中央", 10.006909, 53.552736, ["Hamburg Hauptbahnhof", "Hamburg Hbf"]),
  station("DE", "杜塞尔多夫中央", 6.794206, 51.220266, ["Düsseldorf Hauptbahnhof", "Dusseldorf Hbf"]),
  station("DE", "斯图加特中央", 9.181601, 48.783478, ["Stuttgart Hauptbahnhof", "Stuttgart Hbf"]),
  station("DE", "德累斯顿中央", 13.732039, 51.040573, ["Dresden Hauptbahnhof", "Dresden Hbf"]),

  station("CH", "苏黎世中央", 8.540192, 47.378177, ["Zurich HB", "Zürich HB", "Zurich Hauptbahnhof"]),
  station("CH", "日内瓦科尔纳万", 6.142251, 46.210247, ["Geneva Cornavin", "Genève-Cornavin"]),
  station("CH", "因特拉肯东", 7.869028, 46.690499, ["Interlaken Ost"]),
  station("CH", "卢塞恩", 8.310269, 47.050169, ["Lucerne", "Luzern"]),
  station("CH", "伯尔尼", 7.439118, 46.948829, ["Bern", "Bern Bahnhof"]),
  station("AT", "维也纳中央", 16.37666, 48.185014, ["Wien Hauptbahnhof", "Vienna Hbf"]),
  station("AT", "萨尔茨堡中央", 13.045808, 47.81305, ["Salzburg Hauptbahnhof", "Salzburg Hbf"]),
  station("NL", "阿姆斯特丹中央", 4.900278, 52.378887, ["Amsterdam Centraal", "Amsterdam Central"]),
  station("NL", "鹿特丹中央", 4.468914, 51.924216, ["Rotterdam Centraal", "Rotterdam Central"]),
  station("BE", "布鲁塞尔南站", 4.336526, 50.835898, ["Bruxelles-Midi", "Brussel-Zuid", "Brussels Midi", "Brussels South"]),
  station("BE", "布鲁日", 3.216912, 51.197226, ["Brugge", "Bruges", "Bruges Station"]),
  station("CZ", "布拉格中央", 14.435756, 50.083029, ["Praha hlavní nádraží", "Praha hl.n.", "Prague Main Station"]),

  station("US", "纽约宾州", -73.993584, 40.750568, ["New York Penn", "Penn Station", "Moynihan Train Hall"]),
  station("US", "华盛顿联合", -77.006424, 38.897095, ["Washington Union Station", "Union Station DC"]),
  station("US", "波士顿南站", -71.055242, 42.352271, ["Boston South Station", "South Station"]),
  station("US", "芝加哥联合", -87.640308, 41.878641, ["Chicago Union Station"]),
  station("US", "洛杉矶联合", -118.236502, 34.056219, ["Los Angeles Union Station", "LA Union Station"]),
  station("US", "西雅图国王街", -122.329476, 47.598476, ["Seattle King Street", "King Street Station"]),
  station("CA", "多伦多联合", -79.380597, 43.645278, ["Toronto Union Station"]),
  station("CA", "温哥华太平洋中央", -123.097821, 49.273703, ["Vancouver Pacific Central"]),
  station("CA", "蒙特利尔中央", -73.566021, 45.500512, ["Montreal Central Station", "Gare Centrale"]),
  station("AU", "悉尼中央", 151.20699, -33.883676, ["Sydney Central", "Central Station Sydney"]),
  station("AU", "墨尔本南十字", 144.952566, -37.818341, ["Melbourne Southern Cross", "Southern Cross Station"])
];

const allStations = [...append12306Fallbacks(loadChinaStations()), ...internationalStations];
const header = `// Generated by scripts/build-rail-station-coordinates.cjs.\n` +
  `// China station coordinates source: https://github.com/wensimehrp/chinese-railway-gtfs (out.csv, WGS84/OpenStreetMap-derived).\n` +
  `// 12306 names absent from that source use same-city fallback coordinates so imported rail records still render offline.\n` +
  `// Format: [countryCode, canonicalName, longitude, latitude, aliases[], precision].\n`;

fs.writeFileSync(
  outputPath,
  `${header}window.LEAVES_RAIL_STATIONS = ${JSON.stringify(allStations)};\n`,
  "utf8"
);

console.log(`Wrote ${allStations.length} rail station coordinates to ${path.relative(root, outputPath)}`);
