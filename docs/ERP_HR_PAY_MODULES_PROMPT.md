# ERP üçün «Əmək haqqı ilə bağlı bütün bölmələr»: prompt-spesifikasiya (2-ci hissə)

**Bu fayl nədir.** `ERP_PAYROLL_PROMPT.md` (1-ci hissə) ayın əsas hesablama mühərrikini, vergi/sığorta cədvəllərini, avansı, ödənişləri, bank paketlərini və ay dövriyyəsini təsvir edir. Bu fayl isə əmək haqqına təsir edən **qalan bölmələri** əhatə edir: nə üçündür, nə hesablanır, düstur, qanun maddəsi və yoxlama rəqəmləri. İkisini birlikdə ERP-nin AI-ına və ya proqramçısına verin (əvvəl 1-ci, sonra 2-ci).

**Bölmələrin xəritəsi (platformada nə var):**
| № | Bölmə | Əmək haqqına təsiri |
|---|---|---|
| A | İşçi kartı, maaş tarixçəsi, vergi güzəştləri | Gross/net, sektor, güzəşt |
| B | İstehsalat təqvimi və tabel | İş günləri, gün statusları |
| C | Saat uçotu: artıq iş, istirahət günü, gecə | Əlavə ödənişlər |
| D | Məzuniyyət: hüquq, tarixlər, pul, balans, qrafik | Məzuniyyət pulu, qalıq |
| E | Sığorta müavinətləri (xəstəlik, hamiləlik, atalıq) | Maaşdan kənar, məbləğ hesabı |
| F | Qismən ödənişlər (boşdayanma, minimum əmək haqqı, mütənasiblik) | Gross azalması |
| G | Tutulmalar (limitlər, icra vərəqəsi, aliment) | Net-dən tutulma |
| H | Xitam: xəbərdarlıq, işdənçıxarma, istifadə olunmamış məzuniyyət, son hesablaşma | Son ödəniş |
| I | Ezamiyyət normaları | Gündəlik ödəniş (maaşdan kənar) |
| J | Filiallar: bölgü, satış bonusu | Maaşın filiallara bölünməsi, bonus |
| K | Ştat cədvəli, maaş həddi, plan-fakt | Büdcə və uyğunluq |
| L | Əmrlər → kart/tabel/maaş təsiri | Avtomatik dəyişikliklər |
| M | Xatırlatmalar, cron, hesabatlar, işçinin öz görünüşü | İdarəetmə |
| N | İctimai kalkulyatorlar | Eyni düsturlar, qeydiyyatsız |

**Vacib xəbərdarlıq (yuvarlaqlaşdırma fərqi):** aylıq hesablama mühərrikində saatlıq tarif **yuvarlaqlaşdırılmır** (maaş ÷ (gün × 8)), ayrıca kalkulyatorda isə saatlıq tarif əvvəl 2 rəqəmə yuvarlaqlaşdırılır. Nəticə bir neçə qəpik fərqlənə bilər (məs. 5 saat artıq iş: mühərrik 85.23, kalkulyator 85.20). ERP-də **mühərrik qaydasını** (yuvarlaqlaşdırmasız) seçin və 1-ci hissədəki test rəqəmlərini əsas götürün.

Hüquqi məsləhət deyil: ERP-yə buraxmazdan əvvəl mühasib və hüquqşünas təsdiq etməlidir. Maddə nömrələri Əmək Məcəlləsinə (ƏM), Vergi Məcəlləsinə (VM) və Sosial Sığorta Qanununa (SSQ) aiddir; platformanın öz yoxlamasından keçib, lakin dəyişikliklər izlənməlidir.

---

# PROMPT (ERP-yə verilən hissə)

You are extending an Azerbaijan payroll module (part 1 already defines the monthly engine, tax sets, advance, payments, bank batches and month lifecycle). Add the following modules. Currency AZN; round to 2 decimals (half up) at the end of every amount, never intermediate values. Every result carries its legal article references (`articles[]`) and explanatory `notes[]`, shown in the UI. Constants: mean month days **30.4** (ƏM 140.3), working day **8 h** (ƏM 89.2), week **40 h** (89.3).

