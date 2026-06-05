create table if not exists public.payee5_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  employee_number text not null,
  full_name text not null,
  id_number text default '',
  tax_number text default '',
  period text not null,
  employer_name text default '',
  employer_tax_number text default '',
  gross_pay numeric(14, 2) default 0,
  taxable_income numeric(14, 2) default 0,
  paye numeric(14, 2) default 0,
  pension numeric(14, 2) default 0,
  medical_aid numeric(14, 2) default 0,
  allowances numeric(14, 2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, employee_number, period)
);

alter table public.payee5_employees enable row level security;

drop policy if exists "Allow anon users to read payee5 employees"
on public.payee5_employees;
drop policy if exists "Allow anon users to insert payee5 employees"
on public.payee5_employees;
drop policy if exists "Allow anon users to update payee5 employees"
on public.payee5_employees;

create policy "Users can read their own payee5 employees"
on public.payee5_employees
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own payee5 employees"
on public.payee5_employees
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own payee5 employees"
on public.payee5_employees
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
