import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // 注意：这个 useEffect 只在非 callback 页面时处理 code
  // callback 页面有自己的处理逻辑
  useEffect(() => {
    const url = new URL(window.location.href);
    const isCallbackPage = url.pathname === '/auth/callback';
    
    // 如果是 callback 页面，不在这里处理，让 callback 页面自己处理
    if (isCallbackPage) {
      return;
    }

    const hasCode = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorCode = url.searchParams.get('error_code');
    const errorDescription = url.searchParams.get('error_description');

    // 处理错误情况
    if (error) {
      let errorMessage = '登录失败';
      if (errorCode === 'otp_expired') {
        errorMessage = '登录链接已过期，请重新发送登录链接';
      } else if (errorDescription) {
        errorMessage = decodeURIComponent(errorDescription);
      } else if (error === 'access_denied') {
        errorMessage = '访问被拒绝，请重试';
      }
      setAuthError(errorMessage);

      // 清理 URL 中的错误参数
      url.searchParams.delete('error');
      url.searchParams.delete('error_code');
      url.searchParams.delete('error_description');
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, document.title, url.pathname + url.search);
      return;
    }

    if (!hasCode) return;

    // 对于非 callback 页面的 code 处理（例如直接访问主页面带 code 参数）
    console.log('AuthProvider: Processing code in non-callback page');
    supabase.auth.exchangeCodeForSession(window.location.href).then(({ data, error }) => {
      if (error) {
        console.error('Exchange code for session failed', error);
        setAuthError('登录失败：' + error.message);
        return;
      }

      console.log('AuthProvider: Code exchange successful', data);
      setAuthError(null);
      // 清理认证相关的 URL 参数，保留原始路径和其他查询参数
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      // 构建清理后的 URL，保留路径和剩余的查询参数
      const cleanUrl = url.pathname + (url.search ? url.search : '');
      window.history.replaceState({}, document.title, cleanUrl);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // 当登录状态改变时，通知其他标签页
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('auth-sync');
        channel.postMessage('auth-state-changed');
        channel.close();
      }
    });

    // 监听 BroadcastChannel 消息（跨标签页通信）
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('auth-sync');
      broadcastChannel.onmessage = async () => {
        // 当收到消息时，重新获取 session
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data.session);
        }
      };
    }

    // 监听 localStorage 变化（同设备不同标签页同步）
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key?.includes('supabase.auth.token')) {
        console.log('AuthProvider: Storage change detected (token)', e.key);
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          console.log('AuthProvider: Session updated from storage', data.session);
          setSession(data.session);
        }
      }
      // 监听自定义的 auth-confirmed 事件（从确认页面或回调页面触发）
      if (e.key === 'auth-confirmed' || e.key?.includes('auth-confirmed')) {
        console.log('AuthProvider: Storage change detected (auth-confirmed)', e.key);
        // 重新获取 session，确认页面可能已经完成了登录
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          console.log('AuthProvider: Session updated from auth-confirmed', data.session);
          setSession(data.session);
        }
      }
    };

    // 监听自定义事件（从 callback 页面触发）
    const handleCustomAuthEvent = async (e: CustomEvent) => {
      console.log('AuthProvider: Custom auth event received', e.detail);
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        console.log('AuthProvider: Session updated from custom event', data.session);
        setSession(data.session);
      }
    };

    window.addEventListener('auth-state-changed', handleCustomAuthEvent as EventListener);

    window.addEventListener('storage', handleStorageChange);

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleCustomAuthEvent as EventListener);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      setProfile(null);
      return () => {
        active = false;
      };
    }

    const syncProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('auth_uid', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Fetch profile failed', error);
        return;
      }

      if (!data) {
        const fallbackDisplayName = session.user.user_metadata?.full_name ?? session.user.email ?? '未命名用户';
        const fallbackUsername = session.user.email?.split('@')[0] ?? session.user.id.slice(0, 8);
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert({
            auth_uid: session.user.id,
            display_name: fallbackDisplayName,
            username: fallbackUsername
          })
          .select('id, username, display_name, avatar_url')
          .single();
        if (createError) {
          console.error('Create profile failed', createError);
          return;
        }
        if (active) setProfile(created);
        return;
      }

      if (active) setProfile(data);
    };

    syncProfile();

    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      authError,
      async sendOtp(email: string) {
        setAuthError(null);
        // 发送 6 位数字验证码到邮箱
        // 重要：明确不设置 emailRedirectTo，确保发送验证码而不是魔法链接
        // 如果设置了 emailRedirectTo，Supabase 会发送魔法链接
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            // 明确不设置 emailRedirectTo，强制发送验证码
            // 如果这里设置了任何 URL，Supabase 会发送魔法链接
          }
        });
        if (error) {
          console.error('OTP send error:', error);
          setAuthError('发送验证码失败：' + error.message);
          throw error;
        }
      },
      async verifyOtp(email: string, token: string) {
        setAuthError(null);
        // 验证用户输入的 6 位数字验证码
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email'
        });
        if (error) {
          console.error('OTP verify error:', error);
          setAuthError('验证码错误：' + error.message);
          throw error;
        }
        // 验证成功后，session 会自动更新（通过 onAuthStateChange 监听）
        console.log('OTP verified successfully', data);
      },
      async signOut() {
        await supabase.auth.signOut();
        setProfile(null);
        setAuthError(null);
      },
      clearAuthError() {
        setAuthError(null);
      }
    }),
    [session, profile, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

