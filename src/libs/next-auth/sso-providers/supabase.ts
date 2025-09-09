import { createClient } from '@supabase/supabase-js';
import CredentialsProvider from 'next-auth/providers/credentials';

import { CommonProviderConfig } from './sso.config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const provider = {
  id: 'supabase',
  provider: CredentialsProvider({
    ...CommonProviderConfig,
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const { email, password, mode } = credentials;

      try {
        if (mode === 'signup') {
          // 注册新用户
          const { data, error } = await supabase.auth.signUp({
            email: email as string,
            password: password as string,
          });

          if (error) return null;
          if (!data.user) return null;

          return {
            email: data.user.email || (email as string),
            id: data.user.id,
            name: data.user.email || (email as string),
          };
        } else {
          // 用户登录
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email as string,
            password: password as string,
          });

          if (error) return null;
          if (!data.user) return null;

          return {
            email: data.user.email || (email as string),
            id: data.user.id,
            name: data.user.email || (email as string),
          };
        }
      } catch (error) {
        console.error('Supabase auth error:', error);
        return null;
      }
    },
    credentials: {
      email: { label: 'Email', type: 'email' },
      mode: { label: 'Mode', type: 'text' },
      password: { label: 'Password', type: 'password' }, // 'signin' or 'signup'
    },
    id: 'supabase',
    name: 'Supabase',
  }),
};

export default provider;
