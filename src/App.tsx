import { NavLink, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { UploadPage } from '@/pages/UploadPage';
import { CardDetailPage } from '@/pages/CardDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/providers/AuthProvider';
import { AboutPage } from '@/pages/AboutPage';
import { EditCardPage } from '@/pages/EditCardPage';

const navLinks = [
  { to: '/', label: '纪念库' },
  { to: '/upload', label: '创建' },
  { to: '/about', label: '关于' }
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, signOut } = useAuth();
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

const App = () => {
  return (
    <AppLayout>
      <AuthGate>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/card/:id" element={<CardDetailPage />} />
          <Route path="/card/:id/edit" element={<EditCardPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthGate>
    </AppLayout>
  );
};

export default App;

