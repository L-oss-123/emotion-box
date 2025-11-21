import { FormEvent, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const { session, loading, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送登录链接失败');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-600">
        正在加载会话...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-xl">
        <h2 className="mb-2 text-2xl font-semibold text-ink-800">欢迎来到情绪黑匣子</h2>
        <p className="mb-6 text-ink-500">输入学校邮箱，获取一次性登录链接。</p>
        {sent ? (
          <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-600">
            登录链接已发送，请查收邮箱。
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-ink-600">
              邮箱
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-ink-200 bg-white/60 p-3 shadow-inner focus:border-ink-500 focus:outline-none"
                placeholder="you@example.com"
              />
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-2xl bg-ink-700 px-4 py-3 text-white shadow-lg transition hover:bg-ink-600"
            >
              发送登录链接
            </button>
          </form>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

