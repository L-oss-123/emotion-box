import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export const AuthConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');

    // 处理错误情况
    if (error) {
      let message = '登录失败';
      if (errorCode === 'otp_expired') {
        message = '登录链接已过期，请重新发送登录链接';
      } else if (errorDescription) {
        message = decodeURIComponent(errorDescription);
      } else if (error === 'access_denied') {
        message = '访问被拒绝，请重试';
      }
      setErrorMessage(message);
      setStatus('error');
      return;
    }

    // 如果没有 code，说明不是有效的确认链接
    if (!code) {
      setErrorMessage('无效的登录链接');
      setStatus('error');
      return;
    }

    // 处理认证确认
    const handleConfirm = async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
          console.error('Exchange code for session failed', error);
          setErrorMessage('登录失败：' + error.message);
          setStatus('error');
          return;
        }

        // 登录成功
        setStatus('success');
        
        // 触发 storage 事件，通知其他标签页
        // Supabase 会自动将 session 存储到 localStorage
        // 我们手动触发一个 storage 事件来确保同设备不同标签页的同步
        // 注意：不同设备之间无法通过 localStorage 同步，需要通过轮询检测
        const event = new StorageEvent('storage', {
          key: 'auth-confirmed',
          newValue: Date.now().toString(),
          storageArea: window.localStorage
        });
        window.dispatchEvent(event);
        
        // 也直接设置一个标记，然后立即删除，触发 storage 事件
        window.localStorage.setItem('auth-confirmed', Date.now().toString());
        setTimeout(() => {
          window.localStorage.removeItem('auth-confirmed');
        }, 100);
        
        // 清理 URL 参数
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('error');
        url.searchParams.delete('error_code');
        url.searchParams.delete('error_description');
        window.history.replaceState({}, document.title, url.pathname);
      } catch (err) {
        console.error('Unexpected error during confirmation', err);
        setErrorMessage('登录过程中发生错误，请重试');
        setStatus('error');
      }
    };

    handleConfirm();
  }, [searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-xl">
        {status === 'processing' && (
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-ink-200 border-t-ink-700"></div>
            <h2 className="mb-2 text-2xl font-semibold text-ink-800">正在确认登录...</h2>
            <p className="text-ink-500">请稍候，我们正在验证您的登录信息</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-ink-800">登录成功！</h2>
            <p className="mb-6 text-ink-500">
              您已成功登录，可以在其他设备上继续使用。
              <br />
              您可以关闭此页面。
            </p>
            <button
              onClick={() => navigate('/')}
              className="rounded-2xl bg-ink-700 px-6 py-3 text-white shadow-lg transition hover:bg-ink-600"
            >
              返回首页
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-ink-800">登录失败</h2>
            <p className="mb-6 text-red-600">{errorMessage}</p>
            <button
              onClick={() => navigate('/')}
              className="rounded-2xl border border-ink-200 bg-white px-6 py-3 text-ink-600 transition hover:bg-ink-50"
            >
              返回首页
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

