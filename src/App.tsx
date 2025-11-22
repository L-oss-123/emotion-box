import { NavLink, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { UploadPage } from '@/pages/UploadPage';
import { CardDetailPage } from '@/pages/CardDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/providers/AuthProvider';
import { AboutPage } from '@/pages/AboutPage';
import { EditCardPage } from '@/pages/EditCardPage';
import { AuthConfirmPage } from '@/pages/AuthConfirmPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';

const navLinks = [
  { to: '/', label: '纪念库' },
  { to: '/upload', label: '创建' },
  { to: '/about', label: '关于' }
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  
  // 如果是认证相关页面，不渲染导航栏，直接返回内容
  const isAuthPage =
    location.pathname.startsWith('/auth/confirm') ||
    location.pathname.startsWith('/auth/callback');
  
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <nav className="mb-8 flex items-center justify-between rounded-[28px] border border-ink-100 bg-white/70 px-6 py-4 shadow-md backdrop-blur">
          <div className="flex items-center gap-2 text-lg font-semibold text-ink-800">
            <span>🖤</span> Emotion Box
          </div>

          <div className="flex items-center gap-3 text-sm">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 font-medium ${
                    isActive ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm text-ink-500">
            {profile ? (
              <>
                <span>{profile.display_name ?? '未命名用户'}</span>
                <button onClick={signOut} className="text-ink-400 underline">
                  退出
                </button>
              </>
            ) : (
              <span className="text-ink-400">未登录</span>
            )}
          </div>
        </nav>

        {children}
      </div>
    </div>
  );
};

// 🔥 专门给 AuthGate 用的布局（使用 Outlet）
const AuthenticatedLayout = () => {
  return (
    <AuthGate>
      <Outlet />
    </AuthGate>
  );
};

const App = () => {
  return (
    <AppLayout>
      <Routes>
        {/* =============================== */}
        {/* 不需要登录的路由（AuthGate 外） */}
        {/* =============================== */}
        <Route path="/auth/confirm" element={<AuthConfirmPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* =============================== */}
        {/* 需要登录的路由（包裹在 AuthGate 中） */}
        {/* 使用 React Router v6 正确写法  */}
        {/* =============================== */}
        <Route element={<AuthenticatedLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/card/:id" element={<CardDetailPage />} />
          <Route path="/card/:id/edit" element={<EditCardPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
};

export default App;