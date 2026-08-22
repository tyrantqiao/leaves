# Leaves 部署手册

本文用于把当前原型部署到 `139.196.79.30`，并通过 `leaves.tyrantqiao.com` 提供访问。当前版本适合个人使用或小范围演示；它仍然使用 JSON 文件保存行程，不包含用户登录和多用户隔离。

## 1. 上线前提

需要先在 DNS 控制台添加记录：

```text
leaves.tyrantqiao.com  A  139.196.79.30
```

服务器需要满足：

- Ubuntu LTS 或其他 Linux 发行版
- Node.js 18 或更高版本，建议 Node.js 20 LTS
- SSH 端口对当前管理来源开放
- 80/443 端口对外开放

如果 SSH 在 TCP 握手后立即被服务器关闭，优先检查云安全组、服务器防火墙、fail2ban、SSH 端口和来源 IP 白名单。

## 2. 上传代码

服务器可以直接从 GitHub 获取代码：

```bash
sudo mkdir -p /opt/leaves/current /opt/leaves/shared/data
sudo chown -R "$USER":"$USER" /opt/leaves
git clone --branch main --single-branch \
  https://github.com/tyrantqiao/leaves.git /opt/leaves/current
cd /opt/leaves/current
npm ci --omit=dev
```

如果服务器不能访问 GitHub，可以在本地打包后通过 SCP 上传。不要上传 `node_modules`，也不要把真实的 `.env` 和行程数据提交到 Git。

## 3. 启动 Node 服务

原型服务默认只监听 `127.0.0.1:4173`，外部访问由 Nginx 负责 HTTP/HTTPS。

当前版本不自动读取 `.env` 文件；服务器上请使用 shell 环境变量、PM2 配置或 systemd `EnvironmentFile` 注入配置。

```bash
cd /opt/leaves/current
export LEAVES_DATA_DIR=/opt/leaves/shared/data
export LEAVES_READ_ONLY=false
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

本机健康检查：

```bash
curl -I http://127.0.0.1:4173/
curl -i http://127.0.0.1:4173/api/data/trips
```

若只想发布只读演示，把 `LEAVES_READ_ONLY` 设为 `true`，行程写入接口会返回 `403`，浏览器仍可展示内置或已有数据。

## 4. 使用 Nginx 配置 HTTPS

当前服务器使用 Nginx 反向代理到 `127.0.0.1:4173`。仓库中保留了一份 Nginx 配置模板：

```bash
sudo cp ops/nginx/leaves.conf /etc/nginx/sites-available/leaves
sudo ln -sf /etc/nginx/sites-available/leaves /etc/nginx/sites-enabled/leaves
sudo unlink /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t
sudo systemctl reload nginx
```

当前 `leaves.tyrantqiao.com` 经过 Cloudflare 代理。HTTP-01 方式申请 Let's Encrypt 时，Cloudflare 对 `/.well-known/acme-challenge` 返回 `403`，所以源站暂时使用自签证书监听 443，由 Cloudflare 对浏览器提供公网可信证书。

源站临时证书生成命令：

```bash
sudo openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout /etc/ssl/private/leaves-selfsigned.key \
  -out /etc/ssl/certs/leaves-selfsigned.crt \
  -subj "/CN=leaves.tyrantqiao.com" \
  -addext "subjectAltName=DNS:leaves.tyrantqiao.com,IP:139.196.79.30"
sudo chmod 600 /etc/ssl/private/leaves-selfsigned.key
```

更稳妥的正式证书路径有两种：

- 在 Cloudflare 中临时关闭 `leaves.tyrantqiao.com` 代理，让 DNS 直接指向 `139.196.79.30`，再执行 `certbot --nginx -d leaves.tyrantqiao.com`。
- 保持 Cloudflare 代理，改用 DNS-01 验证，需要 Cloudflare API Token 和 `certbot-dns-cloudflare` 插件。

确认 80/443 已放行后，访问：

```text
https://leaves.tyrantqiao.com
```

第一阶段建议使用同源 `/api`，不需要配置跨域。如果以后把 API 拆到独立域名，再设置 `LEAVES_CORS_ORIGIN` 为明确的允许来源，不要使用 `*`。

## 5. 数据和备份

当前行程文件位于 `LEAVES_DATA_DIR/trips.json`。至少每天备份一次：

```bash
mkdir -p /opt/leaves/shared/backups
cp /opt/leaves/shared/data/trips.json \
  /opt/leaves/shared/backups/trips-$(date +%F).json
```

当前 API 使用整体数组覆盖写入，正式多人服务前应迁移到 SQLite 或 PostgreSQL，并增加登录、权限、审计和导出/删除能力。

## 6. 发布新版本

```bash
cd /opt/leaves/current
git pull --ff-only origin main
npm ci --omit=dev
pm2 restart leaves --update-env
pm2 status
pm2 logs leaves --lines 100
```

发布前先确认工作区的行程数据位于 `/opt/leaves/shared/data`，不要放在代码目录内随版本替换。

当前生产代码已合并到 `main`。SSH 公钥登录配置完成后，后续可以直接使用：

```bash
ssh tyrantqiao@139.196.79.30
cd /opt/leaves/current
git pull --ff-only origin main
npm ci --omit=dev
pm2 restart leaves --update-env
pm2 save
```

## 7. 上线检查清单

- DNS 已解析到 `139.196.79.30`
- SSH、HTTP、HTTPS 安全组已按需放行
- Node 服务仅监听 `127.0.0.1:4173`
- `https://leaves.tyrantqiao.com` 可以打开首页
- `/api/data/trips` 可以正常读取
- 新增一条测试行程并确认刷新后仍存在
- PM2 自动重启和开机启动已配置
- `trips.json` 已加入定时备份
- 尚未开放给不可信用户前，确认隐私数据和未授权写入风险
