# ERP üçün «Əmək haqqı» modulu: prompt-spesifikasiya (JobMatch-dakı real məntiqə əsaslanır)

**Bu fayl nədir.** JobMatch platformasındakı əmək haqqı hesablanmasının (kod: `lib/payroll-calc.ts`, `lib/salary.ts`, `lib/hr-calc.ts`, `lib/payroll-check.ts`) necə işlədiyini başqa bir proqramda (ERP) təkrar yaratmaq üçün prompt-a çevrilmiş təsviridir. Aşağıdakı «PROMPT» bölməsini ERP-nin AI köməkçisinə və ya proqramçısına olduğu kimi verə bilərsiniz.

**İstifadə qaydası**
1. «PROMPT» hissəsini (ən aşağıdakı xəttdən sonrakı mətn) kopyalayın. Mətn ingilis dilindədir, çünki AI vasitələri belə daha dəqiq işləyir; qanun maddələri və Azərbaycan terminləri saxlanılıb.
2. ERP-nin öz obyektlərini (işçi kartı, tabel, baş kitab, bank sənədi) mətnin sonundakı «ERP mapping» sətirlərinə yazın.
3. Nəticəni mütləq **16-cı bölmədəki test vektorları** ilə yoxlayın: rəqəmlər bir qəpik belə fərqlənməməlidir.
4. Faizlər və hədlər **2026-cı il** üçündür (mənbə: Vergilər Nazirliyinin 2026 cədvəli, Əmək və Vergi Məcəllələri). Qanun dəyişdikdə dəyişən yer yalnız parametr dəstidir (2-ci bölmə). Hesablamanın doğruluğunu ERP-yə buraxmazdan əvvəl mühasib və ya hüquqşünas təsdiqləməlidir: bu mətn hüquqi məsləhət deyil.

**Nə bilərəkdən yoxdur.** Rəsmi e-taxes bəyannamə formatı, sığorta müavinətinin sığortaçı tərəfindən real ödənilməsi (modul yalnız hesablayır), ödəniş provayderi ilə inteqrasiya.

---

# PROMPT (ERP-yə verilən hissə)

You are a senior ERP payroll engineer. Build a **monthly payroll (Əmək haqqı) module for Azerbaijan** (currency AZN, Labor Code "Əmək Məcəlləsi" and Tax Code "Vergi Məcəlləsi", state social insurance DSMF). The specification below is derived from a working, tested implementation; reproduce its behaviour exactly, including rounding. First ask me (briefly) about any ERP-specific unknown (which objects to reuse: employee master, timesheet, general ledger, bank documents), then deliver: (a) data model, (b) calculation service, (c) month lifecycle and controls, (d) screens/reports, (e) automated tests that reproduce section 16.

## 0. Principles
- All money in AZN, calculated with floating point and **rounded to 2 decimals (round half up, `round(x*100)/100` with epsilon)** at the end of each line or component. Never round intermediate daily values.
- Calculation is a **pure function** of: employee profile, day statuses of the month, one-off inputs, parameter set in force. Same inputs → same result. A month that is approved is stored as a **frozen snapshot** and never recalculated.
- Every pay line carries a **legal article reference** (shown on the pay slip).
- Tax/insurance rates live in an **effective-dated parameter set** (section 2.3); a calculation for a given month uses the set in force on the first day of that month. Never hard-code rates in the calculation code.

## 1. Master data
**Employee payroll profile** (read from the HR employee card): id, full name, FIN (personal id; match employees by FIN when importing), hire date, end date, monthly salary and `salary_type` (`gross` or `net`), `sector` (`private` = non-state non-oil; `public` = state and oil-and-gas), weekly hours (40, 36 or 24), `tax_reduction` (monthly amount that reduces taxable income: disability and other Tax Code 102.1-1…102.5 reliefs; only income tax changes), pay method (bank/cash), IBAN or card, status (active, leave, left).
If `salary_type = net`, the gross is found from the net by bisection: monotone function, `lo = net`, `hi = max(net*2, 100)`, 80 iterations on `calculateFromGross(mid).net < net`, result = `calculateFromGross(hi)`.

