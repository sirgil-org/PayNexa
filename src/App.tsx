import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import * as XLSX from 'xlsx'

type EmployeeRecord = {
  id?: string
  employeeNumber: string
  fullName: string
  idNumber: string
  taxNumber: string
  period: string
  employerName: string
  employerTaxNumber: string
  grossPay: number
  taxableIncome: number
  paye: number
  pension: number
  medicalAid: number
  allowances: number
  source: 'upload' | 'supabase'
}

type SupabaseEmployeeRow = {
  id?: string
  user_id: string
  employee_number: string
  full_name: string
  id_number: string
  tax_number: string
  period: string
  employer_name: string
  employer_tax_number: string
  gross_pay: number
  taxable_income: number
  paye: number
  pension: number
  medical_aid: number
  allowances: number
}

const headings = [
  ['employeeNumber', 'employee number', 'employee no', 'employee id', 'staff no'],
  ['fullName', 'full name', 'employee name', 'name'],
  ['idNumber', 'id number', 'id no', 'national id'],
  ['taxNumber', 'tax number', 'tin', 'paye number'],
  ['period', 'period', 'tax year', 'year'],
  ['employerName', 'employer name', 'company', 'company name'],
  ['employerTaxNumber', 'employer tax number', 'employer tin'],
  ['grossPay', 'gross pay', 'gross salary', 'gross remuneration'],
  ['taxableIncome', 'taxable income', 'taxable remuneration'],
  ['paye', 'paye', 'payee', 'tax deducted', 'employee tax'],
  ['pension', 'pension', 'retirement', 'pension contribution'],
  ['medicalAid', 'medical aid', 'medical'],
  ['allowances', 'allowances', 'benefits'],
] as const

const currency = new Intl.NumberFormat('en-NA', {
  style: 'currency',
  currency: 'NAD',
})

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')
}

function pickValue(row: Record<string, unknown>, aliases: readonly string[]) {
  const map = new Map(
    Object.entries(row).map(([key, value]) => [normaliseHeader(key), value]),
  )

  for (const alias of aliases) {
    const value = map.get(alias)
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }

  return ''
}

function textValue(value: unknown) {
  return String(value ?? '').trim()
}

function moneyValue(value: unknown) {
  const cleaned = String(value ?? '0').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function rowToEmployee(row: Record<string, unknown>, index: number): EmployeeRecord {
  const values = Object.fromEntries(
    headings.map(([field, ...aliases]) => [field, pickValue(row, aliases)]),
  ) as Record<keyof Omit<EmployeeRecord, 'id' | 'source'>, unknown>

  return {
    employeeNumber: textValue(values.employeeNumber) || `EMP-${index + 1}`,
    fullName: textValue(values.fullName) || `Employee ${index + 1}`,
    idNumber: textValue(values.idNumber),
    taxNumber: textValue(values.taxNumber),
    period: textValue(values.period) || new Date().getFullYear().toString(),
    employerName: textValue(values.employerName),
    employerTaxNumber: textValue(values.employerTaxNumber),
    grossPay: moneyValue(values.grossPay),
    taxableIncome: moneyValue(values.taxableIncome),
    paye: moneyValue(values.paye),
    pension: moneyValue(values.pension),
    medicalAid: moneyValue(values.medicalAid),
    allowances: moneyValue(values.allowances),
    source: 'upload',
  }
}

function toSupabaseRow(
  employee: EmployeeRecord,
  userId: string,
): SupabaseEmployeeRow {
  return {
    user_id: userId,
    employee_number: employee.employeeNumber,
    full_name: employee.fullName,
    id_number: employee.idNumber,
    tax_number: employee.taxNumber,
    period: employee.period,
    employer_name: employee.employerName,
    employer_tax_number: employee.employerTaxNumber,
    gross_pay: employee.grossPay,
    taxable_income: employee.taxableIncome,
    paye: employee.paye,
    pension: employee.pension,
    medical_aid: employee.medicalAid,
    allowances: employee.allowances,
  }
}

function fromSupabaseRow(row: SupabaseEmployeeRow): EmployeeRecord {
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    fullName: row.full_name,
    idNumber: row.id_number,
    taxNumber: row.tax_number,
    period: row.period,
    employerName: row.employer_name,
    employerTaxNumber: row.employer_tax_number,
    grossPay: row.gross_pay,
    taxableIncome: row.taxable_income,
    paye: row.paye,
    pension: row.pension,
    medicalAid: row.medical_aid,
    allowances: row.allowances,
    source: 'supabase',
  }
}

