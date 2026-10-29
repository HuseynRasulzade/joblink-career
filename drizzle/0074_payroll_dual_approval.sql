ALTER TABLE `payroll_settings` ADD `dual_threshold` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `payroll_batches` ADD `approved_by` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payroll_batches` ADD `first_approved_by` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payroll_batches` ADD `first_approved_name` text DEFAULT '' NOT NULL;
