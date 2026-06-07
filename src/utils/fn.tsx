import jsPDF from 'jspdf'
import type { EmployeeRecord, SupabaseEmployeeRow } from '../types'

const amountFormatter = new Intl.NumberFormat('en-NA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const currency = {
  format(value: number) {
    return `N$ ${amountFormatter.format(value)}`
  },
}

const DEFAULT_EMPLOYER_NAME = 'Namibia University of Science and Technology'

const headings = [
  ['employeeNumber', 'employee number', 'employee no', 'employee id', 'staff no', 'prefix no', 'prefix number', 'pre fix no'],
  ['employerFileNumber', 'er file identification no', 'employer file identification no'],
  ['initialsAndSurname', 'initials and surname', 'initial and surname', 'surname'],
  ['firstNames', 'first name', 'first names'],
  ['fullName', 'full name', 'employee name', 'name'],
  ['idNumber', 'id number', 'id no', 'national id'],
  ['taxNumber', 'tax number', 'tin', 'paye number', 'income tax no', 'income tax file identification no'],
  ['period', 'period', 'tax year', 'year', 'year of assessment'],
  ['employmentFrom', 'period of employment from', 'employment from', 'from'],
  ['employmentTo', 'period of employment to', 'employment to', 'to'],
  ['employerName', 'employer name', 'registered name of employer', 'company', 'company name'],
  ['employerTaxNumber', 'employer tax number', 'employer tin'],
  ['postalAddress1', 'postal address line 1'],
  ['postalAddress2', 'postal address line 2'],
  ['postalAddress3', 'postal address line 3'],
  ['residentialAddress1', 'residential address line 1'],
  ['residentialAddress2', 'residential address line 2'],
  ['residentialAddress3', 'residential address line 3'],
  ['salariesWages', 'salaries wages', 'salaries, wages', 'salary wages'],
  ['commission', 'commission'],
  ['freeHousing', 'tax values freehousing', 'tax value of free housing', 'free housing'],
  ['housingAllowance', 'tax value housing allowance', 'tax value of housing allowance', 'housing allowance'],
  ['mortgageBondSubsidies', 'mortgage bond subsidies'],
  ['entertainmentAllowance', 'entertainment allowance'],
  ['vehicleAllowance', 'vehicle allowance', 'vehicle subsidies'],
  ['companyVehicleTaxValue', 'tax value of company vehicles', 'tax value of company vehicle(s)'],
  ['travellingAllowance', 'travelling allowance', 'traveling allowance'],
  ['otherAllowance', 'other allowance', 'other allowance specify'],
  ['otherIncome', 'other income', 'other income specify'],
  ['grossPay', 'gross pay', 'gross salary', 'gross remuneration'],
  ['taxableIncome', 'taxable income', 'taxable remuneration'],
  ['paye', 'paye', 'payee', 'paye deducted', 'tax deducted', 'employee tax'],
  ['pension', 'pension', 'retirement', 'pension contribution', 'pension fund contribution'],
  ['totalDeductions', 'total deductions'],
  ['medicalAid', 'medical aid', 'medical'],
  ['allowances', 'allowances', 'benefits'],
  ['pensionFundName', 'pension fund name'],
  ['providentFundName', 'provident fund name'],
  ['providentFundContribution', 'provident fund contribution'],
  ['retirementFundName', 'retirement fund name'],
  ['retirementFundContribution', 'retirement fundcontribution', 'retirement fund contribution'],
  ['assuranceCompanyName', 'assurance co name', 'assurance company name'],
  ['assuranceContribution', 'assurance co contribution', 'assurance contribution'],
  ['spouse', 'spouse'],
] as const

type ParsedValues = Record<(typeof headings)[number][0], unknown>

export function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')
}

export function pickValue(row: Record<string, unknown>, aliases: readonly string[]) {
  const map = new Map(
    Object.entries(row).map(([key, value]) => [normaliseHeader(key), value]),
  )

  for (const alias of aliases) {
    const value = map.get(normaliseHeader(alias))
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }

  return ''
}

export function textValue(value: unknown) {
  const text = String(value ?? '').trim()
  return text === '-' ? '' : text
}

export function moneyValue(value: unknown) {
  const cleaned = String(value ?? '0').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function joinLines(...values: unknown[]) {
  return values.map(textValue).filter(Boolean).join('\n')
}

function formatExcelDate(value: unknown) {
  const text = textValue(value)
  if (!text) return ''

  const digits = text.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
  }

  if (digits.length === 7) {
    return `0${digits.slice(0, 1)}-${digits.slice(1, 3)}-${digits.slice(3)}`
  }

  return text
}

