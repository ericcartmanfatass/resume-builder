-- 新环境初始化：仅创建缺失的业务表和索引、补充注释，不记录迁移版本。
-- 不会自动修改已有字段；后续结构变更需人工审核后执行对应 ALTER SQL。

CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  data jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resumes_owner_updated ON public.resumes(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.shares (
  token text PRIMARY KEY,
  resume_id uuid NOT NULL UNIQUE REFERENCES public.resumes(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.export_jobs (
  id uuid PRIMARY KEY,
  actor_key text NOT NULL,
  guest_id uuid,
  fingerprint_hash text,
  ip_hash text,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes'
);
CREATE INDEX IF NOT EXISTS export_jobs_actor ON public.export_jobs(actor_key, created_at);
CREATE INDEX IF NOT EXISTS export_jobs_fingerprint ON public.export_jobs(fingerprint_hash) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS export_jobs_ip ON public.export_jobs(ip_hash, created_at) WHERE guest_id IS NOT NULL;

COMMENT ON TABLE public.resumes IS '用户云端简历；按 Logto 用户标识隔离，保存当前编辑内容，使用版本号避免并发覆盖。';
COMMENT ON COLUMN public.resumes.id IS '简历唯一标识，由应用生成的 UUID；供编辑、在线预览和分享关联使用。';
COMMENT ON COLUMN public.resumes.owner_id IS '所属用户的 Logto sub 标识；由服务端登录会话获取，不是用户名，也不直接关联 Logto 数据库外键。';
COMMENT ON COLUMN public.resumes.data IS '当前简历内容（JSON）：标题、个人信息、头像、模块及文档内时间等；不等同于已发布的分享快照。';
COMMENT ON COLUMN public.resumes.version IS '乐观锁版本号，从 1 开始；更新时校验旧版本并递增，防止多标签页或多设备覆盖修改。';
COMMENT ON COLUMN public.resumes.created_at IS '云端记录创建时间，数据库默认生成的带时区时间；与 JSON 内文档创建时间相互独立。';
COMMENT ON COLUMN public.resumes.updated_at IS '云端记录最近保存时间，由应用更新时写入数据库当前时间，用于列表排序和同步提示。';

COMMENT ON TABLE public.shares IS '已发布的只读简历分享；每份简历最多一个有效链接，内容为手动发布的快照，撤销分享时删除记录。';
COMMENT ON COLUMN public.shares.token IS '分享链接标识：24 字节随机数的 Base64URL 编码（32 字符）；用于 /s/:token，持有链接即可访问已发布内容。';
COMMENT ON COLUMN public.shares.resume_id IS '关联的云端简历 UUID，唯一且外键指向 resumes.id；删除简历时级联删除分享记录。';
COMMENT ON COLUMN public.shares.snapshot IS '最近一次发布的完整简历 JSON 快照；编辑草稿不会自动更新，需用户再次发布。';
COMMENT ON COLUMN public.shares.updated_at IS '分享首次发布或最近一次更新快照的时间；更新内容保留链接，撤销后重新发布会生成新链接。';

COMMENT ON TABLE public.export_jobs IS 'PDF 导出任务与额度记录；用于游客累计两次限制、指纹/IP 风控和各身份的并发及频率限制，不存储 PDF 文件。';
COMMENT ON COLUMN public.export_jobs.id IS '导出任务唯一 UUID，由应用生成；用于确认导出成功或标记失败。';
COMMENT ON COLUMN public.export_jobs.actor_key IS '导出身份键：正式用户为 user:<Logto sub>，游客为 guest:<游客 UUID>；用于身份维度的计次和并发控制。';
COMMENT ON COLUMN public.export_jobs.guest_id IS '游客身份 UUID，来自服务端验签通过的 HttpOnly Cookie；正式用户导出时为空，不是硬件机器码。';
COMMENT ON COLUMN public.export_jobs.fingerprint_hash IS '游客浏览器指纹摘要经服务端带密钥哈希后的值；用于关联同指纹的额度，不保存原始指纹，正式用户导出时为空。';
COMMENT ON COLUMN public.export_jobs.ip_hash IS '请求来源 IP 经服务端带密钥哈希后的值；用于最近 24 小时的游客风控，不保存明文 IP，正式用户导出时为空。';
COMMENT ON COLUMN public.export_jobs.status IS '任务状态：pending=预占额度并生成中，completed=生成成功并确认扣次，failed=失败并释放预占；过期 pending 也不占额度。';
COMMENT ON COLUMN public.export_jobs.created_at IS '导出任务创建时间，数据库默认生成；用于最近一分钟频率限制及最近 24 小时 IP 风控。';
COMMENT ON COLUMN public.export_jobs.expires_at IS 'pending 预占有效期，默认创建后 5 分钟；超时不能确认成功且不占额度，不表示 completed 记录或已扣次数到期。';
