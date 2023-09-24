create table accounts (
  id uuid default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  name varchar(50) not null,
  type varchar(50) not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (id)
)
