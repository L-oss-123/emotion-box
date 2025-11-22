# ⚠️ 此文档已过时

**本应用已切换到 OTP 验证码登录方案，请查看 [OTP_SETUP.md](./OTP_SETUP.md) 获取最新配置说明。**

---

# Magic Link 登录配置说明（已废弃）

## 方案概述

本应用使用 **轻量级回调页面 + 前端轮询** 的方式实现 Magic Link 登录，提供更好的手机端体验：

✅ **手机端点击邮件链接后**：打开轻量级回调页面，完成登录后自动关闭  
✅ **电脑端**：通过轮询自动检测登录状态，无需用户操作  
✅ **用户体验**：手机端不需要访问主站，只需在回调页面完成登录即可

## Supabase 配置

### 1. 配置重定向 URL

在 Supabase 后台的 **Authentication** > **URL Configuration** > **Redirect URLs** 中，添加以下 URL：

**开发环境：**
```
http://localhost:5173/auth/callback
```

**生产环境：**
```
https://emotion-box.netlify.app/auth/callback
```

**重要提示：**
- ✅ 只需要添加 `/auth/callback` 这一个路径
- ❌ 不需要添加通配符 `/*` 或 `/**`
- ✅ 确保 URL 格式正确（包含协议 `http://` 或 `https://`）

### 2. 配置 Site URL（可选）

在 **Authentication** > **URL Configuration** > **Site URL** 中：

- **开发环境**：`http://localhost:5173`
- **生产环境**：`https://emotion-box.netlify.app`

## 工作流程

### 1. 用户在前端输入邮箱

用户在前端输入邮箱，点击"发送登录确认链接"。

### 2. Supabase 发送邮件

应用调用 `supabase.auth.signInWithOtp()`，Supabase 发送包含登录链接的邮件。

邮件中的链接指向：`https://emotion-box.netlify.app/auth/callback?code=xxx&state=xxx`

### 3. 手机端用户点击邮件链接

👉 打开轻量级回调页面 `/auth/callback`  
👉 页面自动完成 token 交换  
👉 显示"登录成功"提示  
👉 尝试自动关闭页面（如果可能）

### 4. 电脑端自动检测登录

电脑端的前端应用通过轮询（每 1 秒检查一次）检测登录状态：

- 如果使用相同的浏览器账户同步（如 Chrome Sync），session 会自动同步
- 轮询检测到 session 后，自动完成登录，用户无需任何操作

## 技术细节

### 回调页面 (`/auth/callback`)

- 轻量级页面，只负责完成 token 交换
- 完成登录后显示简单的成功提示
- 尝试自动关闭页面（大多数浏览器出于安全考虑不允许，但不影响功能）
- 用户看到成功提示后可以手动关闭

### 轮询机制

- 当用户发送登录链接后，前端开始轮询（每 1 秒检查一次）
- 轮询会持续到检测到 session 或用户取消
- 使用 `supabase.auth.getSession()` 检查登录状态
- 同时监听 localStorage 变化和 BroadcastChannel 消息（跨标签页同步）

### 跨设备同步

- **相同浏览器账户**：如果电脑端和手机端使用相同的浏览器账户（如 Chrome Sync），session 会自动同步
- **不同浏览器/设备**：session 不会自动同步，但用户可以在电脑端刷新页面，Supabase 会从服务器获取最新的 session

## 常见问题

### Q: 为什么手机端点击后不跳转到主站？

A: 这是设计如此。手机端只需要打开轻量级回调页面完成登录，不需要访问主站。这样可以提供更好的用户体验，特别是在手机端。

### Q: 电脑端如何知道用户已经登录？

A: 电脑端通过轮询检测登录状态。如果使用相同的浏览器账户同步，session 会自动同步；否则，用户刷新页面后，Supabase 会从服务器获取最新的 session。

### Q: 轮询会一直运行吗？

A: 不会。轮询只在以下情况运行：
- 用户已发送登录链接（`sent === true`）
- 用户尚未登录（`session === null`）

一旦检测到登录或用户取消，轮询会自动停止。

### Q: 如果链接过期怎么办？

A: 如果链接过期，回调页面会显示错误提示。用户可以返回原应用，重新发送登录链接。

### Q: 可以在 Supabase 中使用通配符吗？

A: 可以，但不推荐。使用具体的 `/auth/callback` 路径更安全，也更符合最佳实践。

## 测试步骤

1. **配置 Supabase**：确保在 Supabase 后台添加了正确的重定向 URL
2. **发送登录链接**：在前端输入邮箱，发送登录链接
3. **检查邮件**：查看邮箱中的登录链接，确认指向 `/auth/callback`
4. **手机端测试**：在手机端点击邮件链接，应该打开回调页面并完成登录
5. **电脑端测试**：在电脑端等待 1-2 秒，应该自动检测到登录状态

## 环境变量

可选的环境变量：

```env
# 生产环境的站点 URL（用于强制使用生产 URL）
# 如果不设置，将使用当前页面的 origin
VITE_SITE_URL=https://emotion-box.netlify.app
```

## 相关文件

- `src/pages/AuthCallbackPage.tsx` - 回调页面组件
- `src/providers/AuthProvider.tsx` - 认证提供者，包含 `signInWithEmail` 方法
- `src/components/AuthGate.tsx` - 认证门卫，包含轮询逻辑