function addRow(doc: jsPDF, label: string, value: string, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.text(label, 22, y)
  doc.setFont('helvetica', 'normal')
  doc.text(value || '-', 86, y)
}

function generatePayee5(employee: EmployeeRecord) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const fileName = `Payee-5-${employee.employeeNumber}-${employee.period}.pdf`

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('PAYEE 5', 105, 22, { align: 'center' })
  doc.setFontSize(11)
  doc.text('Employee Tax Certificate', 105, 30, { align: 'center' })
  doc.setLineWidth(0.4)
  doc.line(20, 38, 190, 38)

  doc.setFontSize(12)
  doc.text('Employer', 22, 50)
  doc.text('Employee', 22, 92)
  doc.text('Remuneration and deductions', 22, 146)

  doc.setFontSize(10)
  addRow(doc, 'Employer name', employee.employerName, 60)
  addRow(doc, 'Employer tax no.', employee.employerTaxNumber, 70)
  addRow(doc, 'Tax period', employee.period, 80)
  addRow(doc, 'Employee no.', employee.employeeNumber, 104)
  addRow(doc, 'Full name', employee.fullName, 114)
  addRow(doc, 'ID number', employee.idNumber, 124)
  addRow(doc, 'Tax number', employee.taxNumber, 134)
  addRow(doc, 'Gross pay', currency.format(employee.grossPay), 158)
  addRow(doc, 'Allowances', currency.format(employee.allowances), 168)
  addRow(doc, 'Taxable income', currency.format(employee.taxableIncome), 178)
  addRow(doc, 'Pension', currency.format(employee.pension), 188)
  addRow(doc, 'Medical aid', currency.format(employee.medicalAid), 198)
  addRow(doc, 'PAYE deducted', currency.format(employee.paye), 208)

  doc.setDrawColor(34, 49, 63)
  doc.rect(20, 220, 170, 28)
  doc.setFont('helvetica', 'bold')
  doc.text('Declaration', 24, 230)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'This Payee 5 certificate was generated from uploaded payroll data.',
    24,
    240,
  )
  doc.setFontSize(8)
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 20, 282)
  doc.save(fileName)
}

function ProtectedRoute({
  children,
  session,
}: {
  children: ReactNode
  session: Session | null
}) {
  if (!supabase) return <Navigate replace to="/login" />
  if (!session) return <Navigate replace to="/login" />

  return children
}

function LoginPage({ session }: { session: Session | null }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [status, setStatus] = useState('Use your Supabase account to continue.')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [navigate, session])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setStatus('Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.')
      return
    }

    setIsBusy(true)
    setStatus(mode === 'sign-in' ? 'Signing in...' : 'Creating account...')

    const response =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setIsBusy(false)

    if (response.error) {
      setStatus(response.error.message)
      return
    }

    setStatus(
      mode === 'sign-in'
        ? 'Signed in.'
        : 'Account created. Confirm your email if Supabase requires it.',
    )
    navigate('/', { replace: true })
  }

  return (
    <main className="grid min-h-svh place-items-center bg-base-200 px-4 py-8">
      <section className="card w-full max-w-md border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-base-content/60">
            Payee 5 payroll
          </p>
          <h1 className="text-4xl font-bold">
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </h1>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="form-control">
            <span className="label">
              <span className="label-text font-semibold">Email</span>
            </span>
            <input
              autoComplete="email"
              className="input input-bordered"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text font-semibold">Password</span>
            </span>
            <input
              autoComplete={
                mode === 'sign-in' ? 'current-password' : 'new-password'
              }
              className="input input-bordered"
              minLength={6}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={isBusy} type="submit">
            {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          className="btn btn-link w-fit px-0"
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        >
          {mode === 'sign-in'
            ? 'Create a new account'
            : 'Use an existing account'}
        </button>

        <div className="alert alert-info py-3 text-sm">{status}</div>
        </div>
      </section>
    </main>
  )
}

