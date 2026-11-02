CREATE TABLE `attendance_hours_month` (
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`month` text NOT NULL,
	`overtime` real DEFAULT 0 NOT NULL,
	`rest_day` real DEFAULT 0 NOT NULL,
	`night` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`company_id`, `employee_id`, `month`)
);
--> statement-breakpoint
CREATE TABLE `overtime_orders` (
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`day` text NOT NULL,
	`order_id` text NOT NULL,
	`order_number` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`company_id`, `employee_id`, `day`)
);
--> statement-breakpoint
INSERT OR IGNORE INTO attendance_hours_month(company_id,employee_id,month,overtime,rest_day,night,status,note,updated)
SELECT i.company_id, i.employee_id, i.month,
  COALESCE(json_extract(i.data,'$.overtimeHours'),0), COALESCE(json_extract(i.data,'$.restDayHours'),0), COALESCE(json_extract(i.data,'$.nightHours'),0),
  'approved', 'Əmək haqqı pəncərəsindən köçürülüb', i.updated
FROM payroll_inputs i
WHERE json_valid(i.data)
  AND (COALESCE(json_extract(i.data,'$.overtimeHours'),0)>0 OR COALESCE(json_extract(i.data,'$.restDayHours'),0)>0 OR COALESCE(json_extract(i.data,'$.nightHours'),0)>0)
  AND NOT EXISTS (SELECT 1 FROM payroll_runs r WHERE r.company_id=i.company_id AND r.month=i.month AND r.status='approved');