**Company payroll settings:** `advance_day` (0 = no advance), `pay_day`, `dual_threshold` (amount above which a bank batch needs two approvers), bank accounts (IBAN, bank code, SWIFT, VÖEN, currency, default flag), cost-centre / branch split rules.

**Production calendar** (official working-day calendar, per year): each date is `""` (working), `weekend`, `holiday`, `transfer` (moved day off) or `company` (company-specific day off). The month's **working days** = dates with `""`.

**Absence codes** → day status (section 4).

## 2. Tax and insurance parameter set (effective-dated)
### 2.1 Structure
`TaxParams { effectiveFrom (date), note, taxFreeAmount, taxFreeLimit, minimumWage, incomeTax{private[],public[]}, social{private{employee[],employer[]}, public{employee[],employer[]}}, unemployment{employee,employer}, medical[] }`.
A **bracket scale** is a list of `{upTo|null, rate}`; the last row has `upTo = null` (no limit). Validation when an admin saves a set: valid date, `upTo` strictly ascending, last row unlimited, rates 0–60 %, `minimumWage > 0`. A set added later with the same `effectiveFrom` replaces the older one. The set for a date = the latest set whose `effectiveFrom <= date` (the earliest set if the date precedes all).

### 2.2 Progressive scale function
`scale(amount, brackets)`: `from = 0; sum = 0; for b in brackets: to = b.upTo ?? ∞; sum += max(0, min(amount, to) - from) * b.rate; from = to; if amount <= to: break`.

### 2.3 Default set effective 2026-01-01
- `taxFreeAmount = 200`, `taxFreeLimit = 2500` (Tax Code 102.1.6: for the **main workplace**, 200 AZN of monthly income is exempt when gross ≤ 2 500).
- `minimumWage = 400`.
- **Income tax, private sector:** up to 2 500 → 3 %; 2 500–8 000 → 10 %; above 8 000 → 14 %. **Public/oil-gas:** up to 2 500 → 14 %; above → 25 %.
- **DSMF private:** employee 3 % up to 200, 10 % from 200 up; employer 22 % up to 200, 15 % from 200 to 8 000, 11 % above 8 000. **DSMF public/oil-gas:** employee 3 %, employer 22 % of the whole gross.
- **Unemployment insurance:** 0.5 % employee, 0.5 % employer, of the whole gross.
- **Compulsory medical insurance** (each side): 2 % up to 8 000, 0.5 % above.

## 3. Net-from-gross algorithm (`calculateFromGross(gross, sector, {reduction, asOf})`)
1. `gross = max(0, gross)`, `reduction = max(0, reduction)`.
2. `taxable = max(0, gross − reduction − (gross <= taxFreeLimit ? taxFreeAmount : 0))`.
3. `incomeTax = scale(taxable, incomeTax[sector])`.
4. `employeeSocial = scale(gross, social[sector].employee)`; `employeeMedical = scale(gross, medical)`; `employeeUnemployment = gross * unemployment.employee`.
5. Employer side the same way (`social[sector].employer`, medical, `unemployment.employer`). Insurance is on the **whole gross**; the reduction affects only income tax.
6. `deductions = incomeTax + employeeSocial + employeeUnemployment + employeeMedical`; `net = gross − deductions`; `employerContributions = employerSocial + employerUnemployment + employerMedical`; `employerCost (super-gross) = gross + employerContributions`.
7. Round each reported figure to 2 decimals at the very end.

## 4. Day statuses (one per working day of the month)
Status of a working day from the attendance/leave code:
- `outside` — before hire or after leaving (not part of the norm).
- `work` — empty code, `work`, `remote`, `trip`, `training`.
- `paid` — fully paid by the employer: `annual`, `addleave`, `study`, `creative`, `donor`, `medical`, `summons`, `military`.
- `twothirds` — `downtime` without employee fault (Labor Code 169): 2/3 of salary.
- `benefit` — paid by social insurance, **not** by payroll: `maternity`, `childcare`, `paternity`, `sick`, `injury`.
- `unpaid` — everything else (unpaid leave, permission, family, suspension, absent).
Vacation codes (`annual`, `addleave`, `creative`) are paid from the 12-month **average** (section 6), not from the monthly salary share.
Weights for the advance: work 1, paid 1, twothirds 2/3, others 0.