## A. Employee card (single source of truth)
Fields: name, FIN, position, department, section, branch(es), hire/end date, status (active, leave, left, removed), `salary` (stored in qəpik) and `salary_type` (gross|net), sector (private|public), weekly hours, shift mode, tax reduction (disability and other benefits, VM 102.1-1…102.5), pay method (bank/card/cash), IBAN/card, children under 14, disabled child, age, harmful-conditions leave days, probation end, contract end, exit type/reason. Salary changes are stored as **dated history** (effective date → amount); the month's calculation uses the salary in force per day. **Single-truth rule:** other modules read the card; they never keep copies. A signed order changes the card automatically with an audit/undo record (module L).
`employeePay(amount, type, sector, reduction)`: if net → solve gross by bisection (part 1), else compute net; `superGross = gross + employer contributions`.
**Staff-plan consistency:** when a staff row has a pay band (`salaryMin`, `salaryMax` or = min) a card salary outside the band is rejected/flagged (±0.005 tolerance); the UI offers "fix salary".
**Tenure** (`tenure(start, end|today)`): months = calendar months difference minus 1 if the day-of-month is earlier; years = months/12 (floor), rest months, days since anchor. Text "3 il 8 ay".

## B. Production calendar and timesheet (tabel)
Calendar per year: each date `""` working, `weekend`, `holiday`, `transfer` (moved day off), `company` (company day off); a date may also be `short` (the eve of a holiday is **1 hour shorter**). Official holiday dates are data, updated by an admin each year (a "calendar extraction" tool can propose them from a decree text). Working days of a month = dates with `""`.
Day status from attendance code → part 1, section 4. Codes include work/remote/trip/training, annual/addleave/study/creative/donor/medical/summons/military, downtime, maternity/childcare/paternity/sick/injury, unpaid variants, absent. Hired/left mid-month → `outside`. The timesheet is filled by HR, by shifts, by approved orders and by imports (leave ranges → days). Block editing of an approved payroll month.

## C. Working-hours module (overtime, rest day, night)
- Daily norm = weekHours/5 − (short day ? 1 : 0), min 0.
- `summarizeHours(days, hoursByDay, weekHours)`: for each day with hours > 0: `worked += h`; `night += min(night, h)`; if the day is off (weekend/holiday/transfer/company) → `restDay += h`; else `overtime += max(0, h − dailyNorm)`.
- Source of hours (`chooseHours`): **daily entries win**; otherwise **month totals** (overtime, restDay, night, status); otherwise none.
- **Approval rule:** if the company requires approval, overtime/rest-day hours count only on days approved (or when a month total is approved/covered by an order); unapproved extra hours are reported as `waiting` and are **not paid**; the working-day part up to the norm still counts.
- Pay (inside the month engine, part 1 lines 6–8): overtime `hourly × 2 × hours` (ƏM 165, limits 99–100: ≤4 h over two consecutive days, ≤2 h in harmful conditions; no overtime for pregnant women, mothers of children under 14, under-18s: 242, 254; overtime cannot be replaced by a rest day, 165.3); rest-day work `hourly × (within monthly norm ? 1 : 2) × hours` (164; employee may choose another rest day instead, 164.2); night 22:00–06:00 `hourly × percent × hours / 100` where the percent is a contract/company setting stored on the employee card (97, 166).
- Import: daily rows (FIN/e-mail/name, date, hours, night, note; ≤3000 rows) and month-total rows (≤1000), with line-numbered error reports.

