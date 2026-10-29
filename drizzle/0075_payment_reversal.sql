ALTER TABLE `payroll_payments` ADD `reversed_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payroll_payments` ADD `reversed_by_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payroll_payments` ADD `reverse_reason` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payroll_payments` ADD `batch_id` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payroll_payments` ADD `title` text DEFAULT '' NOT NULL;
