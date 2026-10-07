# 安卓版 Leaves（本机优先）

可安装正式构建 APK：`exports/android-release/Leaves-Android.apk`（0.3.4），支持安卓 8.0 及以上。使用原有签名证书，可覆盖安装 0.3.0/0.3.1，保留本地记录。

## 应用更新

「更多 → 应用更新」显示当前版本，可手动检查、安装已下载更新或开关自动更新。默认启用自动更新，每次启动应用时检查 GitHub 最新正式 Release，同一次运行从后台返回或安装界面返回不会重复检查；检查在后台执行，离线或检查失败不打断首页；发现更高 versionCode 后下载并验证 APK，然后提示安装。关闭自动更新后仅手动检查。更新不要求连接 Leaves 数据服务器。

更新源为 `https://github.com/tyrantqiao/leaves/releases`。每个安卓 Release 提供 `Leaves-Android.apk` 和 `leaves-android-update.json`（版本、大小、SHA256、下载地址）。安装前校验包名、递增版本、文件大小/哈希和与当前安装一致的签名。断网、检查失败或下载中断均不会影响本机使用；可再次手动检查。

Android 8+ 首次安装更新需在系统设置允许 Leaves「安装未知应用」，之后返回安装确认界面。系统要求用户确认，无法静默安装。选择稍后后，可从应用更新入口安装已下载包。

## 独立使用

首次启动直接进入「本机记录」，无需配置服务器、注册或登录。行程、编辑草稿和路线记忆保存在手机私有存储；无网时可手动登记铁路和航班、查看地图和统计、导入及导出记录。世界陆地和中国省界底图随安装包提供，在线瓦片不可用时仍有底图。

更多菜单中的「导出当前记录」通过系统文件选择器保存 JSON 文件，可另存到 Downloads；JSON 恢复和 CSV 导入也使用文件选择器。卸载或清除应用数据会删除私有存储，独立导出的文件可恢复。手机解锁保护本机数据，不进行本机密码验证。

## 可选双向同步

「更多 → 数据同步」填写服务根地址、同步账号和密码，然后连接。服务器仅用于同步，不参与本机启动和保存。可登录已有账号或注册新账号，服务端账号上限仍是 5。密码仅在本次登录请求中使用，不保存到本机。

首次从「本机记录」绑定账号，会将未绑定的本机记录合并到该账号并移入该账号的本地副本，保留服务器已有记录。连接账号后，每次保存、应用回到前台、联网事件及前台每分钟尝试同步；也可点击「立即同步」。其他设备的修改在下一次同步时拉取。

断网或服务器关闭时，新增、编辑和删除都先保存在本机，联网后重试同步。登录过期会暂停同步，应用仍可正常使用。同步面板中的「暂停同步」保留当前账号和本地副本，继续独立使用；「恢复同步」重新合并本地待同步修改。

各服务器与各账号的本地副本隔离。从账号 A 切换到 B 不会将 A 的记录上传到 B。「退出同步账号」进入未绑定的本机工作区；账号副本仍保存在手机，再次连接原账号可读取。如果只是想离线继续使用当前记录，请选择「暂停同步」。

双向合并按行程 ID 进行：保留两端独立新增，传播未冲突的修改和删除。两端同时修改同一行程时，当前设备尚未同步的修改优先；覆盖前的服务器副本保留在本地，可在同步面板选择「导出同步前服务器副本」恢复。条件写入（ETag）避免并发覆盖。暂停同步不会清除待同步的修改或删除。

## 服务地址

例如 `https://leaves.example.com`。同一 Wi-Fi 可连接 `http://电脑局域网IP:4173`，电脑启动前设置 `$env:LEAVES_HOST='0.0.0.0'`，执行 `npm start` 并允许防火墙入站访问。手机不能用电脑的 `127.0.0.1`。公网使用 HTTPS。

旧版安卓已缓存的账号记录在覆盖安装后自动迁移到固定本机工作区，迁移无需服务器在线；默认暂停同步，避免升级时自动上传。旧版其他账号的缓存也保留。页面始终来自安装包，远端接口由原生网络层调用，不要求服务器开放跨域访问。

## 构建与验证

安装 JDK 17、Android SDK 35 和 Gradle 8.11.1 后，从仓库根目录执行：

```powershell
gradle -p apps/android assembleDebug lintDebug
```

产物：`apps/android/app/build/outputs/apk/debug/app-debug.apk`。正式发布需配置并保管自己的签名密钥。提交 GitHub 后，也可运行 `Android APK` 工作流下载产物，默认只生成调试产物；正式发布需配置签名 Secrets 并推送版本标签或勾选 publish。

正式包使用环境变量 `LEAVES_ANDROID_KEYSTORE`、`LEAVES_ANDROID_STORE_PASSWORD`、`LEAVES_ANDROID_KEY_ALIAS`、`LEAVES_ANDROID_KEY_PASSWORD`，执行 `gradle -p apps/android assembleRelease lintRelease`，然后运行 `node scripts/prepare-android-release.cjs` 生成 APK 和更新清单。签名文件及本机凭据保存在被忽略的 `exports/signing/`，应单独备份，不能提交或上传到 Release。

`.github/workflows/android.yml` 包含签名 Release 发布任务。配置仓库加密 Secrets `LEAVES_ANDROID_KEYSTORE_BASE64`（签名文件 Base64）以及上述密码和别名三个 Secrets 后，推送匹配版本的 `android-v*` 标签或手动选择 publish 可发布正式包。必须使用相同证书、递增 versionCode；已发布版本不会被该任务覆盖。

14 项存储检查、19 项浏览器检查，以及 `scripts/verify-android.cjs` 的首次无服务器启动、离线编辑/重启、首次双向合并、两端删除、冲突副本、登录过期、账号隔离和旧版缓存迁移检查通过。安卓专项检查模拟原生网络接口；当前没有连接安卓设备，真机 WebView、原生网络和系统文件选择器仍需安装后确认。

世界陆地底图：Natural Earth 1:110m（公共领域），https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson 。当前是二维世界地图，全局行程使用流动虚线，系统减少动画偏好会停用动画。