## D. Vacation
1. **Entitlement** (`vacationEntitlement`): main = 21 calendar days (30 if the extended main leave applies); under-18: 35 days (42 if under 16 or disabled minor, ƏM 119), and for minors the tenure/children extras are **not** added (116.3, 117.4). Extras for tenure: >15 years +6, 10–15 +4, 5–10 +2 (116). Children: disabled child or ≥3 children under 14 → +5, 2 children → +2 (117, only if eligible). Harmful conditions: ≥6 days (set by authority). `total = main + byTenure + byChildren + harmful`. Sector-specific leaves (118–121: teachers, scientists, medical, theatre) are set separately.
2. **Dates** (`vacationDates(start, days)`): count only non-holiday days; public holidays and mourning days inside the leave are **not counted and not paid**, the leave is extended by their number (114.6). Return `end`, `returnDate`, `calendarDays = days + holidays`, holiday list. Order must be issued ≥5 days before start.
3. **Pay**: average monthly earnings of the previous **12 calendar months** (fewer if fewer worked; partly-paid social leave, unpaid leave not on the employee's initiative and downtime months are replaced by the nearest fully worked month; only pay-system earnings count; 140.1–140.3) `/ 30.4` = daily rate; `pay = dailyRate × leaveDays`; must be paid **≥3 days before the start** (140.5). (Coefficient indexation of 140.7 is out of scope.) In the month engine only the calendar days that fall in the month are paid there (part 1, section 6).
4. **Balance** (`vacationBalance`): accrues evenly, `accrued = round(entitlement × totalTenureMonths / 12, 1 decimal)`; `remaining = accrued − used` (may be negative when leave is taken in advance; a warning is shown).
5. **Leave schedule** (yearly): entries (employee, start, end, days, status proposed/approved/rejected/taken); warnings when the number of people of one department away at the same time peaks above a threshold or when dates overlap; monthly load chart; an approved entry links to the application and the order.
6. **Application flow:** employee → direct manager approval ("Komandam") → HR gate → order → card/timesheet marks. Overlap with another leave or with the company's blackout is blocked.

## E. Insurance benefits (paid by the insurer, not part of gross)
- Sickness / maternity: `dailyRate × percent/100 × calendarDays` where `dailyRate = average monthly of last 12 insured months / 30.4`. `percent` is a setting (platform default 100 % for both). Weekends and holidays are included.
- Eligibility: ≥**6 months** insurance record (SSQ md. 6) else `amount = 0`; if the record is unknown, show a note and still compute. **Monthly cap = 25 × minimum pension** (md. 6; the minimum pension is a setting); if the calculated amount exceeds the cap → `amount = cap`, flag `capped`.
- Benefits are not income subject to insurance fees (md. 15) and are normally paid by the insurer directly (md. 17): the module only **calculates, records the e-sickness certificate (e-bülleten) number and receipt**, and can include the line in a bank batch of kind `benefit`.
- Maternity leave dates (ƏM 125): 70 days before + 56 after birth (70 after a difficult birth or multiple birth); agriculture 70 + 70/86/110; late birth extends the "before" part, the "after" part never shortens (125.3); start = expected birth − 70 days. Paternity leave 14 calendar days (125.4).

## F. Partial pay and minimum wage
- Downtime, unmet output norm, defects not the employee's fault: **2/3 of the tariff salary** (169/167/168); downtime requires the employee's notification; downtime by the employee's fault is unpaid (169.2).
- Proration (171): `salary × min(worked, norm) / norm`.
- Minimum wage check (155.3): if monthly salary for the full norm < `minimumWage` (from the dated parameter set, 400 AZN in 2026) → error/warning in pre-approval checks.
- Average daily pay outside vacation (177, 179): `dailyRate = earnings of the previous two calendar months / working days of those months`; pay = `dailyRate × paid days` (business trip, donor day, court summons, study leave…). Under two months of work → earnings of days actually worked / those days. For partly-paid social leave, employer-initiated unpaid leave or downtime the daily amount may not be lower than the last daily pay (177.3-1).

## G. Deductions
Only the cases of ƏM 175 are allowed. Limit per payment (ƏM 176): general **20 %**, with a writ/where allowed **50 %**, alimony, health damage, loss of breadwinner, crime damage **70 %**; with several writs 50 % stays with the employee; a chosen percent can only lower the cap. Damage caused by the employee's fault: not more than the average monthly salary (175.2c). Nothing is deducted from severance (175.4). Overpaid leave may be recovered (144.4, 175.2ç). Carry-over of the unapplied rest: part 1, section 5.

## H. Termination and final settlement
- **Resignation:** the employee gives 1 calendar month written notice (69.1): `resignationDate(noticeDate)` = same day next month; 31 Jan → last day of Feb.
- **Probation** (51.1): ≤2 weeks for contracts up to 6 months, otherwise ≤3 months.
- **Reduction/liquidation (77):** notice weeks by tenure: <1 y 2 weeks, 1–<5 y 4, 5–10 y 6, >10 y 9 (the employee gets ≥1 working day per week off to look for work, 77.2). **Severance** = `average monthly × multiplier`: <1 y ×1, 1–<5 y ×1.4, 5–10 y ×1.7, >10 y ×2 (77.3; a contract may give more, 77.6). **Pay instead of notice** (only with the employee's consent): ×0.5 (2 weeks), ×0.9 (4), ×1.4 (6), ×2 (9). Other reasons: no 77.3 severance. 77.7 cases: minimum 2 (or 3) average monthly salaries (`minimumBenefit`).
- **Unused main leave compensation** (143, 144, 140.4): `fullYears` = completed work years from the hire date; the unfinished last year counts proportionally `min(main, main × daysInLastYear / 365)`; `earned = fullYears × main + partial`; `unused = max(0, earned − used)`; `compensation = unused × dailyRate(12-month average / 30.4)`. Additional (115–117), study, creative and social leaves are **not** compensated. Result is an estimate (the proportion is not spelled out in the code).
- **Final settlement** (`finalSettlement`, paid on the last day, 172): `salaryForWorkedDays = proratedSalary`; `leaveCompensation = unusedDays × dailyRate`; `taxable = salaryForWorkedDays + leaveCompensation` → taxes by part 1 (set of the month; the 200 AZN exemption only for the main workplace and by total monthly income); `severance` and other fixed exempt payments are **not taxed** (VM 102.1.4) and nothing is deducted (175.4); `toPay = net + severance + exempt`. Add the month's other items (bonus, allowance) separately.
- **Offboarding checklist** (assets returned, accounts closed, documents, etc.) and a short exit survey; the employee accepts the asset handover; last-pay estimate is shown on the checklist.

## I. Business trips (ezamiyyət)
Per-diem norm table from Cabinet of Ministers decision No. 14 of 25.01.2008 (as amended; the source line is stored with the table and updated by an admin). Domestic, AZN per day: Baku 125, Nakhchivan 100, Ganja 95, Sumgait 95, all others 90. **Parts:** hotel = 70 % of the norm (`HOTEL_SHARE`), daily costs = norm − hotel; **without hotel documents** only half of the hotel part is paid: `noReceipt = daily + hotel × 0.5`. Workers whose permanent work is on the road, shift or field workers get **20 AZN/day** instead (item 6, decision No. 200 of 04.04.2024). Foreign trips: country (and city) norm in USD/EUR/GBP/JPY from the table (106 countries) × the Central Bank official rate **of the trip date**. Destination text is matched by folded (diacritic-free) city/country/alias names; a foreign match wins even if the "abroad" flag is off. Trip days are `work` status in the timesheet; the per-diem is a separate payment line (not part of gross for this module's purposes — check the tax treatment with the accountant). Test: Baku → 125 (hotel 87.50, daily 37.50, no-receipt 81.25); other city → 90 (63 / 27 / 58.50).

## J. Branches
Entities: branch (name, code, city, active), employee↔branch link (role, `sharePct`, `bonusEligible`, from, to, department/section), bonus rule per branch (`fixed` amount or `salary_percent`), monthly sales/target per branch, allocation mode (`equal` | `sales`).
- **Shares of one employee's pay** (`sharesOf`, sum = 1): (1) hand-written percentages win, normalized to 1; (2) if the employee moved between branches inside the month, split by working days spent in each branch; (3) mode `sales`: by each branch's sales of the month (no sales at all → equal); (4) otherwise equal.
- **Split of an amount** (`splitAmount`): each share rounded to 2 decimals; the **last branch takes the remaining cent**, so the parts always sum exactly to the total.
- **Sales bonus** (`bonusesOf`): for each branch link with `bonusEligible`, an active rule and `sales ≥ target (> 0)`: amount = fixed value, or `grossSalary × share × percent/100`; label "Filial bonusu: <branch> (satış X / limit Y; rule)". Added as a bonus line (ƏM 157.6) to the month automatically.
- Reports: payroll cost by branch (salary and bonus split), employee list per branch, structure tree Branch → Department → Section → Position; Excel export/import with sample file.

## K. Staff table (ştat), budget and plan-vs-fact
Row: branch, department, section, position, `planned` places, `rate` (1, 0.75, 0.5, 0.25 → FTE = planned × rate), `salaryMin/Max` (gross AZN; max = min if 0), level (Junior/Orta/Böyük/Rəhbər — same position may have several level rows with different bands), `startMonth`/`endMonth` (row active only in that period).
- **Assigning people to rows** (`assignPeople`): each working person (not left/removed) is scored against rows: department must match (case/diacritic-insensitive); branch must match when both known; position must match when both known (+4), section (+2), blanks give +1; −1 = impossible. People are placed highest score first into the closest row with a free place (ties: the row whose pay band contains the person's gross); if all full, the closest row takes them over plan. Nobody is counted twice; unplaced people are listed.
- **Summary:** `filled`, `free = planned − filled`, `fte`, `budget = planned × max(salaryMin, salaryMax)` per row and per department; free places for a vacancy = planned − filled − already open vacancies.
- **Plan-fact:** monthly target headcount per department (linear distribution between set points), actual from the card history, deviation alert; forecast of headcount dynamics; payroll budget vs actual per month (`payroll_budgets`).
- Staff-plan lock (approved plan cannot be edited without reopening), history of changes, Excel import/export.

## L. Orders (əmrlər) → card, timesheet, payroll
Order kinds with automatic effect on approval/signing: transfer, salary change, name change, termination, reduction, probation (pass/extend), suspension, bonus, discipline, contract extension, substitution, work schedule. An order produces a **plan**: new card values, effective date, branch move (old links end the day before, new one starts on the effective date), days to mark in the timesheet (code, from, to), a bonus line for a month (amount, month), history-only events. The server applies the plan, **stores the previous values and can undo**. Leave and business-trip orders mark the timesheet; an order without a matching approved application raises a warning; unpaid overtime orders gate overtime payment (module C). A **check list before approving a payroll month** compares orders and the payroll (e.g. a salary order not yet reflected, leave without order).

## M. Reminders, reports, employee view, security
- **Daily reminders** (once each, keyed): tomorrow is the advance day (prepare the bank file and send for approval); the month is not approved within 3 days before pay day; the previous month is still unapproved after the 3rd; contract/probation/document deadlines; birthdays and anniversaries.
- **Reports:** payroll register, bank register, employer cost, variance vs previous month, annual totals (approved months only), branch cost, budget vs actual, headcount dynamics, leave schedule load, export to Excel (async jobs for large reports, scheduled reports by e-mail).
- **Accounting export** (1C/ERP ledger) with configurable account map (part 1, section 12).
- **Employee self-service:** each employee sees only their own payslips (approved months), leave balance and applications; can request data changes (approved by HR) and write applications to the company; HR sees the inbox.
- **Security:** separate rights to view salaries, edit inputs, approve, pay, reopen; every salary view logged; personal data (FIN, IBAN) encrypted at rest when a key is set; all changes audited; roles include auditor (read-only).
- **Group/holding view:** a group of companies sees only consolidated summaries with each company's consent.

## N. Public calculators (no login)
Gross↔net, employer cost, vacation pay, vacation dates, unused-leave compensation, severance/notice, overtime/rest-day/night pay, benefit (sickness/maternity), final settlement, VAT (18 %, add/extract; ƏDV art. 173.1), simplified tax (2 %; 6–8 % in the cases of VM 220.1-1), entrepreneur income tax, working days between dates. They use the **same functions** and the **same dated tax set** (selectable by a date), and print the articles used.

## O. Test vectors (2026 default set; must reproduce exactly)
- **Vacation entitlement:** 30 y, 6 y tenure, 2 children under 14 (eligible) → main 21 + tenure 2 + children 2 = **25**; age 17, 6 y → **35** (extras not added).
- **12-month average 1450:** average 1450.00, daily rate **47.70**; vacation pay for 21 days **1001.70**; pay-by date = start − 3 days.
- **Unused leave:** hired 2023-03-01, leaving 2026-06-30, main 21, used 30, 12×1450 → fullYears 3, earned **70.02**, unused **40.02**, compensation **1908.95**.
- **Termination (reduction):** tenure 6 y, average 1450 → notice 6 weeks, multiplier 1.7, severance **2465.00**, pay-in-lieu **2030.00** (×1.4).
- **Overtime / rest / night (calculator, hourly = 1500/176 rounded to 8.52):** 5 h overtime **85.20**; 8 h rest within norm **68.16**, beyond norm **136.32**; night 10 h at 40 % **34.08** (the month engine, hourly unrounded, gives 85.23 / 136.36 on a 22-day month: see part 1).
- **2/3:** tariff 1200 → **800.00**.
- **Deduction limits on net 1630.30:** general **326.06**, writ **815.15**, alimony **1141.21**.
- **Sickness benefit:** 12×1450, 10 days, 100 %, record 24 months, min pension 300 → **477.00** (cap 7500); 30 days with min pension 50 → calculated 1431.00, cap **1250.00**, paid **1250.00**; record 3 months → **0**.
- **Maternity:** expected birth 2026-09-01 → start **2026-06-23**, end **2026-10-26**, 126 days.
- **Leave balance:** hired 2026-01-15, 21 days/year, used 3, today 2026-11-20 → accrued **17.5**, remaining **14.5**. **Tenure:** hired 2023-03-01 → 3 y 8 m (19 days).
- **Final settlement:** salary 1500, 15 of 22 days, 10 unused leave days at 47.70, severance 2030, private → salary for days **1022.73**, leave **477.00**, taxable **1499.73**, income tax **38.99**, employee insurance **173.47**, net **1287.27**, to pay **3317.27**.
- **Business trip:** Baku 125 (87.50 / 37.50 / 81.25); other 90 (63 / 27 / 58.50).
- **Branches:** two links, equal → 0.5/0.5; sales 3000/1000 → 0.75/0.25; manual 60/20 → 0.75/0.25; split 1000.01 over thirds → 333.34 / 333.34 / 333.33; bonus: branch A reached (sales 1200 ≥ 1000) with rule 10 % of salary, share 0.5, gross 1500 → **75.00**; branch B not reached (900 < 1000) → none.
- **Hours:** weekHours 40, Mon 10 h (2 night), Tue 8 h, Sat 6 h → worked 24, overtime **2**, restDay **6**, night **2**.
