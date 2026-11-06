# Resume Builder

一个基于 Next.js 的在线简历编辑与导出工具，支持模块化编辑、Markdown / 富文本双模式内容输入，以及基于 Puppeteer 的页面转 PDF 导出。

## 功能

- 模块化简历编辑，支持拖拽排序
- 个人信息、头像、模块内容的可视化维护
- 模块内容支持 `Markdown` 和 `富文本` 两种模式切换
- 预览与导出共用同一份 HTML 模板，降低样式漂移
- 使用 `puppeteer-core + @sparticuz/chromium` 生成 PDF，适配 Vercel 部署
- 导出 `.jianli` 简历源文件；导入兼容 `.jianli`、`.json` 和旧版 `.magicyan`
- Logto 登录 / 退出，正式用户和游客分流
- 正式用户云端简历管理、自动保存、版本冲突保护和只读在线预览
- 发布 / 更新 / 关闭简历分享，分享开启后内容与云端保存版本同步
- 游客成功导出 PDF 限 2 次，正式用户不限总次数

## 技术栈

- Next.js 15
- React 19
- Tailwind CSS 4
- shadcn/ui
- Iconify
- Puppeteer Core
- @sparticuz/chromium
- @uiw/react-md-editor

## 本地开发

需要 Node.js 22、PostgreSQL，以及 Logto 的 Traditional Web 应用。

安装依赖：

```bash
pnpm install
```

将 `.env.example` 复制为 `.env.local`，填写 Logto 和数据库配置，再初始化数据库：

```bash
pnpm db:check
pnpm db:init
```

初始化读取 `db/schema.sql`，在当前数据库的 `public` 中创建缺失的 3 张业务表、索引并补充中文注释；不维护版本记录表。需要使用具有建表权限的维护连接。重复执行不会删除业务数据，但不会自动调整已有字段；后续字段变更需人工审核并执行相应 SQL。

启动开发环境：

```bash
pnpm dev
```

默认访问地址：

```text
http://localhost:3000
```

如果 3000 端口已占用，可以执行 `pnpm dev --port 3001`，同时将 `.env.local` 中的 `LOGTO_BASE_URL` 设为 `http://localhost:3001`。运行端口与该地址必须一致。

生产构建：

```bash
pnpm build
pnpm start
```

## 登录与部署配置

所有密钥和数据库 URL 仅在服务端读取，禁止使用 `NEXT_PUBLIC_` 前缀；`.env.local` 已被 Git 忽略。

| 环境变量 | 用途 |
| --- | --- |
| `LOGTO_ENDPOINT` | Logto 服务的基础地址 |
| `LOGTO_APP_ID` / `LOGTO_APP_SECRET` | Traditional Web 应用凭据 |
| `LOGTO_BASE_URL` | 当前部署的完整站点 origin，包括本地端口 |
| `LOGTO_COOKIE_SECRET` | 至少 32 字符的随机会话加密密钥 |
| `GUEST_COOKIE_SECRET` | 独立的至少 32 字符随机密钥，用于 Cookie 签名和风控哈希 |
| `DATABASE_URL` | PostgreSQL 连接字符串，密码中的特殊字符需 URL 编码 |
| `DATABASE_SSL` | `disable` 或 `require`；后者验证服务器证书 |
| `TRUSTED_IP_HEADER` | 自建可信反向代理覆盖写入的 IP 请求头，如 `x-real-ip` |
| `GUEST_IP_DAILY_LIMIT` | 同 IP 24 小时内游客导出风控阈值，默认 10 |
| `GUEST_IP_DAILY_IDENTITIES` | 同 IP 24 小时内游客身份数阈值，默认 5 |

在 Logto 控制台保存：

- 登录回调：`${LOGTO_BASE_URL}/callback`
- 退出后跳转：`${LOGTO_BASE_URL}/`

例如本地使用 3001 时分别填 `http://localhost:3001/callback`、`http://localhost:3001/`。生产环境添加真实 HTTPS 域名的对应地址，并在部署平台设置相同环境变量；HTTPS 站点的会话 Cookie 自动启用 Secure。

