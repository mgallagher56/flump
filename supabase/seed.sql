insert into
  public.employees (name, department)
values
  ('Nelson Bighetti', 'Pied Piper'),
  ('Carla Walton', 'Pied Piper'),
  ('Laurie Bream', 'Raviga'),
  ('Russ Hanneman', 'Raviga'),
  ('Jack Barker', 'Hooli'),
  ('Peter Gregory', 'Raviga'),
  ('Donald Dunn', 'Hooli'),
  ('Jian Yang', 'Pied Piper'),
  ('Ed Chen', 'Pied Piper'),
  ('Hoover', 'Hooli'),
  ('Dan Melcher', 'Hooli'),
  ('Ron LaFlamme', 'Hooli'),
  ('Bachmanity', 'Bachmanity');

insert into
  auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user
  )
values
  (
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'authenticated',
    'authenticated',
    'test@test.com',
    crypt('password123', gen_salt('bf')),
    '2023-02-18 23:31:13.017218+00',
    NULL,
    '',
    '2023-02-18 23:31:12.757017+00',
    '',
    NULL,
    '',
    '',
    NULL,
    '2023-02-18 23:31:13.01781+00',
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NULL,
    '2023-02-18 23:31:12.752281+00',
    '2023-02-18 23:31:13.019418+00',
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    'f'
  );

insert into
  public.accounts (name, type, user_id)
values
  (
    'Revolut',
    'Current',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'Revolut',
    'Saving',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'Starling',
    'Current',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'Starling',
    'Saving',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'Chip',
    'Saving',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'Amex',
    'Credit Card',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'Barclaycard',
    'Credit Card',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'Barclays',
    'Mortgage',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'Halifax',
    'Loan',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    'John Smith',
    'Owed',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  );