function AppLayout({
  children,
  session,
}: {
  children: ReactNode
  session: Session | null
}) {
  async function signOut() {
    await supabase?.auth.signOut()
  }

  return (
    <main className="min-h-svh bg-base-200 text-base-content">
      <nav className="navbar border-b border-base-300 bg-base-100 px-4 lg:px-[max(1rem,calc((100vw-1240px)/2))]">
        <div className="flex-1">
        <Link className="text-lg font-extrabold" to="/">
          Payee 5
        </Link>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-base-content/70">
          <span className="truncate">{session?.user.email}</span>
          <button className="btn btn-outline btn-sm" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </nav>
      {children}
    </main>
  )
}

function PayeeWorkspace({ session }: { session: Session }) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState('')
  const [status, setStatus] = useState('Upload an Excel payroll file to begin.')
  const [isBusy, setIsBusy] = useState(false)

  const selectedEmployee = useMemo(
    () =>
      employees.find(
        (employee) => employee.employeeNumber === selectedEmployeeNumber,
      ) ?? employees[0],
    [employees, selectedEmployeeNumber],
  )

  async function handleUpload(file: File | null) {
    if (!file) return

    setIsBusy(true)
    setStatus('Reading Excel file...')

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: '',
      })
      const parsed = rows.map(rowToEmployee)

      setEmployees(parsed)
      setSelectedEmployeeNumber(parsed[0]?.employeeNumber ?? '')
      setStatus(`Loaded ${parsed.length} employee record(s) from ${file.name}.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not read file.')
    } finally {
      setIsBusy(false)
    }
  }

  async function saveToSupabase() {
    if (!supabase) return

    setIsBusy(true)
    setStatus('Saving employee records to Supabase...')

    const { error } = await supabase
      .from('payee5_employees')
      .upsert(
        employees.map((employee) => toSupabaseRow(employee, session.user.id)),
        { onConflict: 'user_id,employee_number,period' },
      )

    setIsBusy(false)
    setStatus(error ? error.message : `Saved ${employees.length} record(s).`)
  }

  async function loadFromSupabase() {
    if (!supabase) return

    setIsBusy(true)
    setStatus('Loading records from Supabase...')

    const { data, error } = await supabase
      .from('payee5_employees')
      .select('*')
      .order('full_name', { ascending: true })

    setIsBusy(false)

    if (error) {
      setStatus(error.message)
      return
    }

    const loaded = (data ?? []).map(fromSupabaseRow)
    setEmployees(loaded)
    setSelectedEmployeeNumber(loaded[0]?.employeeNumber ?? '')
    setStatus(`Loaded ${loaded.length} employee record(s) from Supabase.`)
  }

  return (
    <section className="mx-auto max-w-[1240px] px-4 py-7">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-base-content/60">
            Payroll certificate generator
          </p>
          <h1 className="text-4xl font-bold">Payee 5</h1>
        </div>
        <div className="badge badge-outline badge-lg">Supabase Auth active</div>
      </header>

      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="card border border-base-300 bg-base-100 shadow-md">
          <div className="card-body">
          <h2 className="card-title">Upload payroll Excel</h2>
          <label className="grid min-h-28 cursor-pointer place-items-center rounded-lg border border-dashed border-base-content/30 bg-base-200 text-primary">
            <input
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              disabled={isBusy}
              type="file"
              onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
            />
            <span className="font-bold">Choose Excel file</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" disabled={!employees.length || isBusy} onClick={saveToSupabase}>
              Save to Supabase
            </button>
            <button className="btn btn-outline" disabled={isBusy} onClick={loadFromSupabase}>
              Load from Supabase
            </button>
          </div>
          <div className="alert alert-info py-3 text-sm">{status}</div>
          </div>
        </div>

        <div className="card border border-base-300 bg-base-100 shadow-md">
          <div className="card-body">
          <h2 className="card-title">Batch</h2>
          <div className="grid gap-1 text-base-content/70">
            <span className="text-5xl font-extrabold leading-none text-base-content">
              {employees.length}
            </span>
            <span>employee records</span>
          </div>
          <button
            className="btn btn-primary"
            disabled={!employees.length}
            onClick={() => employees.forEach((employee) => generatePayee5(employee))}
          >
            Generate all PDFs
          </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden border border-base-300 bg-base-100 shadow-md">
          <div className="flex items-center justify-between p-5">
            <h2 className="text-lg font-bold">Employees</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee no.</th>
                  <th>Period</th>
                  <th>PAYE</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr
                    className={
                      employee.employeeNumber === selectedEmployee?.employeeNumber
                        ? 'bg-primary/10'
                        : ''
                    }
                    key={`${employee.employeeNumber}-${employee.period}`}
                    onClick={() => setSelectedEmployeeNumber(employee.employeeNumber)}
                  >
                    <td>{employee.fullName}</td>
                    <td>{employee.employeeNumber}</td>
                    <td>{employee.period}</td>
                    <td>{currency.format(employee.paye)}</td>
                  </tr>
                ))}
                {!employees.length && (
                  <tr>
                    <td className="text-base-content/60" colSpan={4}>
                      No employee records loaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="card border border-base-300 bg-base-100 shadow-md">
          <div className="card-body">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="card-title">Payee 5 preview</h2>
            <button
              className="btn btn-primary btn-sm"
              disabled={!selectedEmployee}
              onClick={() => selectedEmployee && generatePayee5(selectedEmployee)}
            >
              Generate PDF
            </button>
          </div>
          {selectedEmployee ? (
            <div className="min-h-80 rounded-lg border border-base-300 bg-base-100 p-6">
              <p className="mb-5 text-center text-2xl font-extrabold">PAYEE 5</p>
              <dl className="grid gap-3">
                <dt className="text-xs font-extrabold uppercase text-base-content/60">
                  Employee
                </dt>
                <dd className="font-bold">{selectedEmployee.fullName}</dd>
                <dt className="text-xs font-extrabold uppercase text-base-content/60">
                  Tax number
                </dt>
                <dd className="font-bold">{selectedEmployee.taxNumber || '-'}</dd>
                <dt className="text-xs font-extrabold uppercase text-base-content/60">
                  Gross pay
                </dt>
                <dd className="font-bold">{currency.format(selectedEmployee.grossPay)}</dd>
                <dt className="text-xs font-extrabold uppercase text-base-content/60">
                  Taxable income
                </dt>
                <dd className="font-bold">
                  {currency.format(selectedEmployee.taxableIncome)}
                </dd>
                <dt className="text-xs font-extrabold uppercase text-base-content/60">
                  PAYE deducted
                </dt>
                <dd className="font-bold">{currency.format(selectedEmployee.paye)}</dd>
              </dl>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center rounded-lg border border-base-300 text-base-content/60">
              Select an employee to preview.
            </div>
          )}
          </div>
        </aside>
      </section>
    </section>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoadingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoadingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isLoadingSession) {
    return (
      <main className="grid min-h-svh place-items-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </main>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage session={session} />} />
      <Route
        path="/"
        element={
          <ProtectedRoute session={session}>
            <AppLayout session={session}>
              <PayeeWorkspace session={session as Session} />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