Vercel 自动使用平台的 `x-vercel-forwarded-for`。自建反向代理需要覆盖而非透传用户提供的 IP 头，并限制绕过代理直接访问应用，然后设置 `TRUSTED_IP_HEADER`。未配置时使用 TCP 连接来源 IP，不信任任意 `X-Forwarded-For`。

登录使用 App Router Server Actions 和 `/callback`；数据接口继续使用 Pages API，通过相同的 Logto 配置读取加密会话。前端只收到必要的用户标识和显示名称，不接触令牌。

参考：[Logto 官方 Next.js App Router 接入文档](https://docs.logto.io/quick-starts/next-app-router)。

## 简历与分享行为

- 编辑器只保留一行顶部工具栏；点击右侧用户图标打开“个人中心”，集中查看账号权益、管理云端简历、保存与分享、导入游客草稿及退出登录。窄屏下工具按钮横向滚动，个人中心入口固定保留。
- 游客草稿保存在本地；登录后可以在个人中心明确选择导入游客草稿，避免覆盖账号内容。
- 账号的本地草稿按 Logto `sub` 隔离。首次点击“保存到云端”后，当前简历的修改会在 1 秒防抖后自动保存。
- 刷新后恢复本地草稿及其云端版本关联。数据与版本号在一个本地存储条目中写入，防止多标签页混用内容与文档 ID。
- 云端使用乐观锁。版本冲突时暂停同步并保留本地草稿，可以下载文件、另存副本或明确重新打开云端版本。网络错误可通过“保存云端”重试。
- “云端简历”可以打开、另存、删除和在线预览；当前列表展示最近 200 份。删除简历同时使其分享链接失效。
- `/resumes/:id` 仅允许作者访问；`/s/:token` 是无需登录的只读分享。所有私有 API 都从服务端会话获取用户 ID，不接受前端指定所有者。
- 分享默认使用随机 192-bit 标识，也支持唯一的自定义短链。分享开启后，每次云端保存都会同步公开内容；随机链接关闭后重新发布会生成新链接，自定义链接则会保留并复用。
- 分享页面不被缓存或搜索引擎索引，不把链接通过 Referer 传给外部站点；链接接收者仍可自行保存已看到的内容。
- 预览免费且不计次。分享页导出按访问者的身份计次，服务端重新读取有效分享，不借用作者额度。

## 游客导出额度与风控

首次获取会话时发放 `resume_guest_id`：UUID + HMAC 签名，HttpOnly / SameSite=Lax，最长保存一年。点击导出时将浏览器环境与画布特征的摘要作为辅助风险信号，服务端再次用密钥哈希后存储；IP 同样只存带密钥的哈希。没有第三方指纹服务。

单个游客 / 相同浏览器指纹累计允许成功生成 2 份 PDF。IP 阈值用于要求登录，不简单地将共享网络里的所有人合并成一个“两次额度”。Cookie 可被清理，指纹和 IP 也会变化或被伪造，因此这是风控方案，不等同于可靠的硬件机器码。

导出通过数据库事务和 advisory lock 预占额度，同一指纹或 IP 的并发申请会串行校验。生成成功后确认扣次，失败释放预占；崩溃残留的预占在 5 分钟后失效。数据库不可用时不会放行未核验的导出。正式用户不限累计次数，但每个身份同时只允许一个导出任务，每分钟最多发起 10 次，避免重复点击占满渲染服务。

数据库只有 3 张业务表，均位于 `public`：`resumes` 存账号归属、JSON 内容与版本；`shares` 存发布快照；`export_jobs` 存导出状态、身份及风控哈希。

## 独立数据库与维护权限

简历业务使用 `resume_builder` 数据库的 `public` Schema，不再保留同名自定义 Schema 或数据库迁移记录表。按当前选择，开发与线上共用这个数据库；不直接读写原有 `magicyan418` 业务库或 Logto 数据库。

- `.env.local` 的 `DATABASE_URL` 使用 `resume_builder_app`，只授予业务表查询、插入、更新和删除权限，不允许建表、建库或管理账号。
- 数据库及业务表归不允许登录的 `resume_builder_owner` 所有。
- DDL 维护凭据独立放在被 Git 忽略的 `.env.database-admin.local`，设置 `DATABASE_ADMIN_URL` 指向同一数据库，`DATABASE_ADMIN_ROLE=resume_builder_owner`。Next.js 不会自动加载此文件；不要把管理员凭据放进运行时环境或客户端。
- `pnpm db:check` 检查应用账号实际连接；`pnpm db:init` 才读取维护凭据并切换至所有者角色初始化。它不会追踪、执行增量迁移或自动回滚结构变更。
- 应用固定查询 `public`，不再使用 `DB_SCHEMA`。线上需要部署本次代码更新，不能继续运行查询旧 Schema 的版本；修改本地文件不会自动部署线上。

共用数据库意味着开发时的数据写入和结构变更也会影响线上。修改字段前需备份并确认旧、新代码兼容；删除或重命名字段必须协调发布时机。`db:init` 不会由 `dev`、`build` 或 `start` 自动触发。

## 类型检查与构建

```bash
pnpm typecheck
pnpm build
```

## PDF 导出说明

项目当前不再使用 `react-pdf`。

PDF 导出流程为：

1. 将当前简历数据渲染为统一的 HTML 模板
2. 调用 `/api/export/pdf`
3. 在服务端使用 Puppeteer 打开 HTML 并导出 A4 PDF

在 Vercel 环境下，导出依赖：

- `puppeteer-core`
- `@sparticuz/chromium`

本地开发环境下需要系统中存在可用的 Chrome / Chromium。

PDF 渲染器关闭页面脚本和外部网络请求，防止简历中的外链访问服务器内网。上传的内嵌图片正常导出；仅填写外链图片 URL 的图片不会被 PDF 服务加载，需要上传图片使其内嵌。浏览器预览可能仍显示外链图片。

## 数据格式

简历源文件默认导出为 `.jianli`，**内部仍然是明文 JSON，不加密、不压缩**。导入同时支持以下后缀：

- `.jianli`：当前项目默认导出和备份格式
- `.json`：内容符合本项目简历源文件结构的标准 JSON 文本；任意 JSON 不保证能导入
- `.magicyan`：原项目历史格式，继续支持导入旧备份

导入会校验顶层 `version` 和 `data`，以及 `data.personalInfo`、`data.modules` 的基本结构，不能仅凭改后缀把任意文件变成简历。历史导出文件的 JSON 结构保持兼容；浏览器中的历史草稿存储键暂不修改，以免现有草稿丢失。

示例结构：

```ts
interface ResumeSourceFile {
  version: string
  data: ResumeData
  metadata: {
    exportedAt: string
    appVersion: string
  }
}

interface ResumeData {
  title: string
  personalInfo: PersonalInfoItem[]
  modules: ResumeModule[]
  avatar?: string
  createdAt: string
  updatedAt: string
}
```

## 项目结构

```text
app/
  globals.css
  layout.tsx
  page.tsx
  pdf-preview/page.tsx

components/
  html-resume-preview.tsx
  module-editor.tsx
  pdf-export-button.tsx
  personal-info-editor.tsx
  resume-builder.tsx
  rich-text-editor.tsx
  ui/

lib/
  export-html.ts
  markdown.ts
  pdf-client.ts
  resume-content.ts
  resume-utils.ts

pages/
  api/export/pdf.ts

public/
  demo.jianli

types/
  resume.ts
```

## 开源协议

本项目基于 `GNU Affero General Public License v3.0` 开源，详见 [LICENSE](./LICENSE)。

修改说明（2026-11-06）：在本分支中将简历源文件默认后缀调整为 `.jianli`，新增 `.json` 导入支持，并保留原 `.magicyan` 导入兼容性；许可证与原项目版权信息保持不变。