## 5. Monthly pay calculation (`computePay`)
Inputs: `monthlySalary` (gross for the full norm), `statuses[]` (one per working day **including** `outside` days; `total = statuses.length`), `weekHours`, `sector`, `taxReduction`, one-off inputs (below), `annual` (vacation data), `leaveCompensation`, `insured` (benefit data), `advances`.
- `normDays` = count of statuses ≠ `outside`. `dailyHours = 8` for a 40-h week, else `weekHours / 5`.
- `perDay = salary / total`. `hourly = salary / (total × dailyHours)`.
- Counts: `worked`, `paidLeave`, `downtime`, `benefit`, `unpaid`; `vacationCounted` = paid days marked as vacation; `otherPaid = paidLeave − vacationCounted`.
**Pay lines** (add a line only if its amount > 0; each rounded to 2 decimals; id and article in brackets):
1. `worked`: `perDay × worked` (Əmək M. 154, 171).
2. `paid-leave`: `perDay × otherPaid` (139, 179).
3. `vacation`: `(averageMonthly / 30.4) × vacationCalendarDays × (vacationCounted / vacationTotal)` (140). Section 6.
4. `downtime`: `perDay × downtime × 2/3` (169).
5. `leave-compensation` (on termination): `(averageMonthly / 30.4) × unusedLeaveDays` (143). Needs the leave ledger.
6. `overtime`: `hourly × 2 × overtimeHours` (165).
7. `rest-day` (work on rest/holiday): `hourly × (withinNorm ? 1 : 2) × restDayHours` (164).
8. `night`: `hourly × nightPercent × nightHours / 100` (166).
9. `allowance`: named allowances total (157). 10. `bonus`: named bonuses total (157.6).
`gross = round2(sum of lines)`. Then taxes from section 3 on this gross (with the month's parameter set).
**Other deductions** (loan, damage, writ, alimony …): each has `kind`: `general` (cap 20 % of net), `writ` (50 %), `alimony` (70 %) (Labor Code 175–176). The month's cap share = the **highest** cap among the deductions present; `room = round2(net × share)`; apply deductions **in the entered order**: `applied = min(amount, room); room −= applied`. The unapplied rest is **carried to the next month** (a carry record) and a note is added.
**Result fields:** `net`, `otherDeductions[{amount, applied}]`, `advances`, `afterDeductions = net − Σapplied`, `toPay = max(0, afterDeductions − advances)`, `advanceExcess = max(0, advances − afterDeductions)` (to be taken back), `employerCost`, notes.

## 6. Vacation pay and average earnings
- Average monthly earnings (Labor Code 140): the **last 12 calendar months** before the vacation month, sum / number of months (fewer than 12 if the employee worked fewer full months). Only pay-system earnings count (salary, allowances, bonuses); one-off payments outside the pay system do not. Months not fully worked for reasons beyond the employee's will are handled per 140.
- Daily rate = `averageMonthly / 30.4` (30.4 = yearly mean of calendar days per month, art. 140.3).
- **Vacation calendar days inside a month:** each marked working day counts 1; each weekend or company day off **between two marked vacation working days** counts 1; official holidays do not count (the vacation is extended by them).
- Vacation lines are paid from the average; the remaining paid days from `perDay`.

## 7. Sickness / maternity benefit (paid through social insurance, not in gross)
- `calculated = (averageMonthly / 30.4) × (percent / 100) × calendarDays` (sick 100 %, maternity 100 % in the implementation; percent is a setting).
- Not payable without **6 months of insurance record** (Sosial Sığorta Qanunu md. 6). Cap per month = **25 × minimum pension** (`BENEFIT_CAP_FACTOR = 25`); `amount = eligible === false ? 0 : min(calculated, cap)`.
- Show it on the pay slip as information; the e-sickness certificate number (e-bülleten) is stored with the input. The insurer pays; payroll only calculates and records receipt.

## 8. Advance and payment dates
- **Available advance on day D** = `round2(net_of_full_month × share) − alreadyPaidAdvance` (min 0), where `share = Σ weight(status of days 1..D) / Σ weight(all days)` and the month is calculated **as if the remaining days were worked** (`asOf` mode).
- **Payment date** for (year, month, day): clamp the day to the month length, and if the date is a weekend or an official day off, move it **back** to the previous working day, up to 10 steps (Labor Code 172.3).
- **Schedule check:** if an advance day is set, `pay_day` must be after it and the gap must be **≤ 16 days** (Labor Code 172.1).

## 9. Month lifecycle (controls)
States of a payroll month: **open** (calculated live from current data) → **approved** (a full snapshot of every employee's result is stored; approver and time recorded; inputs are locked) → can be **reopened** with a reason (snapshot dropped, audit entry). Payments are recorded against the month.
**Checks before approval** (show errors / warnings / info; errors block approval):
- error: salary missing; advance exceeds what is due; bank method but no IBAN or card.
- warn: no working/paid day at all in the month; amount to pay is zero; gross changed ≥ 20 % against the previous month **while the salary stayed the same** (a mistyped bonus or missed leave mark).
- info: new employee; employee missing vs previous month (left); salary changed; ≥ 5 unpaid days.
- close-out list: previous month approved, tax parameters confirmed for the year by the accountant, no check errors, every employee has a salary.
**Accountant tax confirmation:** the parameter set for the year must be confirmed (who, when) before the first approval of the year.
**Permissions:** viewing salaries, editing inputs, approving, paying, reopening are separate rights; every view of salaries is written to a view log.

## 10. Inputs
Per employee per month: bonus (named lines), allowance (named lines), overtime hours, rest-day hours (+ within-norm flag), night hours and percent, deductions (label, amount, kind), note, benefit document number. **Recurring items** (type bonus/allowance/deduction, from-month, to-month) are added automatically each month. **Carry** records from capped deductions are added to the next month's deductions. Bulk import from a multi-sheet workbook (employees by FIN, leave ranges → timesheet, additions/deductions, hours, business trips, advances with a payment date, salary-change orders) is supported; an imported advance with a date becomes a payment record, a row without a date is an already recorded advance and is not written again; an approved month is never overwritten.

## 11. Payments and bank
**Payment ledger:** record per employee/month: `kind` (advance, salary, vacation, benefit, other), amount, date, method, note, created by; a payment can be **reversed** (reason, who, when) but never deleted silently. Balance per employee = to-pay − Σ payments.
**Bank batch** (payment file for the bank): created from selected payments/employees for a company bank account → states `draft → approved → sent → paid`, plus `revert` and `cancel`. When the batch total exceeds `dual_threshold`, **two different approvers** are required. The file is generated in the bank's format (IBAN, name, amount, purpose). Employees without IBAN/card are skipped and listed. **Reconciliation** matches the bank statement to batch items.

## 12. Outputs
- **Pay slip** (per employee per month; the employee sees only their own): worked/norm days, each pay line with amount and article, gross, income tax, DSMF, unemployment, medical, net, other deductions applied (and carried), advances, amount to pay, benefit information, notes, employer-side contributions (hidden from the employee if policy says so).
- **Payroll register** (all employees, totals), **bank register**, **employer cost report** (super-gross), **annual totals** per employee (gross, income tax, employee insurance, net of approved months only; unapproved months are excluded and the report says so), **variance vs previous month**, **budget vs actual** per month, **branch split** (salary and bonus shared across branches by rule).
- **Accounting journal export** (1C or the ERP ledger) with a configurable account map. Suggested postings per approved month (adapt to the chart of accounts, confirm with the accountant): Dr salary expense (gross) / Cr payables to employees (net + advances logic), Cr income tax payable, Cr DSMF payable (employee), Cr unemployment and medical payable (employee); Dr employer social contribution expense / Cr DSMF, unemployment and medical payable (employer); payments: Dr payables to employees / Cr bank.

## 13. Data model (suggested tables, adapt to the ERP)
`tax_param_sets`, `production_calendar_days`, `payroll_settings`, `payroll_runs(company, month, status, snapshot, approved_by, approved_at)`, `payroll_inputs(company, month, employee, data)`, `payroll_recurring`, `payroll_carry`, `payroll_payments(employee, month, kind, amount, paid_on, method, reversed_at, reverse_reason, batch_id)`, `payroll_bank_accounts`, `payroll_batches(month, kind, account, status, total, items, approvals)`, `payroll_budgets(month, amount)`, `audit_log`. Money may be stored in qəpik (integer cents) in tables and converted to AZN for display.

## 14. Edge cases that must be handled
Employee hired or leaving mid-month (`outside` days reduce the norm, not the pay per day); zero working days; net-type salary; sector `public`; `reduction > gross`; gross exactly 2 500 vs 2 500.01 (the exemption disappears just above 2 500); advance larger than due; deductions above the cap; vacation spanning two months (split by marked days); month without a production calendar (refuse, do not guess); a parameter set that takes effect in the middle of a year (months use their own set).

## 15. Out of scope (state clearly in the UI)
E-taxes declaration format, real payment of sickness/maternity benefit by the insurer, payment provider integration.

## 16. Test vectors (the module must reproduce these exactly; 2026 default set)
**Taxes (`calculateFromGross`):**
| gross | sector | reduction | income tax | employee DSMF | unemployment | medical | **net** | employer DSMF | er. unemp. | er. medical | **employer cost** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1000 | private | 0 | 24 | 86 | 5 | 20 | **865** | 164 | 5 | 20 | **1189** |
| 3200 | private | 0 | 145 | 306 | 16 | 64 | **2669** | 494 | 16 | 64 | **3774** |
| 9000 | private | 0 | 765 | 886 | 45 | 165 | **7139** | 1324 | 45 | 165 | **10534** |
| 3000 | public | 0 | 475 | 90 | 15 | 60 | **2360** | 660 | 15 | 60 | **3735** |
| 1500 | private | 400 | 27 | 136 | 7.5 | 30 | **1299.5** | 239 | 7.5 | 30 | **1776.5** |
| 200 | private | 0 | 0 | 6 | 1 | 4 | **189** | 44 | 1 | 4 | **249** |
| 2500 | private | 0 | 69 | 236 | 12.5 | 50 | **2132.5** | 389 | 12.5 | 50 | **2951.5** |
| 2500.01 | private | 0 | 75 | 236 | 12.5 | 50 | **2126.51** | 389 | 12.5 | 50 | **2951.51** |
Net 2000 (private) → gross **2343.19**.

**Monthly pay (22 working days in the month):**
- P1 salary 1500, 20 worked + 2 unpaid: `worked 1363.64`; gross 1363.64; income tax 34.91; net **1172.28**; to pay 1172.28; hourly 8.52.
- P2 salary 1500, 22 worked, overtime 5 h, rest-day 8 h (not within norm → ×2), night 10 h at 40 %, bonus 100, allowance 50, general deduction 600, advance 400: lines overtime 85.23, rest-day 136.36, night 34.09, allowance 50, bonus 100; gross **1905.68**; income tax 51.17; net **1630.30**; deduction applied **326.06** (20 % of net, the rest 273.94 carried); to pay **904.24**.
- P3 salary 1200, 17 worked + 5 downtime: worked 927.27 + downtime 181.82 = gross **1109.09**; income tax 27.27; net **957.18**.
- P4 salary 1500, first 10 working days vacation (14 calendar days, 12-month average 1450), 12 worked: worked 818.18 + vacation 667.76 = gross **1485.94**; income tax 38.58; net **1275.62**.
- P5 salary 1500, 17 worked + 5 sick days (benefit): gross **1159.09**; net 999.43; benefit (average 1450, 100 %, 7 calendar days) **333.88**, not in gross.
- Advance: salary 1500, 22 days all worked, day 10, nothing paid before → earned/available **585.23** (share 0.4545).
- Parameter set change: add a set effective 2027-01-01 with medical flat 3 %; gross 1000 private → medical **20** for 2026-12 and **30** for 2027-01; today's month keeps the old set.

## ERP mapping (fill in)
- Employee master object: …  - Timesheet/attendance object: …  - Leave ledger object: …  - General ledger / chart of accounts: …  - Bank document object: …  - Roles/permissions: …
