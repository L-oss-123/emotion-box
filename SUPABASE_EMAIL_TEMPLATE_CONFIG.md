# Supabase 邮件模板配置指南（重要！）

## 问题说明

如果您的邮箱收到的是**登录链接**而不是**验证码**，这是因为 Supabase 后台的邮件模板配置问题。

即使代码中不设置 `emailRedirectTo`，如果邮件模板配置为魔法链接格式，Supabase 仍然会发送链接。

## 解决步骤（必须操作）

### 1. 登录 Supabase 控制台

访问您的 Supabase 项目：https://app.supabase.com

### 2. 进入邮件模板设置

1. 在左侧菜单中，点击 **Authentication**（身份验证）
2. 点击 **Email Templates**（邮件模板）
3. 找到 **Magic Link** 模板

### 3. 修改 Magic Link 模板

**关键操作：** 将模板内容修改为显示验证码，而不是链接。

#### 模板修改前（错误示例 - 会发送链接）：

```
点击以下链接登录：

{{ .ConfirmationURL }}

如果不是您本人操作，请忽略此邮件。
```

#### 模板修改后（正确示例 - 会发送验证码）：

```
您的验证码是：{{ .Token }}

验证码有效期为 10 分钟。

请在页面中输入此验证码完成登录。

如果不是您本人操作，请忽略此邮件。
```

### 4. 可用的模板变量

在 Supabase 邮件模板中，可以使用以下变量：

- `{{ .Token }}` - **6 位数字验证码**（这是我们需要的）
- `{{ .TokenHash }}` - 验证码的哈希值
- `{{ .ConfirmationURL }}` - 确认链接（魔法链接，不要使用）
- `{{ .Email }}` - 用户邮箱
- `{{ .SiteURL }}` - 网站 URL

**重要：** 要发送验证码，必须使用 `{{ .Token }}`，**不要使用** `{{ .ConfirmationURL }}`。

### 5. 完整的模板示例

**中文模板：**

```
您的验证码是：{{ .Token }}

验证码有效期为 10 分钟。

请在页面中输入此验证码完成登录。

如果不是您本人操作，请忽略此邮件。
```

**英文模板：**

```
Your verification code is: {{ .Token }}

This code will expire in 10 minutes.

Please enter this code on the page to complete login.

If you did not request this, please ignore this email.
```

### 6. 保存并测试

1. 修改模板后，点击 **Save**（保存）
2. 返回应用，重新发送验证码
3. 检查邮箱，应该收到包含 6 位数字验证码的邮件

## 验证配置是否正确

### ✅ 正确的邮件内容：

```
您的验证码是：123456

验证码有效期为 10 分钟。
```

### ❌ 错误的邮件内容（包含链接）：

```
点击以下链接登录：
https://xxx.supabase.co/auth/v1/verify?token=xxx&type=email
```

## 常见问题

### Q: 修改模板后仍然收到链接？

A: 请检查：
1. 模板中是否使用了 `{{ .ConfirmationURL }}`（应该删除）
2. 模板中是否使用了 `{{ .Token }}`（必须使用）
3. 是否保存了模板
4. 清除浏览器缓存后重新测试

### Q: 如何确认模板已保存？

A: 在 Supabase 控制台的 Email Templates 页面，可以看到模板的预览。确保预览中显示的是验证码而不是链接。

### Q: 可以自定义邮件样式吗？

A: 可以。Supabase 支持 HTML 格式的邮件模板。您可以使用 HTML 来美化邮件样式，但必须确保使用 `{{ .Token }}` 显示验证码。

### Q: 验证码有效期是多久？

A: Supabase 默认的验证码有效期为 10 分钟，且一次性使用。

## 代码配置确认

确保代码中**不设置** `emailRedirectTo`：

```typescript
// ✅ 正确：不设置 emailRedirectTo
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true
    // 不设置 emailRedirectTo
  }
});

// ❌ 错误：设置了 emailRedirectTo 会发送链接
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,
    emailRedirectTo: 'https://example.com' // 这会导致发送链接
  }
});
```

## 总结

**关键点：**
1. ✅ 代码中不设置 `emailRedirectTo`（已确认正确）
2. ✅ Supabase 后台邮件模板使用 `{{ .Token }}` 而不是 `{{ .ConfirmationURL }}`（**必须手动配置**）

如果完成以上配置后仍然收到链接，请检查：
- Supabase 项目是否正确
- 邮件模板是否已保存
- 清除缓存后重新测试

