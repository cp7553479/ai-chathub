'use client';

import { Button, Text } from '@lobehub/ui';
import { LobeChat } from '@lobehub/ui/brand';
import { Col, Flex, Row, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { AuthError } from 'next-auth';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BrandWatermark from '@/components/BrandWatermark';
import AuthIcons from '@/components/NextAuth/AuthIcons';
import { DOCUMENTS_REFER_URL, PRIVACY_URL, TERMS_URL } from '@/const/url';
import { useUserStore } from '@/store/user';

import CredentialsLoginForm from './CredentialsLoginForm';

const useStyles = createStyles(({ css, token }) => ({
  button: css`
    text-transform: capitalize;
  `,
  container: css`
    min-width: 360px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  contentCard: css`
    padding-block: 2.5rem;
    padding-inline: 2rem;
  `,
  description: css`
    margin: 0;
    color: ${token.colorTextSecondary};
  `,
  footer: css`
    padding: 1rem;
    border-block-start: 1px solid ${token.colorBorder};
    border-radius: 0 0 8px 8px;

    color: ${token.colorTextDescription};

    background: ${token.colorBgElevated};
  `,
  text: css`
    text-align: center;
  `,
  title: css`
    margin: 0;
    color: ${token.colorTextHeading};
  `,
}));

const BtnListLoading = memo(() => {
  return (
    <Flex gap={'small'} vertical>
      <Skeleton.Button active style={{ minWidth: 300 }} />
      <Skeleton.Button active style={{ minWidth: 300 }} />
      <Skeleton.Button active style={{ minWidth: 300 }} />
    </Flex>
  );
});

/**
 * Follow the implementation from AuthJS official documentation,
 * but using client components.
 * ref: https://authjs.dev/guides/pages/signin
 */
export default memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('clerk');
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<string, any> | null>(null);

  const oAuthSSOProviders = useUserStore((s) => s.oAuthSSOProviders);

  const searchParams = useSearchParams();

  // Redirect back to the page url, fallback to '/' if failed
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  // 在客户端获取 providers 数据
  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  // 如果没有提供 providers 数据，回退到原有的 OAuth 提供者列表
  const hasProviders = providers && Object.keys(providers).length > 0;
  const credentialProvider = hasProviders
    ? Object.values(providers).find((p) => p.type === 'credentials')
    : null;
  const oauthProviders = hasProviders
    ? Object.values(providers).filter((p) => p.type === 'oauth')
    : oAuthSSOProviders
      ? oAuthSSOProviders.map((name) => ({ id: name, name }))
      : [];

  const handleSignIn = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      await signIn(provider, { redirectTo: callbackUrl });
    } catch (error) {
      setLoadingProvider(null);
      // Signin can fail for a number of reasons, such as the user
      // not existing, or the user not having the correct role.
      // In some cases, you may want to redirect to a custom error
      if (error instanceof AuthError) {
        return router.push(`/next-auth/?error=${error.type}`);
      }

      // Otherwise if a redirects happens Next.js can handle it
      // so you can just re-thrown the error and let Next.js handle it.
      // Docs: https://nextjs.org/docs/app/api-reference/functions/redirect#server-component
      throw error;
    }
  };

  const footerBtns = [
    { href: DOCUMENTS_REFER_URL, id: 0, label: t('footerPageLink__help') },
    { href: PRIVACY_URL, id: 1, label: t('footerPageLink__privacy') },
    { href: TERMS_URL, id: 2, label: t('footerPageLink__terms') },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.contentCard}>
        {/* Card Body */}
        <Flex gap="large" vertical>
          {/* Header */}
          <div className={styles.text}>
            <Text as={'h4'} className={styles.title}>
              <div>
                <LobeChat size={48} />
              </div>
              {t('signIn.start.title', { applicationName: 'LobeChat' })}
            </Text>
            <Text as={'p'} className={styles.description}>
              {t('signIn.start.subtitle')}
            </Text>
          </div>
          {/* Content */}
          <Flex gap="small" vertical>
            {/* 显示 Credential Provider 表单 */}
            {credentialProvider && (
              <CredentialsLoginForm
                providerId={credentialProvider.id}
                providerName={credentialProvider.name}
              />
            )}

            {/* 显示 OAuth Providers 按钮 */}
            {oauthProviders.length > 0 &&
              oauthProviders.map((provider) => (
                <Button
                  className={styles.button}
                  icon={AuthIcons(provider.name, 16)}
                  key={provider.id}
                  loading={loadingProvider === provider.id}
                  onClick={() => handleSignIn(provider.id)}
                >
                  {provider.name}
                </Button>
              ))}

            {/* 回退：显示加载状态 */}
            {!credentialProvider && oauthProviders.length === 0 && <BtnListLoading />}
          </Flex>
        </Flex>
      </div>
      <div className={styles.footer}>
        {/* Footer */}
        <Row>
          <Col span={12}>
            <Flex justify="left" style={{ height: '100%' }}>
              <BrandWatermark />
            </Flex>
          </Col>
          <Col offset={4} span={8}>
            <Flex justify="right">
              {footerBtns.map((btn) => (
                <Button key={btn.id} onClick={() => router.push(btn.href)} size="small" type="text">
                  {btn.label}
                </Button>
              ))}
            </Flex>
          </Col>
        </Row>
      </div>
    </div>
  );
});