function assessmentPeriod(from: string, to: string, fallback: string) {
  if (from && to) return `${from} to ${to}`
  return fallback || new Date().getFullYear().toString()
}

function rowHasEmployee(values: ParsedValues) {
  return Boolean(
    textValue(values.employeeNumber) ||
      textValue(values.taxNumber) ||
      textValue(values.idNumber) ||
      textValue(values.initialsAndSurname) ||
      textValue(values.fullName),
  )
}

export function rowToEmployee(row: Record<string, unknown>, index: number): EmployeeRecord {
  const values = Object.fromEntries(
    headings.map(([field, ...aliases]) => [field, pickValue(row, aliases)]),
  ) as ParsedValues

  const employmentFrom = formatExcelDate(values.employmentFrom)
  const employmentTo = formatExcelDate(values.employmentTo)
  const firstNames = textValue(values.firstNames)
  const initialsAndSurname = textValue(values.initialsAndSurname)
  const fullName = textValue(values.fullName) || [firstNames, initialsAndSurname].filter(Boolean).join(' ')
  const allowances =
    moneyValue(values.allowances) ||
    moneyValue(values.commission) +
      moneyValue(values.freeHousing) +
      moneyValue(values.housingAllowance) +
      moneyValue(values.mortgageBondSubsidies) +
      moneyValue(values.entertainmentAllowance) +
      moneyValue(values.vehicleAllowance) +
      moneyValue(values.companyVehicleTaxValue) +
      moneyValue(values.travellingAllowance) +
      moneyValue(values.otherAllowance) +
      moneyValue(values.otherIncome)
  const grossPay = moneyValue(values.grossPay) || moneyValue(values.salariesWages) + allowances

  return {
    employeeNumber: textValue(values.employeeNumber) || `EMP-${index + 1}`,
    employerFileNumber: textValue(values.employerFileNumber),
    fullName: fullName || `Employee ${index + 1}`,
    initialsAndSurname,
    firstNames,
    idNumber: textValue(values.idNumber),
    taxNumber: textValue(values.taxNumber),
    period: assessmentPeriod(employmentFrom, employmentTo, textValue(values.period)),
    employmentFrom,
    employmentTo,
    employerName: textValue(values.employerName) || DEFAULT_EMPLOYER_NAME,
    employerTaxNumber: textValue(values.employerTaxNumber) || textValue(values.employerFileNumber),
    postalAddress: joinLines(values.postalAddress1, values.postalAddress2, values.postalAddress3),
    residentialAddress: joinLines(
      values.residentialAddress1,
      values.residentialAddress2,
      values.residentialAddress3,
    ),
    salariesWages: moneyValue(values.salariesWages),
    commission: moneyValue(values.commission),
    freeHousing: moneyValue(values.freeHousing),
    housingAllowance: moneyValue(values.housingAllowance),
    mortgageBondSubsidies: moneyValue(values.mortgageBondSubsidies),
    entertainmentAllowance: moneyValue(values.entertainmentAllowance),
    vehicleAllowance: moneyValue(values.vehicleAllowance),
    companyVehicleTaxValue: moneyValue(values.companyVehicleTaxValue),
    travellingAllowance: moneyValue(values.travellingAllowance),
    otherAllowance: moneyValue(values.otherAllowance),
    otherIncome: moneyValue(values.otherIncome),
    grossPay,
    taxableIncome: moneyValue(values.taxableIncome) || grossPay,
    paye: moneyValue(values.paye),
    pension: moneyValue(values.pension),
    totalDeductions: moneyValue(values.totalDeductions) || moneyValue(values.pension),
    medicalAid: moneyValue(values.medicalAid),
    allowances,
    pensionFundName: textValue(values.pensionFundName),
    providentFundName: textValue(values.providentFundName),
    providentFundContribution: moneyValue(values.providentFundContribution),
    retirementFundName: textValue(values.retirementFundName),
    retirementFundContribution: moneyValue(values.retirementFundContribution),
    assuranceCompanyName: textValue(values.assuranceCompanyName),
    assuranceContribution: moneyValue(values.assuranceContribution),
    spouse: textValue(values.spouse),
    source: 'upload',
  }
}

