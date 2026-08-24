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

发布动作统一由仓库内脚本完成：

```bash
cd /opt/leaves/current
bash ops/deploy/deploy.sh
pm2 status
pm2 logs leaves --lines 100
```

`ops/deploy/deploy.sh` 会执行：

- 使用 `flock` 防止并发部署。
- `git fetch origin main` 并只允许 `git merge --ff-only origin/main`。
- 确认服务器 checkout 正在目标分支上，默认必须是 `main`。
- 检查代码目录是否存在已跟踪的本地改动；有改动时拒绝覆盖。
- `npm ci --omit=dev` 安装生产依赖。
- `pm2 restart leaves --update-env`，首次部署时会从 `ecosystem.config.cjs` 启动。
- 访问 `http://127.0.0.1:4173/` 做本机健康检查。

可通过环境变量覆盖默认值：

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `LEAVES_APP_DIR` | `/opt/leaves/current` | 服务器代码目录 |
| `LEAVES_DEPLOY_REMOTE` | `origin` | Git remote 名称 |
| `LEAVES_DEPLOY_BRANCH` | `main` | 部署分支 |
| `LEAVES_PM2_APP` | `leaves` | PM2 应用名 |
| `LEAVES_DATA_DIR` | `/opt/leaves/shared/data` | 运行数据目录 |
| `LEAVES_HEALTH_URL` | `http://127.0.0.1:4173/` | 发布后健康检查地址 |
| `LEAVES_DEPLOY_LOCK` | `/tmp/leaves-deploy.lock` | 部署锁文件 |
| `LEAVES_GIT_HTTP_VERSION` | `HTTP/1.1` | Git fetch 使用的 HTTP 版本；服务器访问 GitHub 不稳定时保持默认值 |
| `LEAVES_GIT_FETCH_ATTEMPTS` | `5` | Git fetch 最大重试次数 |
| `LEAVES_GIT_FETCH_RETRY_DELAY` | `5` | Git fetch 失败后的重试间隔秒数 |

发布前先确认工作区的行程数据位于 `/opt/leaves/shared/data`，不要放在代码目录内随版本替换。

## 7. 自动部署方案一：GitHub Actions 推送触发

仓库已提供 `.github/workflows/deploy.yml`。它会在 `main` 分支 push 后触发，也支持在 GitHub Actions 页面手动运行。

工作流逻辑：

1. 检出当前仓库。
2. 用 `bash -n` 检查部署脚本语法。
3. 读取 GitHub Secrets 中的 SSH 信息。
4. 把当前提交里的 `ops/deploy/deploy.sh` 上传到服务器 `/tmp`。
5. 通过 SSH 在服务器执行该脚本，由服务器从 GitHub 拉取 `main` 并重启 PM2。

需要在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 配置 Secrets：

| Secret | 示例 | 说明 |
| --- | --- | --- |
| `LEAVES_DEPLOY_HOST` | `139.196.79.30` | 服务器地址 |
| `LEAVES_DEPLOY_USER` | `deploy` | SSH 登录用户 |
| `LEAVES_DEPLOY_PORT` | `22` | 可选，未配置时使用 22 |
| `LEAVES_DEPLOY_SSH_KEY` | 私钥内容 | GitHub Actions 登录服务器用的私钥 |
| `LEAVES_DEPLOY_KNOWN_HOSTS` | `ssh-keyscan -H 139.196.79.30` 的输出 | 服务器 host key，建议核对指纹后再写入；非 22 端口使用 `ssh-keyscan -p 端口 -H 主机` |

可选配置 Variables：

| Variable | 默认值 | 说明 |
| --- | --- | --- |
| `LEAVES_REMOTE_APP_DIR` | `/opt/leaves/current` | 服务器代码目录 |
| `LEAVES_REMOTE_DEPLOY_BRANCH` | `main` | 远端部署分支 |

服务器侧建议使用非 root 的部署用户，并确保该用户具备这些权限：

