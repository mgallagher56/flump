import type { User } from '@supabase/supabase-js';

const id = '93bc29a3-0200-4ccb-b72c-ef54902c4d33';

export const mockUser: User = {
  id: id,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'mgrdevuk@gmail.com',
  email_confirmed_at: '2023-07-15T08:12:24.869498Z',
  phone: '',
  confirmation_sent_at: '2023-07-15T08:11:44.85572Z',
  confirmed_at: '2023-07-15T08:12:24.869498Z',
  last_sign_in_at: '2023-07-15T11:38:06.654006336Z',
  app_metadata: {
    provider: 'email',
    providers: ['email']
  },
  user_metadata: {},
  identities: [
    {
      id: id,
      user_id: id,
      identity_data: {
        email: 'mgrdevuk@gmail.com',
        sub: id
      },
      provider: 'email',
      last_sign_in_at: '2023-07-15T08:11:44.854248Z',
      created_at: '2023-07-15T08:11:44.854263Z',
      updated_at: '2023-07-15T08:11:44.854263Z'
    }
  ],
  created_at: '2023-07-15T08:11:44.851944Z',
  updated_at: '2023-07-15T11:38:06.655469Z'
};