export function parseEmployeeRows(rows: Record<string, unknown>[]) {
  return rows
    .map((row, index) => {
      const values = Object.fromEntries(
        headings.map(([field, ...aliases]) => [field, pickValue(row, aliases)]),
      ) as ParsedValues

      return rowHasEmployee(values) ? rowToEmployee(row, index) : null
    })
    .filter((employee): employee is EmployeeRecord => Boolean(employee))
}

export function toSupabaseRow(
  employee: EmployeeRecord,
  userId: string,
): SupabaseEmployeeRow {
  return {
    user_id: userId,
    employee_number: employee.employeeNumber,
    employer_file_number: employee.employerFileNumber,
    full_name: employee.fullName,
    initials_and_surname: employee.initialsAndSurname,
    first_names: employee.firstNames,
    id_number: employee.idNumber,
    tax_number: employee.taxNumber,
    period: employee.period,
    employment_from: employee.employmentFrom,
    employment_to: employee.employmentTo,
    employer_name: employee.employerName,
    employer_tax_number: employee.employerTaxNumber,
    postal_address: employee.postalAddress,
    residential_address: employee.residentialAddress,
    salaries_wages: employee.salariesWages,
    commission: employee.commission,
    free_housing: employee.freeHousing,
    housing_allowance: employee.housingAllowance,
    mortgage_bond_subsidies: employee.mortgageBondSubsidies,
    entertainment_allowance: employee.entertainmentAllowance,
    vehicle_allowance: employee.vehicleAllowance,
    company_vehicle_tax_value: employee.companyVehicleTaxValue,
    travelling_allowance: employee.travellingAllowance,
    other_allowance: employee.otherAllowance,
    other_income: employee.otherIncome,
    gross_pay: employee.grossPay,
    taxable_income: employee.taxableIncome,
    paye: employee.paye,
    pension: employee.pension,
    total_deductions: employee.totalDeductions,
    medical_aid: employee.medicalAid,
    allowances: employee.allowances,
    pension_fund_name: employee.pensionFundName,
    provident_fund_name: employee.providentFundName,
    provident_fund_contribution: employee.providentFundContribution,
    retirement_fund_name: employee.retirementFundName,
    retirement_fund_contribution: employee.retirementFundContribution,
    assurance_company_name: employee.assuranceCompanyName,
    assurance_contribution: employee.assuranceContribution,
    spouse: employee.spouse,
  }
}

export function fromSupabaseRow(row: SupabaseEmployeeRow): EmployeeRecord {
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    employerFileNumber: row.employer_file_number ?? '',
    fullName: row.full_name,
    initialsAndSurname: row.initials_and_surname ?? '',
    firstNames: row.first_names ?? '',
    idNumber: row.id_number,
    taxNumber: row.tax_number,
    period: row.period,
    employmentFrom: row.employment_from ?? '',
    employmentTo: row.employment_to ?? '',
    employerName: row.employer_name,
    employerTaxNumber: row.employer_tax_number,
    postalAddress: row.postal_address ?? '',
    residentialAddress: row.residential_address ?? '',
    salariesWages: row.salaries_wages ?? 0,
    commission: row.commission ?? 0,
    freeHousing: row.free_housing ?? 0,
    housingAllowance: row.housing_allowance ?? 0,
    mortgageBondSubsidies: row.mortgage_bond_subsidies ?? 0,
    entertainmentAllowance: row.entertainment_allowance ?? 0,
    vehicleAllowance: row.vehicle_allowance ?? 0,
    companyVehicleTaxValue: row.company_vehicle_tax_value ?? 0,
    travellingAllowance: row.travelling_allowance ?? 0,
    otherAllowance: row.other_allowance ?? 0,
    otherIncome: row.other_income ?? 0,
    grossPay: row.gross_pay,
    taxableIncome: row.taxable_income,
    paye: row.paye,
    pension: row.pension,
    totalDeductions: row.total_deductions ?? row.pension,
    medicalAid: row.medical_aid,
    allowances: row.allowances,
    pensionFundName: row.pension_fund_name ?? '',
    providentFundName: row.provident_fund_name ?? '',
    providentFundContribution: row.provident_fund_contribution ?? 0,
    retirementFundName: row.retirement_fund_name ?? '',
    retirementFundContribution: row.retirement_fund_contribution ?? 0,
    assuranceCompanyName: row.assurance_company_name ?? '',
    assuranceContribution: row.assurance_contribution ?? 0,
    spouse: row.spouse ?? '',
    source: 'supabase',
  }
}

function fileSafePart(value: string, fallback: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || fallback
}

