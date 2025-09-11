import pkg from '@/../package.json';

import { BRANDING_NAME, ORG_NAME } from './branding';

export const CURRENT_VERSION = pkg.version;

export const isServerMode = process.env.NEXT_PUBLIC_SERVICE_MODE === 'server';
export const isUsePgliteDB = process.env.NEXT_PUBLIC_CLIENT_DB === 'pglite';

export const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP_APP === '1';

// 强制启用新版 Provider 配置页与逻辑
export const isDeprecatedEdition = false;

// @ts-ignore
export const isCustomBranding = BRANDING_NAME !== 'LobeChat';
// @ts-ignore
export const isCustomORG = ORG_NAME !== 'LobeHub';
