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
  public.accounts (id, name, type, user_id)
values
  (
    '00000000-0000-0000-0000-100000000000',
    'Revolut',
    'Current',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    '00000000-0000-0000-0000-100000000001',
    'Revolut',
    'Saving',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    '00000000-0000-0000-0000-100000000002',
    'Starling',
    'Current',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    '00000000-0000-0000-0000-100000000003',
    'Starling',
    'Saving',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    '00000000-0000-0000-0000-100000000004',
    'Chip',
    'Saving',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    '00000000-0000-0000-0000-100000000005',
    'Amex',
    'Credit Card',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    '00000000-0000-0000-0000-100000000006',
    'Barclaycard',
    'Credit Card',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    '00000000-0000-0000-0000-100000000007',
    'Barclays',
    'Mortgage',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    '00000000-0000-0000-0000-100000000008',
    'Halifax',
    'Loan',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ),
  (
    '00000000-0000-0000-0000-100000000009',
    'John Smith',
    'Owed',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  );

insert into
  public.account_details (year, month, value, account_id)
values
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000000'
  ),
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000001'
  ),
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000002'
  ),
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000003'
  ),
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000004'
  ),
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000005'
  ),
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000006'
  ),
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000007'
  ),
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000008'
  ),
  (
    2021,
    1,
    100,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    2,
    200,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    3,
    300,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    4,
    400,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    5,
    500,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    6,
    600,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    7,
    700,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    8,
    800,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    9,
    925,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    10,
    950,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    11,
    975,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2021,
    12,
    1000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    1,
    1000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    2,
    2000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    3,
    3000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    4,
    4000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    5,
    5000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    6,
    6000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    7,
    7000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    8,
    8000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    9,
    9000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    10,
    10000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    11,
    11000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2022,
    12,
    12000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    1,
    13000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    2,
    14000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    3,
    15000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    4,
    16000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    5,
    17000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    6,
    18000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    7,
    19000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    8,
    20000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    9,
    21000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    10,
    22000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    11,
    23000,
    '00000000-0000-0000-0000-100000000009'
  ),
  (
    2023,
    12,
    24000,
    '00000000-0000-0000-0000-100000000009'
  );
