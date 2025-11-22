# OTP 验证码登录配置说明

## ⚠️ 重要提示

**如果您收到的邮件是登录链接而不是验证码，必须修改 Supabase 后台的邮件模板！**

👉 **详细配置步骤请查看：[SUPABASE_EMAIL_TEMPLATE_CONFIG.md](./SUPABASE_EMAIL_TEMPLATE_CONFIG.md)**

## 方案概述

本应用使用 **邮箱验证码（OTP）** 登录方案，用户输入邮箱后收到 6 位数字验证码，在页面输入验证码即可完成登录：

✅ **无需跳转**：用户直接在页面输入验证码，无需点击邮件链接  
✅ **手机端友好**：无需在手机端操作，只需在电脑端输入验证码  
✅ **避免死循环**：不会出现点击链接后跳转死循环的问题

## Supabase 后台配置（必须操作！）

### ⚠️ 如果收到的是链接而不是验证码

**这是 Supabase 后台邮件模板配置问题，必须手动修改！**

**快速解决步骤：**

1. 登录 Supabase 控制台：https://app.supabase.com
2. 进入 **Authentication** > **Email Templates**
3. 找到 **Magic Link** 模板
4. **删除**模板中的 `{{ .ConfirmationURL }}`（链接）
5. **添加** `{{ .Token }}`（验证码）
6. 保存模板

**详细步骤和模板示例：** 请查看 [SUPABASE_EMAIL_TEMPLATE_CONFIG.md](./SUPABASE_EMAIL_TEMPLATE_CONFIG.md)

### 1. 配置邮件模板（详细说明）

在 Supabase 后台的 **Authentication** > **Email Templates** 中，需要确保 **Magic Link** 模板配置为发送验证码而不是链接。

**关键配置：**

1. 进入 **Authentication** > **Email Templates**
2. 找到 **Magic Link** 模板
3. **必须使用** `{{ .Token }}` 变量显示验证码
4. **不要使用** `{{ .ConfirmationURL }}`（这会导致发送链接）
5. 模板示例：

```
您的验证码是：{{ .Token }}

验证码有效期为 10 分钟。

如果不是您本人操作，请忽略此邮件。
```

**⚠️ 重要：** 即使代码配置正确，如果邮件模板使用了 `{{ .ConfirmationURL }}`，仍然会发送链接！

### 2. 确保使用 OTP 模式

Supabase 的 `signInWithOtp` 方法默认应该发送验证码，但需要确保：

- ✅ **不设置 `emailRedirectTo`**：代码中已经确保不设置此选项
- ✅ **邮件模板正确**：确保邮件模板显示验证码而不是链接

### 3. 检查邮件提供商设置

如果仍然收到魔法链接，请检查：

1. **邮件模板类型**：确保使用的是 OTP 模板，而不是 Magic Link 模板
2. **Supabase 版本**：确保使用最新版本的 Supabase
3. **邮件服务配置**：检查 Supabase 的邮件服务配置是否正确

## 工作流程

### 1. 用户输入邮箱

用户在页面输入邮箱地址，点击"发送验证码"。

### 2. Supabase 发送邮件

应用调用 `supabase.auth.signInWithOtp()`，Supabase 发送包含 6 位数字验证码的邮件。

**邮件内容示例：**
```
您的验证码是：123456

验证码有效期为 10 分钟。
```

### 3. 用户输入验证码

用户查看邮箱，复制或记住 6 位验证码，在页面输入框中输入。

### 4. 验证并登录

应用调用 `supabase.auth.verifyOtp()` 验证用户输入的验证码，验证成功后自动完成登录。

## 代码实现

### 发送验证码

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    shouldCreateUser: true
    // 注意：不设置 emailRedirectTo，确保发送验证码
  }
});
```

### 验证验证码

```typescript
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456', // 用户输入的 6 位数字
  type: 'email'
});
```

## 常见问题

### Q: 为什么收到的邮件是魔法链接而不是验证码？

A: 这通常是因为 Supabase 后台的邮件模板配置问题。请检查：

1. **邮件模板**：确保 Magic Link 模板配置为显示验证码
2. **代码配置**：确保代码中没有设置 `emailRedirectTo`
3. **Supabase 版本**：确保使用最新版本的 Supabase

### Q: 如何修改 Supabase 邮件模板？

A: 在 Supabase 后台：

1. 进入 **Authentication** > **Email Templates**
2. 选择 **Magic Link** 模板
3. 修改模板内容，使用 `{{ .Token }}` 变量显示验证码
4. 保存模板

### Q: 验证码有效期是多久？

A: Supabase 默认的验证码有效期为 10 分钟，且一次性使用。

### Q: 如果验证码过期怎么办？

A: 用户可以返回邮箱输入步骤，重新发送验证码。

### Q: 手机端需要操作吗？

A: 不需要。用户只需在电脑端输入验证码即可完成登录，无需在手机端操作。

## 测试步骤

1. **配置 Supabase**：确保邮件模板正确配置为显示验证码
2. **发送验证码**：在前端输入邮箱，点击"发送验证码"
3. **检查邮件**：查看邮箱，应该收到包含 6 位数字验证码的邮件（而不是链接）
4. **输入验证码**：在页面输入验证码，点击"确认登录"
5. **验证登录**：应该成功登录，无需跳转

## 相关文件

- `src/providers/AuthProvider.tsx` - 认证提供者，包含 `sendOtp` 和 `verifyOtp` 方法
- `src/components/AuthGate.tsx` - 认证门卫，包含验证码输入界面

## 故障排除

如果仍然收到魔法链接：

1. **检查代码**：确保 `sendOtp` 方法中没有设置 `emailRedirectTo`
2. **检查模板**：在 Supabase 后台检查邮件模板配置
3. **清除缓存**：清除浏览器缓存，重新测试
4. **联系支持**：如果问题持续，可能需要联系 Supabase 支持团队

