export const AboutPage = () => {
  const milestones = [
    { label: '已保存情绪片段', value: '1,000+', detail: '涵盖影像 / 声音 / 文本' },
    { label: '平均回访率', value: '82%', detail: '用户每周回访查看过往记忆' },
    { label: '素材安全', value: '100%', detail: '基于 Supabase RLS 与 Storage' }
  ];

  const steps = [
    '注册并完成邮箱一次性登录，系统自动生成个人档案。',
    '创建纪念卡片，可选择是否公开、置顶，支持上传图片 / 音频 / 视频。',
    '通过标签筛选、全文搜索快速定位情绪片段，私密卡片仅自己可见。',
    '后续可扩展收藏、点赞、分享等互动能力。'
  ];

  return (
    <section className="space-y-8 rounded-[32px] bg-white/70 p-10 shadow-2xl">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-ink-400">ABOUT EMOTION BOX</p>
        <h1 className="text-4xl font-semibold text-ink-900">让情绪有处安放</h1>
        <p className="max-w-2xl text-ink-500">
          Emotion Box 旨在构建一个温柔、可持续的数字纪念空间。我们使用 Supabase 提供的 Auth
          + Database + Storage 服务来保障数据安全，并以 React + Tailwind 打造沉浸式的三页体验
          （主页 / 上传 / 详情）以及项目说明页。
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {milestones.map((item) => (
          <article
            key={item.label}
            className="rounded-[24px] border border-ink-100 bg-gradient-to-b from-white to-ink-50 p-6 text-center shadow-lg"
          >
            <p className="text-sm uppercase text-ink-400">{item.label}</p>
            <p className="mt-3 text-4xl font-semibold text-ink-900">{item.value}</p>
            <p className="mt-2 text-sm text-ink-500">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-10 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-ink-900">工作原理</h2>
          <ul className="space-y-3 text-ink-600">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="mt-1 h-7 w-7 rounded-full bg-ink-900/90 text-center text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="leading-relaxed">{step}</p>
              </li>
            ))}
          </ul>
        </div>
        <aside className="space-y-3 rounded-[24px] bg-ink-900/90 p-6 text-white">
          <h3 className="text-xl font-semibold">技术栈速览</h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li>React + Vite + TypeScript + Tailwind</li>
            <li>Supabase Auth / PostgreSQL / Storage</li>
            <li>Netlify 一键部署，`/_redirects` 处理 SPA 路由</li>
            <li>RLS 策略保障私密与权限</li>
          </ul>
        </aside>
      </section>
    </section>
  );
};

