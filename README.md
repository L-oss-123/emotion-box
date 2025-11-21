# Emotion Box · 个人数字纪念馆

情绪黑匣子是一款基于 **Supabase + React + Vite + Tailwind CSS** 的数字纪念馆，支持用户创建带有文字、媒体与标签的纪念卡片，提供瀑布流浏览、卡片详情以及私密/置顶等能力。

## 本地开发

```bash
pnpm install # 或 npm install
cp .env.example .env # 填入 Supabase 项目配置
npm run dev
```

需要在 `.env` 中设置：

```
VITE_SUPABASE_URL=https://hxpotakslxysmkzlosnz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_BUCKET=memory-media
```

## Supabase 表结构

`supabase/` 目录内提供可直接复制到 SQL Editor 的脚本：

- `schema.sql`：建表、索引、触发器与 RLS 策略
- `storage-policies.sql`：创建 `memory-media` bucket 与 Storage 策略
- `seed.sql`：示例 Tag / Card 数据（记得替换 `{{AUTH_USER_ID}}`）

核心表结构：

| 表名 | 说明 |
| --- | --- |
| `profiles` | 存储用户资料，和 Supabase `auth.users` 建立 1:1 映射 |
| `memory_cards` | 主体内容，记录文字/媒体/私密标记等 |
| `tags` + `memory_card_tags` | 多对多标签体系 |
| `favorites` | 可选收藏表，便于后续扩展 |

`memory_cards` 启用了 RLS，保证“公开可读/私密仅本人”的访问规则，更新删除仅限作者自己。

## 主要能力

- 首页瀑布流浏览 + 标签/关键字过滤
- 卡片详情页（支持图片/音视频展示），作者可直接编辑 / 删除
- 创建 / 编辑页：支持媒体上传、标签管理、私密/置顶
- Supabase Auth 邮件登录（OTP）
- Tailwind + glassmorphism UI

## 部署

1. Netlify 站点连接本仓库，Build command: `npm run build`，Publish: `dist`
2. 在 Netlify 控制台配置环境变量（与 `.env` 一致），并确保 `public/_redirects` 生效，SPA 路由才可刷新
3. Supabase SQL Editor 依次执行 `schema.sql`、`storage-policies.sql`、`seed.sql`（替换示例 UID）
4. Supabase Storage 手动检查 bucket 公共读取是否开启

## 进阶扩展建议

- 收藏/点赞/分享按纽
- 时间线/图谱视图
- 自动生成情绪分析报告
- 支持多媒体字幕与无障碍朗读