```bash
sudo mkdir -p /opt/leaves/current /opt/leaves/shared/data
sudo chown -R deploy:deploy /opt/leaves
sudo -iu deploy
cd /opt/leaves/current
git remote -v
bash ops/deploy/deploy.sh
```

如果继续使用现有 SSH 用户，也要确保该用户可以执行 `git`、`npm`、`pm2`，并且能写入 `/opt/leaves/current` 与 `/opt/leaves/shared/data`。GitHub Actions 的 SSH 用户、systemd 的 `User=` 和实际运行 PM2 的用户应保持一致，否则 PM2 进程表和部署锁可能不在同一个用户上下文里。

## 8. 自动部署方案二：服务器定时拉取

仓库已提供：

- `ops/deploy/poll-and-deploy.sh`：拉取远端信息，发现 `origin/main` 和当前 `HEAD` 不一致时调用 `deploy.sh`。
- `ops/systemd/leaves-deploy-check.service`：一次性检查服务。
- `ops/systemd/leaves-deploy-check.timer`：每 2 分钟触发一次检查。

启用前先根据服务器实际用户修改 `ops/systemd/leaves-deploy-check.service` 中的 `User=deploy`。如果 Node.js 或 PM2 来自 `nvm`，还需要把 `Environment=PATH=...` 调整到能找到 `node`、`npm`、`pm2` 的路径。

安装 systemd 定时器：

```bash
cd /opt/leaves/current
sudo install -m 0644 ops/systemd/leaves-deploy-check.service /etc/systemd/system/leaves-deploy-check.service
sudo install -m 0644 ops/systemd/leaves-deploy-check.timer /etc/systemd/system/leaves-deploy-check.timer
sudo systemctl daemon-reload
sudo systemctl enable --now leaves-deploy-check.timer
systemctl list-timers --all leaves-deploy-check.timer
```

可选地用 `/etc/leaves/deploy.env` 覆盖部署参数：

```bash
sudo mkdir -p /etc/leaves
sudo tee /etc/leaves/deploy.env >/dev/null <<'EOF'
LEAVES_APP_DIR=/opt/leaves/current
LEAVES_DEPLOY_REMOTE=origin
LEAVES_DEPLOY_BRANCH=main
LEAVES_DATA_DIR=/opt/leaves/shared/data
LEAVES_HEALTH_URL=http://127.0.0.1:4173/
LEAVES_GIT_HTTP_VERSION=HTTP/1.1
LEAVES_GIT_FETCH_ATTEMPTS=5
LEAVES_GIT_FETCH_RETRY_DELAY=5
EOF
```

查看定时部署日志：

```bash
journalctl -u leaves-deploy-check.service -n 100 --no-pager
journalctl -u leaves-deploy-check.timer -n 50 --no-pager
```

如果服务器不使用 systemd，也可以把同一个轮询脚本放进 cron：

```cron
*/2 * * * * cd /opt/leaves/current && /usr/bin/env bash ops/deploy/poll-and-deploy.sh >> /opt/leaves/shared/deploy.log 2>&1
```

GitHub Actions 与服务器定时拉取可以同时存在：Actions 会尽快部署，timer 作为兜底；`deploy.sh` 的锁会阻止并发部署，`poll-and-deploy.sh` 在没有新提交时会直接退出。

## 9. 上线检查清单

- DNS 已解析到 `139.196.79.30`
- SSH、HTTP、HTTPS 安全组已按需放行
- Node 服务仅监听 `127.0.0.1:4173`
- `https://leaves.tyrantqiao.com` 可以打开首页
- `/api/data/trips` 可以正常读取
- 新增一条测试行程并确认刷新后仍存在
- PM2 自动重启和开机启动已配置
- `trips.json` 已加入定时备份
- 自动部署已选择并启用：GitHub Actions、服务器定时拉取，或两者都启用
- 尚未开放给不可信用户前，确认隐私数据和未授权写入风险
