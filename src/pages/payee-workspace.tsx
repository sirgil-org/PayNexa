import { useState, useMemo } from "react"
import { type Session } from '@supabase/supabase-js'
import { supabase } from "../supabase/supabase-client"
import type { EmployeeRecord } from "../types"
import { currency, fromSupabaseRow, generatePayee5, parseEmployeeRows, toSupabaseRow } from "../utils/fn"
import * as XLSX from 'xlsx'

export default function PayeeWorkspace({ session }: { session: Session }) {
  const currentYear = new Date().getFullYear()
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [yearAssessment, setYearAssessment] = useState(currentYear.toString())
  const [status, setStatus] = useState('Upload an Excel payroll file to begin.')
  const [isBusy, setIsBusy] = useState(false)

  const selectedEmployee = useMemo(
    () =>
      employees.find(
        (employee) => employee.employeeNumber === selectedEmployeeNumber,
      ) ?? employees[0],
    [employees, selectedEmployeeNumber],
  )

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) return employees

    return employees.filter((employee) =>
      [
        employee.fullName,
        employee.employeeNumber,
        employee.idNumber,
        employee.taxNumber,
        employee.period,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [employees, searchTerm])

  const yearOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => (currentYear - 10 + index).toString()).reverse(),
    [currentYear],
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
      const parsed = parseEmployeeRows(rows)

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
    setStatus('Saving employee records...')

    const { error } = await supabase
      .from('employees')
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
    setStatus('Opening saved employee records...')

    const { data, error } = await supabase
      .from('employees')
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
    setStatus(`Opened ${loaded.length} saved employee record(s).`)
  }

  return (
    <section className="mx-auto max-w-310 px-4 py-7">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-base-content/60">
            Payee Certificate
          </p>
          <h1 className="text-4xl font-bold">Payee 5</h1>
        </div>
        <fieldset className="fieldset w-full md:w-56">
          <legend className="fieldset-legend">Year Assessment</legend>
          <select
            className="select select-bordered w-full"
            value={yearAssessment}
            onChange={(event) => setYearAssessment(event.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </fieldset>
      </header>

      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="card border border-base-300 bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title">Upload payroll Excel</h2>
            <label className="grid min-h-28 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-base-content/30 bg-base-200 text-primary">
              <input
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                disabled={isBusy}
                type="file"
                onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
              />
              <svg className="size-10 text-base-content" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                <path d="M19 3L5 3C3.89543 3 3 3.89543 3 5L3 19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" stroke-Width="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7 7L17 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7 12L17 12" stroke="currentColor" stroke-Width="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7 17L13 17" stroke="currentColor" stroke-Width="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="font-bold text-base-content">Choose Excel file</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary" disabled={!employees.length || isBusy} onClick={saveToSupabase}>
                Save Employee Records
              </button>
              <button className="btn btn-outline" disabled={isBusy} onClick={loadFromSupabase}>
                Open Saved Records
              </button>
            </div>
            <div className="alert border-secondary/20 bg-secondary/10 py-3 text-sm text-base-content">{status}</div>
          </div>
        </div>

        <div className="card border border-base-300 bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title">Batch</h2>
            <div className="flex flex-col text-base-content/70 flex-auto h-auto">
              <span className="text-5xl font-extrabold leading-none text-base-content">
                {employees.length}
              </span>
              <span>employee records</span>
            </div>

            <button
              className="btn btn-primary my-auto"
              disabled={!employees.length}
              onClick={() => employees.forEach((employee) => generatePayee5(employee, yearAssessment))}
            >
              Generate all PDFs
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden border border-base-300 bg-base-100 shadow-md">
          <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold uppercase">Employees</h2>
            <label className="input input-bordered flex w-full items-center gap-2 md:max-w-sm">
              <input
                className="grow"
                placeholder="Search employees"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <span className="badge badge-ghost">
                {filteredEmployees.length}/{employees.length}
              </span>
            </label>
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
                {filteredEmployees.map((employee, index) => (
                  <tr
                    className={
                      employee.employeeNumber === selectedEmployee?.employeeNumber
                        ? 'bg-primary/25'
                        : ''
                    }
                    key={`${employee.employeeNumber}-${employee.period}-${index}`}
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
                {Boolean(employees.length) && !filteredEmployees.length && (
                  <tr>
                    <td className="text-base-content/60" colSpan={4}>
                      No employees match your search.
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
                onClick={() => selectedEmployee && generatePayee5(selectedEmployee, yearAssessment)}
              >
                Generate PDF
              </button>
            </div>
            {selectedEmployee ? (
              <div className="min-h-80 rounded-lg border border-base-300 bg-base-100 p-6">
                <p className="mb-5 text-center text-2xl font-extrabold">PAYEE 5</p>
                <dl className="grid gap-3">
                  <dt className="text-xs font-extrabold uppercase text-base-content/60">
                    Year Assessment
                  </dt>
                  <dd className="font-bold">{yearAssessment}</dd>
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
