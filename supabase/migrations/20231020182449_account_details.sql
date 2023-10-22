create table account_details (
  id bigint primary key generated always as identity,
  value numeric not null,
  month numeric not null,
  year numeric not null,
  created_at timestamptz default now(),
  account_id uuid not null references accounts(id) on delete cascade
);
