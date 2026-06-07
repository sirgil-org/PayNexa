create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  employee_number text not null,
  employer_file_number text default '',
  full_name text not null,
  initials_and_surname text default '',
  first_names text default '',
  id_number text default '',
  tax_number text default '',
  period text not null,
  employment_from text default '',
  employment_to text default '',
  employer_name text default '',
  employer_tax_number text default '',
  postal_address text default '',
  residential_address text default '',
  salaries_wages numeric(14, 2) default 0,
  commission numeric(14, 2) default 0,
  free_housing numeric(14, 2) default 0,
  housing_allowance numeric(14, 2) default 0,
  mortgage_bond_subsidies numeric(14, 2) default 0,
  entertainment_allowance numeric(14, 2) default 0,
  vehicle_allowance numeric(14, 2) default 0,
  company_vehicle_tax_value numeric(14, 2) default 0,
  travelling_allowance numeric(14, 2) default 0,
  other_allowance numeric(14, 2) default 0,
  other_income numeric(14, 2) default 0,
  gross_pay numeric(14, 2) default 0,
  taxable_income numeric(14, 2) default 0,
  paye numeric(14, 2) default 0,
  pension numeric(14, 2) default 0,
  total_deductions numeric(14, 2) default 0,
  medical_aid numeric(14, 2) default 0,
  allowances numeric(14, 2) default 0,
  pension_fund_name text default '',
  provident_fund_name text default '',
  provident_fund_contribution numeric(14, 2) default 0,
  retirement_fund_name text default '',
  retirement_fund_contribution numeric(14, 2) default 0,
  assurance_company_name text default '',
  assurance_contribution numeric(14, 2) default 0,
  spouse text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, employee_number, period)
);

alter table public.employees enable row level security;

drop policy if exists "Allow anon users to read payee5 employees"
on public.employees;
drop policy if exists "Allow anon users to insert payee5 employees"
on public.employees;
drop policy if exists "Allow anon users to update payee5 employees"
on public.employees;
drop policy if exists "Users can read their own payee5 employees"
on public.employees;
drop policy if exists "Users can insert their own payee5 employees"
on public.employees;
drop policy if exists "Users can update their own payee5 employees"
on public.employees;

create policy "Users can read their own payee5 employees"
on public.employees
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own payee5 employees"
on public.employees
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own payee5 employees"
on public.employees
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
