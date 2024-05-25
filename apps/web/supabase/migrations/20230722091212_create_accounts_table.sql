create TYPE account_type_enum as ENUM (
  'Current',
  'Saving',
  'Mortgage',
  'Loan',
  'Credit Card',
  'Owed'
);

create table accounts (
  id uuid default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  name varchar(50) not null,
  type account_type_enum not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (id)
);
