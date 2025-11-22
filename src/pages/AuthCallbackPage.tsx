import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

/**
 * 轻量级回调页面，用于 Magic Link 登录
 * 
 * 这个页面专门用于手机端点击邮件链接后的回调：
 * 1. 完成 token 交换
 * 2. 显示简单的成功提示
 * 3. 尝试自动关闭页面（如果可能）
 * 
 * 主应用通过轮询检测登录状态，不需要用户在这个页面停留
 */
export const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
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
        console.log('Callback page: Starting token exchange...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
          console.error('Exchange code for session failed', error);
          setErrorMessage('登录失败：' + error.message);
          setStatus('error');
          return;
        }

        console.log('Callback page: Token exchange successful', data);

        // 确保 session 被正确设置
        // 等待一下，确保 Supabase 内部状态已更新
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 再次获取 session，确保它被正确存储
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Callback page: Session after exchange', sessionData);

        if (!sessionData.session) {
          console.error('Callback page: Session not found after exchange');
          setErrorMessage('登录失败：无法获取会话信息');
          setStatus('error');
          return;
        }

        // 登录成功
        setStatus('success');
        
        // 通过 BroadcastChannel 通知其他标签页/设备
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('auth-sync');
          channel.postMessage('auth-state-changed');
          console.log('Callback page: Sent broadcast message');
          // 不要立即关闭 channel，让消息有时间传播
          setTimeout(() => channel.close(), 500);
        }
        
        // 触发 storage 事件，通知其他标签页/设备
        // Supabase 会自动将 session 存储到 localStorage
        // 我们手动触发一个 storage 事件来确保同设备不同标签页的同步
        const timestamp = Date.now().toString();
        window.localStorage.setItem('auth-confirmed', timestamp);
        console.log('Callback page: Set auth-confirmed flag');
        
        // 也触发一个自定义事件，确保主应用能收到通知
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { session: sessionData.session } }));
        
        setTimeout(() => {
          window.localStorage.removeItem('auth-confirmed');
        }, 1000);

        // 清理 URL 参数
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('error');
        url.searchParams.delete('error_code');
        url.searchParams.delete('error_description');
        window.history.replaceState({}, document.title, url.pathname);

        // 尝试自动关闭页面（如果是从邮件客户端打开的）
        // 注意：大多数现代浏览器出于安全考虑，不允许脚本关闭非脚本打开的窗口
        // 但我们可以尝试，如果失败也没关系，用户看到成功提示后可以手动关闭
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            // 如果无法关闭，就显示提示让用户手动返回
            console.log('无法自动关闭窗口，用户需要手动返回');
          }
        }, 2000);
      } catch (err) {
        console.error('Unexpected error during confirmation', err);
        setErrorMessage('登录过程中发生错误，请重试');
        setStatus('error');
      }
    };

    handleConfirm();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-ink-50 to-white p-4">
      <div className="mx-auto max-w-sm w-full rounded-3xl border border-ink-100 bg-white p-8 shadow-xl text-center">
        {status === 'processing' && (
          <div>
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-ink-200 border-t-ink-700"></div>
            <h2 className="mb-2 text-xl font-semibold text-ink-800">正在确认登录...</h2>
            <p className="text-sm text-ink-500">请稍候</p>
          </div>
        )}

        {status === 'success' && (
          <div>
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
            <h2 className="mb-2 text-xl font-semibold text-ink-800">登录成功！</h2>
            <p className="mb-4 text-sm text-ink-500">
              您已成功登录
              <br />
              可以关闭此页面，返回原应用
            </p>
            <p className="text-xs text-ink-400">
              （页面将在 2 秒后自动关闭）
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
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
            <h2 className="mb-2 text-xl font-semibold text-ink-800">登录失败</h2>
            <p className="mb-4 text-sm text-red-600">{errorMessage}</p>
            <p className="text-xs text-ink-400">
              请返回原应用，重新发送登录链接
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

