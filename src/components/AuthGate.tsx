import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const location = useLocation();
  const { session, loading, sendOtp, verifyOtp, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  
  // 允许确认页面和回调页面在未登录状态下访问
  // 使用 startsWith 确保所有认证相关路径都被正确识别（包括查询参数、hash 等）
  const isAuthPage =
    location.pathname.startsWith('/auth/confirm') ||
    location.pathname.startsWith('/auth/callback');

  // 当 authError 改变时，更新本地 error 状态
  useEffect(() => {
    if (authError) {
      setError(authError);
      // 如果错误是验证码过期，重置 otpSent 状态，允许用户重新发送
      if (authError.includes('过期')) {
        setOtpSent(false);
      }
    }
  }, [authError]);

  // 当发送验证码后，开始轮询检查登录状态
  // 也监听自定义事件和 BroadcastChannel，以便快速响应跨设备登录
  useEffect(() => {
    // 如果已登录，清除轮询
    if (session) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // 如果未发送验证码，也清除轮询
    if (!otpSent) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // 创建 BroadcastChannel 用于跨标签页通信
    if (!broadcastChannelRef.current) {
      broadcastChannelRef.current = new BroadcastChannel('auth-sync');
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data === 'auth-state-changed') {
          // 当收到消息时，立即检查登录状态
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
              // 登录成功，清除轮询
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          });
        }
      };
    }

    // 开始轮询检查登录状态（每1秒检查一次，快速响应跨设备登录）
    // 注意：Supabase 的 session 存储在 localStorage 中
    // 当用户在手机端完成登录后，如果电脑端和手机端使用相同的浏览器账户同步（如 Chrome Sync），
    // session 可能会同步。我们通过轮询来检测。
    // 如果使用不同的浏览器或设备，session 不会自动同步，但用户可以在电脑端重新打开应用，
    // 此时 Supabase 会从服务器获取最新的 session。
    console.log('AuthGate: Starting polling for session...');
    pollingIntervalRef.current = window.setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        console.log('AuthGate: Session detected via polling!', data.session);
        // 登录成功，清除轮询
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 1000);

    // 监听 localStorage 变化（Supabase 会将 session 存储在 localStorage 中）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('supabase.auth.token') || e.key === 'auth-confirmed') {
        console.log('AuthGate: Storage change detected', e.key);
        // 通知其他标签页
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage('auth-state-changed');
        }
        // 立即检查登录状态
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            console.log('AuthGate: Session detected via storage event!', data.session);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        });
      }
    };

    // 监听自定义事件（从 callback 页面触发）
    const handleCustomAuthEvent = async (e: CustomEvent) => {
      console.log('AuthGate: Custom auth event received', e.detail);
      // 立即检查登录状态
      const { data } = await supabase.auth.getSession();
      if (data.session && pollingIntervalRef.current) {
        console.log('AuthGate: Session detected via custom event!', data.session);
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-state-changed', handleCustomAuthEvent as EventListener);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleCustomAuthEvent as EventListener);
    };
  }, [otpSent, session]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    clearAuthError();
    try {
      await sendOtp(email);
      setOtpSent(true);
      setOtpToken(''); // 清空之前的验证码输入
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    clearAuthError();
    
    // 验证输入格式（6位数字）
    if (!/^\d{6}$/.test(otpToken)) {
      setError('请输入6位数字验证码');
      return;
    }

    setVerifying(true);
    try {
      await verifyOtp(email, otpToken);
      // 验证成功后，session 会自动更新，不需要手动处理
      // 可以清空状态，等待 session 更新
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码错误');
      setOtpToken(''); // 验证失败时清空输入，让用户重新输入
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-600">
        正在加载会话...
      </div>
    );
  }

  // 如果是认证相关页面（确认页面或回调页面），允许访问（即使未登录）
  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-xl">
        <h2 className="mb-2 text-2xl font-semibold text-ink-800">欢迎来到情绪黑匣子</h2>
        {!otpSent ? (
          <>
            <p className="mb-6 text-ink-500">输入邮箱地址，获取6位数字验证码。</p>
            <form className="space-y-4" onSubmit={handleSendOtp}>
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
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-600 font-medium">⚠️ {error}</p>
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-2xl bg-ink-700 px-4 py-3 text-white shadow-lg transition hover:bg-ink-600"
              >
                发送验证码
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-600">
              ✅ 验证码已发送到 <strong>{email}</strong>
              <br />
              <span className="text-xs text-ink-500 mt-2 block">
                请查收邮箱，输入6位数字验证码（有效期10分钟）
              </span>
            </p>
            <form className="space-y-4" onSubmit={handleVerifyOtp}>
              <label className="block text-sm font-medium text-ink-600">
                验证码
                <input
                  type="text"
                  required
                  value={otpToken}
                  onChange={(e) => {
                    // 只允许输入数字，最多6位
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpToken(value);
                  }}
                  className="mt-2 w-full rounded-2xl border border-ink-200 bg-white/60 p-3 text-center text-2xl font-mono tracking-widest shadow-inner focus:border-ink-500 focus:outline-none"
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </label>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-600 font-medium">⚠️ {error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpToken('');
                    setError(null);
                    clearAuthError();
                  }}
                  className="flex-1 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-600 transition hover:bg-ink-50"
                  disabled={verifying}
                >
                  重新发送
                </button>
                <button
                  type="submit"
                  disabled={verifying || otpToken.length !== 6}
                  className="flex-1 rounded-2xl bg-ink-700 px-4 py-3 text-white shadow-lg transition hover:bg-ink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? '验证中...' : '确认登录'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

