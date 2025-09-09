'use client';

import { Button, Icon } from '@lobehub/ui';
import { Lock, Mail, User } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import FormAction from '@/components/FormAction';
import { FormInput, FormPassword } from '@/components/FormInput';

interface CredentialsLoginFormProps {
  providerId: string;
  providerName?: string;
}

const CredentialsLoginForm = memo<CredentialsLoginFormProps>(({ providerId }) => {
  const { t } = useTranslation(['common', 'auth']);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const handleSubmit = async () => {
    if (!email || !password) return;

    setLoading(true);
    try {
      const result = await signIn(providerId, {
        callbackUrl,
        email,
        mode: isSignUp ? 'signup' : 'signin',
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push(callbackUrl);
      } else {
        console.error('Login failed:', result?.error);
        // 这里可以添加错误提示，复用项目中的错误处理组件
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <FormAction
      avatar={<Icon icon={User} size="large" />}
      description={
        isSignUp
          ? 'Create a new account with your email'
          : 'Sign in to your account with your email'
      }
      title={isSignUp ? t('signup', 'Sign Up') : t('login', 'Sign In')}
    >
      <div onKeyPress={handleKeyPress} style={{ maxWidth: '300px', width: '100%' }}>
        <FormInput
          autoComplete="email"
          onChange={setEmail}
          placeholder="Enter your email"
          prefix={<Icon icon={Mail} />}
          size="large"
          style={{ marginBottom: '12px' }}
          type="email"
          value={email}
        />

        <FormPassword
          autoComplete="current-password"
          onChange={setPassword}
          placeholder="Enter your password"
          prefix={<Icon icon={Lock} />}
          size="large"
          style={{ marginBottom: '16px' }}
          value={password}
        />

        <Flexbox gap={12} style={{ marginTop: '16px' }}>
          <Button block loading={loading} onClick={handleSubmit} size="large" type="primary">
            {isSignUp ? t('signup', 'Sign Up') : t('login', 'Sign In')}
          </Button>

          <Button block onClick={() => setIsSignUp(!isSignUp)} size="small" type="text">
            {isSignUp
              ? t('common:haveAccount', 'Already have an account? Sign In')
              : t('common:noAccount', 'No account? Sign Up')}
          </Button>
        </Flexbox>
      </div>
    </FormAction>
  );
});

CredentialsLoginForm.displayName = 'CredentialsLoginForm';

export default CredentialsLoginForm;