type CellOptions = {
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  fill?: string
  fontSize?: number
  textColor?: string
  valign?: 'top' | 'middle'
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function drawCell(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string | string[],
  options: CellOptions = {},
) {
  const padding = 1.5
  const lines = Array.isArray(text)
    ? text
    : doc.splitTextToSize(text || '', width - padding * 2)

  if (options.fill) {
    doc.setFillColor(...hexToRgb(options.fill))
    doc.rect(x, y, width, height, 'F')
  }

  doc.setDrawColor(27, 154, 170)
  doc.setLineWidth(0.25)
  doc.rect(x, y, width, height)
  doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
  doc.setFontSize(options.fontSize ?? 7.4)

  if (options.textColor) {
    doc.setTextColor(...hexToRgb(options.textColor))
  } else {
    doc.setTextColor(18, 63, 69)
  }

  const lineHeight = (options.fontSize ?? 7.4) * 0.36
  const textHeight = lines.length * lineHeight
  const startY =
    options.valign === 'middle'
      ? y + (height - textHeight) / 2 + lineHeight * 0.8
      : y + padding + lineHeight
  const textX =
    options.align === 'center'
      ? x + width / 2
      : options.align === 'right'
        ? x + width - padding
        : x + padding

  doc.text(lines, textX, startY, {
    align: options.align ?? 'left',
    baseline: 'alphabetic',
  })
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number, width: number) {
  drawCell(doc, x, y, width, 6, title.toUpperCase(), {
    bold: true,
    fill: '#1b9aaa',
    fontSize: 7.8,
    textColor: '#ffffff',
  })
}

function moneyOrDots(value: number) {
  return value ? currency.format(value).replace('N$ ', '') : ''
}

export function generatePayee5(employee: EmployeeRecord, yearAssessment = employee.period) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const safeName = fileSafePart(employee.fullName, 'Employee')
  const safeEmployeeNumber = fileSafePart(employee.employeeNumber, 'No-Number')
  const safePeriod = fileSafePart(yearAssessment, 'No-Period')
  const fileName = `Payee-5-${safeName}-${safeEmployeeNumber}-${safePeriod}.pdf`
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Republic of Namibia - Ministry of Finance', pageWidth / 2, 12, { align: 'center' })
  doc.setFontSize(16)
  doc.text("Employee's Tax Certificate", pageWidth / 2, 21, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`Year of Assessment: ${yearAssessment}`, pageWidth / 2, 29, { align: 'center' })
  
  
  drawSectionTitle(doc, 'Employer Details', 14, 37, 182)
  drawCell(doc, 14, 43, 70, 8, 'Registered Name of Employer', { bold: true })
  drawCell(doc, 84, 43, 112, 8, employee.employerName)
  drawCell(doc, 14, 51, 70, 8, "Employer's File Identification Number", { bold: true })
  drawCell(doc, 84, 51, 112, 8, employee.employerFileNumber || employee.employerTaxNumber)

  drawSectionTitle(doc, 'Employee Details', 14, 64, 182)
  drawCell(doc, 14, 70, 55, 10, 'INCOME TAX FILE IDENTIFICATION NO.', {
    bold: true,
    fontSize: 6.7,
  })
  drawCell(doc, 69, 70, 35, 10, employee.taxNumber)
  drawCell(
    doc,
    104,
    70,
    92,
    10,
    "EMPLOYEE'S INCOME TAX FILE IDENTIFICATION NUMBERS ARE MANDATORY WHEN SUBMITTING PAYE FORMS",
    { bold: true, fontSize: 6.2 },
  )

  const employeeRows: Array<[string, string, number?]> = [
    ['INITIAL AND SURNAME', employee.initialsAndSurname || employee.fullName, 7],
    ['FIRST NAMES: SELF', employee.firstNames, 7],
    ['INITIALS: SPOUSE', employee.spouse, 7],
    ['I.D. NO.: SELF', employee.idNumber, 7],
    ['POSTAL ADDRESS', employee.postalAddress, 14],
    ['RESIDENTIAL ADDRESS', employee.residentialAddress, 14],
  ]
  let detailY = 80
  employeeRows.forEach(([label, value, height = 7]) => {
    drawCell(doc, 14, detailY, 55, height, label, { bold: true })
    drawCell(doc, 69, detailY, 127, height, value)
    detailY += height
  })
  drawCell(doc, 14, detailY, 55, 10, 'PERIOD EMPLOYED', { bold: true })
  drawCell(doc, 69, detailY, 31, 10, 'FROM: DD-MM-YYYY', { bold: true, fontSize: 6.2 })
  drawCell(doc, 100, detailY, 33, 10, employee.employmentFrom)
  drawCell(doc, 133, detailY, 28, 10, 'TO: DD-MM-YYYY', { bold: true, fontSize: 6.2 })
  drawCell(doc, 161, detailY, 35, 10, employee.employmentTo)

  const tableY = detailY + 16
  drawSectionTitle(doc, 'Benefits and Remunerations', 14, tableY, 91)
  drawSectionTitle(doc, 'Deductions', 105, tableY, 91)

  const rowHeight = 7
  const benefitLabelW = 56
  const benefitAmountW = 35
  const deductionNameW = 36
  const deductionRegW = 37
  const deductionAmountW = 18
  const benefits = [
    ['Salaries, wages', employee.salariesWages],
    ['Commission', employee.commission],
    ['Tax value of free housing', employee.freeHousing],
    ['Tax value of housing allowance', employee.housingAllowance],
    ['Mortgage bond subsidies', employee.mortgageBondSubsidies],
    ['Entertainment allowance', employee.entertainmentAllowance],
    ['Vehicle subsidies', employee.vehicleAllowance],
    ['Tax Value of Company vehicle(s)', employee.companyVehicleTaxValue],
    ['Travelling allowance', employee.travellingAllowance],
    ['Other allowance (specify)', employee.otherAllowance],
    ['Other income (specify)', employee.otherIncome],
    ['Tax value of subsidised Loans (specify)', 0],
    ['Pension/Provident Fund Refunds (specify)', 0],
  ] as const
  const deductions = [
    ['Pension Fund Name', 'Registration No.', employee.pension],
    ['', '', 0],
    ['', '', 0],
    ['Provident Fund Name', 'Registration No.', employee.providentFundContribution],
    ['', '', 0],
    ['', '', 0],
    ['Retirement Fund Name', 'Registration No.', employee.retirementFundContribution],
    ['', '', 0],
    ['', '', 0],
    ['', '', 0],
    ['Assurance Co. Name', 'Study Policy No.', employee.assuranceContribution],
    ['', '', 0],
    ['', '', 0],
  ] as const

  benefits.forEach(([label, amount], index) => {
    const y = tableY + 6 + rowHeight * index
    drawCell(doc, 14, y, benefitLabelW, rowHeight, label)
    drawCell(doc, 70, y, benefitAmountW, rowHeight, moneyOrDots(amount), {
      align: 'right',
      textColor: amount ? '#123f45' : '#ef476f',
    })

    const [deductionName, registration, deductionAmount] = deductions[index]
    drawCell(doc, 105, y, deductionNameW, rowHeight, deductionName, {
      textColor: deductionName ? '#123f45' : '#06d6a0',
    })
    drawCell(doc, 141, y, deductionRegW, rowHeight, registration, {
      textColor: registration ? '#123f45' : '#06d6a0',
    })
    drawCell(doc, 178, y, deductionAmountW, rowHeight, moneyOrDots(deductionAmount), {
      align: 'right',
      textColor: deductionAmount ? '#123f45' : '#06d6a0',
    })
  })

  const totalY = tableY + 6 + rowHeight * benefits.length
  drawCell(doc, 14, totalY, benefitLabelW, 8, 'Gross Remuneration', { bold: true })
  drawCell(doc, 70, totalY, benefitAmountW, 8, moneyOrDots(employee.grossPay), {
    align: 'right',
    bold: true,
    textColor: '#ef476f',
  })
  drawCell(doc, 105, totalY, deductionNameW + deductionRegW, 8, 'TOTAL DEDUCTIONS', { bold: true })
  drawCell(doc, 178, totalY, deductionAmountW, 8, moneyOrDots(employee.totalDeductions), {
    align: 'right',
    bold: true,
    textColor: '#06d6a0',
  })
  drawCell(doc, 105, totalY + 8, deductionNameW + deductionRegW, 8, 'PAYE DEDUCTED', { bold: true })
  drawCell(doc, 178, totalY + 8, deductionAmountW, 8, moneyOrDots(employee.paye), {
    align: 'right',
    bold: true,
    textColor: '#1b9aaa',
  })
  drawCell(
    doc,
    105,
    totalY + 16,
    91,
    12,
    'Attach this certificate to your income tax return or retain it if not required to render a return.',
    { fontSize: 7 },
  )

  doc.save(fileName)
}
