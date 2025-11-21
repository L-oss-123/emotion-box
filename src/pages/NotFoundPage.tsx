import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="flex flex-col items-center gap-4 rounded-[32px] border border-dashed border-ink-200 p-10 text-center">
    <span className="text-6xl font-semibold text-ink-200">404</span>
    <p className="text-ink-500">页面走丢啦，试试返回首页。</p>
    <Link className="rounded-2xl bg-ink-800 px-4 py-2 text-white" to="/">
      回到首页
    </Link>
  </div>
);

