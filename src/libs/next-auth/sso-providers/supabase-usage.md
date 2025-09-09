# Supabase 认证提供商使用指南

## 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Next-Auth 配置
NEXT_AUTH_SSO_PROVIDERS=supabase
# 或与其他提供商组合使用
# NEXT_AUTH_SSO_PROVIDERS=supabase,google,github

# Enable authentication protection for all pages
ENABLE_AUTH_PROTECTION=1
```

## 前端使用方式

```typescript
import { signIn } from 'next-auth/react';

// 用户登录
const handleSignIn = async () => {
  await signIn('supabase', {
    email: 'user@example.com',
    password: 'password',
    mode: 'signin',
    callbackUrl: '/dashboard',
  });
};

// 用户注册
const handleSignUp = async () => {
  await signIn('supabase', {
    email: 'user@example.com',
    password: 'password',
    mode: 'signup',
    callbackUrl: '/dashboard',
  });
};
```

## 特性

- ✅ 支持用户注册和登录
- ✅ 集成 Supabase Auth API
- ✅ 与现有 Next-Auth 配置兼容
- ✅ 支持 JWT 会话策略
- ✅ 错误处理和类型安全

## 注意事项

1. 确保 Supabase 项目已正确配置
2. 环境变量必须正确设置
3. mode 参数用于区分登录 ('signin') 和注册 ('signup') 操作
4. 认证失败时会返回 null，不会抛出异常
