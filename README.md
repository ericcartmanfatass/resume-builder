# 简历生成器 · Resume Builder

一个专注于**简洁编辑、实时预览和 A4 PDF 导出**的在线简历工具。支持模块化排版、Markdown / 富文本、手机编辑、简历源文件备份，以及可选的账号与云端简历管理。

本仓库是基于 [magicyan418/resume-builder](https://github.com/magicyan418/resume-builder) 继续维护的 **Fork 定制版**，不是原项目的官方发行版本。

**[在线体验：jianli.saintmaria.de](https://jianli.saintmaria.de)** · [本仓库](https://github.com/ericcartmanfatass/resume-builder) · [原项目](https://github.com/magicyan418/resume-builder)

> **部署状态（更新于 2026-11-06）：** 当前个人部署站点已支持游客编辑与 PDF 导出；Logto 登录尚未完成生产环境配置，因此登录后的云端保存、账号简历管理和分享功能虽已有代码实现，但**尚未完成线上端到端验收**。请勿将“代码已实现”误认为“线上已开放”。

## ✨ 功能概览

| 功能 | 说明 |
| --- | --- |
| 可视化简历编辑 | 个人信息、头像裁剪、时间范围、模块标题和正文均可编辑 |
| 模块化组织 | 模块拖拽排序、单独展开 / 收起、**全部收起** |
| 双模式内容输入 | Markdown 与富文本编辑；支持中文输入法与粘贴内容处理 |
| 左右联动预览 | 点击或滚动左侧编辑区，右侧跟随对应模块；选中字段以**半透明红框**提示 |
| A4 预览 | 编辑态支持上下额外滚动留白以便对齐；**不改变 PDF 的 A4 页面尺寸** |
| 移动端适配 | 窄屏编辑 / 预览切换、A4 缩放、触屏及软键盘交互优化 |
| PDF 导出 | 服务端 Chromium + Puppeteer，使用与预览一致的 HTML 模板 |
| 数据导入 / 导出 | `.jianli` 源文件备份；兼容符合结构的 `.json` 和旧版 `.magicyan` 文件 |
| 演示简历 | 内置虚构示例简历，便于体验头像、排版、模块和 PDF |
| 登录与云端功能 | 已编写 Logto 登录、云端自动保存、历史版本冲突保护及只读分享功能；**需先配置身份服务并验证** |

### 游客与登录用户

- **游客：** 在浏览器本地编辑和保留草稿，无须注册即可预览；服务端默认限制累计成功导出 **2 次 PDF**，并设有基于 Cookie、浏览器特征和 IP 哈希的辅助风控。
- **登录用户（配置 Logto 后）：** 云端管理简历、自动保存、只读分享、同步游客草稿以及不限累计 PDF 导出次数（仍有并发与速率限制）。
- **注意：** 登录尚未开通的站点，游客额度用尽后可能无法继续导出。应先完成 Logto 接入，再将登录能力作为正式功能对外宣传。

## 🆕 近期更新

### 2026-11-06 · 编辑器与实时预览

- **模块操作：** 在“添加模块”旁增加“全部收起”，一键关闭已展开的编辑模块，不修改数据和排序。
- **字段定位：** 编辑姓名、联系方式、模块标题、日期和正文时，预览端用低透明度红色描边和背景标识对应内容。
- **左右联动：** 支持点击、聚焦、重复选择及滚动编辑模块后定位到右侧相应位置。
- **预览滚动：** 固定桌面工作区高度，让左右面板各自滚动；为编辑态 A4 预览提供上下外部留白，改善首尾内容的定位。
- **输入体验：** 更新 iframe 内部模块节点，避免输入一个字符就重载整张预览页面。
- **视觉细节：** 调整联系方式标签与内容的基线；图标选择和删除按钮垂直居中。
- **演示与备份：** 更新为较完整的虚构中文简历，默认源文件改为 `.jianli`，保留旧格式导入能力。

### 2026-11-05 · 移动端、PDF 与部署

- 优化手机端编辑 / 预览布局、按钮尺寸和富文本输入体验。
- 修复部分 Android 输入法焦点、中文输入及软键盘引起的页面滚动问题。
- 完善 ARM64 Docker 构建及 Debian Chromium 路径识别，支持在 Oracle ARM VPS / 1Panel 环境中运行 PDF 导出。
- 调整部署方式，使 Next.js 服务能够通过本机端口接入反向代理，而无需直接对公网暴露应用端口。

> 更新记录根据本 Fork 的提交整理；更完整的修改历史请查看 [Commits](https://github.com/ericcartmanfatass/resume-builder/commits/fix/mobile-responsive)。

## 🧱 技术栈

| 领域 | 技术 |
| --- | --- |
| Web | Next.js 15、React 19、TypeScript |
| 样式与组件 | Tailwind CSS 4、Radix UI / shadcn/ui、Iconify、Lucide |
| 编辑 | `@uiw/react-md-editor`、自定义富文本编辑器、`@hello-pangea/dnd` |
| PDF | `puppeteer-core`、`@sparticuz/chromium`、系统 Chromium |
| 身份认证 | Logto（`@logto/next`） |
| 数据库 | PostgreSQL（`pg`） |
| 部署 | Node.js 22、pnpm 10、Docker Compose；可配合 1Panel / OpenResty |

## 🚀 本地运行

### 1. 环境要求

- Node.js **22**，pnpm **10**
- PostgreSQL（使用独立的业务数据库）
- 如需测试登录：提前准备 Logto 的 **Traditional Web** 应用
- 如需本机导出 PDF：安装可用的 Chrome / Chromium

```bash
git clone https://github.com/ericcartmanfatass/resume-builder.git
cd resume-builder
git switch fix/mobile-responsive
pnpm install
cp .env.example .env.local
```

> 当前功能开发集中于 `fix/mobile-responsive`；该分支尚未合并进 Fork 自己的 `main`。请按需选择分支，不要把 Fork 的 `main` 与原作者的 `main` 混淆。

### 2. 配置环境变量

编辑 `.env.local`。以下为常用项目，具体字段以 [`.env.example`](./.env.example) 为准：

| 环境变量 | 说明 |
| --- | --- |
| `LOGTO_BASE_URL` | 应用对外访问的 origin，例如 `http://localhost:3000`；即使暂时只用游客模式也应正确设置 |
| `GUEST_COOKIE_SECRET` | 至少 32 字符的独立随机密钥，用于游客 Cookie 与风控哈希 |
| `DATABASE_URL` | PostgreSQL **应用账号**连接 URL |
| `DATABASE_SSL` | `disable` 或 `require`；`require` 需能够验证服务器证书 |
| `LOGTO_ENDPOINT` | Logto 服务地址；启用登录时填写 |
| `LOGTO_APP_ID` / `LOGTO_APP_SECRET` | Logto Traditional Web 应用凭据；启用登录时填写 |
| `LOGTO_COOKIE_SECRET` | 至少 32 字符的随机密钥；启用登录时填写 |
| `TRUSTED_IP_HEADER` | 仅在可信反向代理覆盖该请求头、且无法绕过代理时设置 |
| `GUEST_IP_DAILY_LIMIT` | 同 IP 在 24 小时内的游客导出风控阈值，默认 10 |
| `GUEST_IP_DAILY_IDENTITIES` | 同 IP 在 24 小时内的游客身份数阈值，默认 5 |

**不要提交真实密码、密钥或数据库连接串。** `.env.local` 和 `.env.database-admin.local` 已被 Git 忽略。敏感配置均应留在服务端，不能加上 `NEXT_PUBLIC_` 前缀。

### 3. 数据库检查与初始化

数据库脚本只操作 `public` Schema 中的三张业务表：

- `resumes`：云端简历、所有者、内容及乐观锁版本。
- `shares`：公开分享的快照或预留的自定义短链。
- `export_jobs`：PDF 导出任务及游客风控额度。

```bash
pnpm db:check
```

**仅首次部署或确有必要时**，使用有建表权限的维护身份初始化：

```bash
# 单独在忽略的 .env.database-admin.local 中配置 DATABASE_ADMIN_URL
# 如需切换所有者角色，再设置 DATABASE_ADMIN_ROLE
pnpm db:init
```

`db:init` 不自动迁移已有表结构、不删除已有业务数据，也**不会**在 `build` 或 `start` 时自动运行。建议将应用账号权限限制为业务表增删改查，维护账号与运行时账号分离；上线后的结构变更需要先备份再审核。

### 4. 启动与检查

```bash
pnpm dev
```

默认打开 `http://localhost:3000`。如改用其他端口，记得同步调整 `LOGTO_BASE_URL`。构建检查：

```bash
pnpm typecheck
pnpm build
pnpm start
```

## 🔐 接入 Logto 登录

本仓库已包含登录 / 退出、`/callback` 回调和服务端会话读取代码，但**身份服务本身不随仓库提供**。

1. 在自建或托管的 Logto 控制台创建 **Traditional Web** 应用。
2. 取得 Logto endpoint、App ID 和 App Secret，填入服务器 `.env.local`，同时设置独立的 `LOGTO_COOKIE_SECRET`。
3. 设置 `LOGTO_BASE_URL` 为实际对外 HTTPS 域名（不是 Docker 容器内部地址）。
4. 在 Logto 控制台配置：
   - **Sign-in redirect URI：** `https://jianli.saintmaria.de/callback`
   - **Post sign-out redirect URI：** `https://jianli.saintmaria.de/`
5. 重建应用并依次验证登录、`/api/session` 返回的用户信息、退出、云端保存、分享及游客额度逻辑。

其他域名或本地开发环境，使用对应的 `<站点 origin>/callback` 和 `<站点 origin>/`。

参考：[Logto 官方 Next.js App Router 文档](https://docs.logto.io/quick-starts/next-app-router)。

## 🐳 Docker / 1Panel / ARM64 部署

仓库包含多阶段 [Dockerfile](./Dockerfile) 和 [docker-compose.yml](./docker-compose.yml)：

- 构建阶段使用 Node.js 22 和 pnpm 10。
- 运行阶段基于 Debian Bookworm，并安装系统 Chromium 以支持 ARM64 PDF 导出。
- Compose 默认将容器的 `3000` 映射到宿主机的 `127.0.0.1:3000`，**不会直接绑定公网 IP**。
- Compose 使用外部 Docker 网络 `1panel-network`；部署前需确认该网络存在。
- 可用 1Panel / OpenResty 反向代理到应用端口，并为域名配置 HTTPS。
- 如果宿主机端口已被占用，可将映射的宿主端口调整为 `3001` 等空闲端口，同时同步修改反向代理目标；**容器内部端口仍为 3000**。

首次部署前正确设置服务器上的 `.env.local` 和数据库连接。之后更新当前开发分支：

```bash
cd /opt/resume-builder
git pull --ff-only origin fix/mobile-responsive
docker compose up -d --build --no-deps resume-builder
docker compose ps
```

若使用默认宿主机端口：

```bash
curl -fsS http://127.0.0.1:3000/api/session
```

若在 VPS 上将宿主机端口改为了 `3001`，则改为检查 `http://127.0.0.1:3001/api/session`。

> **不要为了更新前端而重建 PostgreSQL 容器、清空卷、覆盖生产 `.env.local` 或重复运行初始化脚本。** Compose 命令中的 `--no-deps` 用于限制更新范围。

### 反向代理与真实 IP

应用不会默认信任任意客户端提交的 `X-Forwarded-For`。如果使用 Cloudflare + OpenResty，需要先确认代理只信任可信来源，并正确**覆盖**传给应用的真实 IP 请求头，再考虑设置 `TRUSTED_IP_HEADER`。否则游客 IP 风控可能将多个用户识别为同一代理地址，或被伪造请求头影响判断。

## 📄 PDF、备份与分享说明

### A4 预览和 PDF

- 预览和 PDF 使用 `lib/export-html.ts` 中同一份 HTML 模板；PDF 由服务端 Puppeteer 渲染。
- 编辑状态下的**红框、定位提示、上下额外滚动留白**仅用于交互展示，不写入导出 PDF。
- PDF 服务限制页面脚本和外部网络请求；上传并内嵌的图片可导出，仅提供外部图片链接时不能保证导出图片。
- 导出失败不应正常计入游客成功额度；服务端采用事务和过期任务处理防止重复扣次。

### 简历数据格式

默认源文件扩展名为 `.jianli`，**实际是可读的 JSON 文本，不加密、不压缩**。支持导入：

- `.jianli`：当前默认备份格式。
- `.json`：符合本项目简历数据结构的 JSON。
- `.magicyan`：旧版源文件格式，保留兼容。

因此源文件可能包含电话号码、邮箱、头像等个人信息，请自行妥善保管。浏览器历史草稿的本地存储键暂时保持兼容，避免升级后丢失已有草稿。

### 云端保存与分享（需要先启用登录）

- 游客草稿先保存在本地；登录后可选择是否导入，避免直接覆盖已有云端简历。
- 首次保存到云端后，修改可以在防抖后自动同步；版本不一致时保留本地草稿，要求明确处理冲突。
- 已登录用户可管理自己的云端简历及只读公开分享；公开短链的持有者可查看已发布的内容。
- 分享页面配置 `noindex` 与 `no-referrer`；但**公开分享链接不是私密存储**，不要把敏感简历数据发布给不可信对象。

## 🗂️ 项目结构

```text
app/                          Next.js App Router、登录回调、独立预览页
components/
  resume-builder.tsx          编辑器工作区及左右联动
  module-editor.tsx           模块编辑、拖拽和全部收起
  personal-info-editor.tsx    个人信息、头像裁剪
  html-resume-preview.tsx     A4 iframe、字段高亮、位置跟随
  responsive-resume-preview.tsx  移动端 A4 预览
  cloud-resume-controls.tsx   登录后的云端简历与分享操作
lib/
  export-html.ts              预览 / PDF 共用 HTML 模板
  server/                     认证、数据库、游客风控、云端简历
pages/api/                    会话、简历与 PDF 接口
db/schema.sql                 PostgreSQL 业务表结构
scripts/database.mjs          数据库检查 / 首次初始化
public/demo.jianli            虚构示例简历
Dockerfile                    Node 22 + Chromium 镜像
docker-compose.yml            1Panel 网络与应用容器配置
```

## 📌 接下来要做

- [ ] **生产登录接入：** 配置 Logto 服务、Traditional Web 应用、回调地址及 Cookie 密钥，并完成登录 / 退出实测。
- [ ] **账号与云端功能验收：** 验证游客草稿迁移、自动保存、版本冲突、云端简历列表、分享链接和权限隔离。
- [ ] **代理安全核对：** 确认 Cloudflare / OpenResty 的 HTTPS、转发头及真实 IP 信任边界。
- [ ] **发布与维护：** 完善数据库及应用配置备份、恢复验证和监控；将已稳定功能合并到 Fork 自己的 `main`。
- [ ] **跨端体验验收：** 在实际手机与桌面浏览器中继续检查复杂富文本、预览滚动及较长简历的导出效果。

本列表是后续工作计划，不能当作已经交付或经过线上验证的功能承诺。

## 🙏 致谢

- **[magicyan418/resume-builder](https://github.com/magicyan418/resume-builder)**：感谢原作者 [@magicyan418](https://github.com/magicyan418) 及原项目贡献者提供最初的简历生成器、设计思路和开源基础。本仓库保留 Fork 关系，并在其基础上持续改进。
- **开源生态与社区：** 感谢 Next.js、React、Tailwind CSS、Radix UI、Logto、Puppeteer、Chromium、PostgreSQL 及相关项目的维护者。具体依赖与版本以 [package.json](./package.json) 为准。
- **反馈与测试：** 感谢使用者提出编辑体验、移动端交互和导出流程中的实际问题，帮助持续完善本定制版。

欢迎通过 [Issues](https://github.com/ericcartmanfatass/resume-builder/issues) 反馈本 Fork 的问题；如果修改对原项目也适用，欢迎按上游项目的贡献流程提交独立 Pull Request。

## ⚖️ 开源许可

本 Fork 基于原项目，继续遵循 **GNU Affero General Public License v3.0（AGPL-3.0）**，详见 [LICENSE](./LICENSE)。

本仓库在原项目基础上进行了修改（主要更新日期：**2026-11-05 至 2026-11-06**），包括移动端交互、简历示例与源文件格式、A4 预览联动、字段高亮、模块操作以及 ARM64 部署适配。原有版权和许可证声明应予以保留；部署为网络服务时也需遵守 AGPL-3.0 的相关要求。
