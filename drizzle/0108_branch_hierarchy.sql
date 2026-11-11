ALTER TABLE `staff_units` ADD `branch` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `employee_branches` ADD `department` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `employee_branches` ADD `section` text DEFAULT '' NOT NULL;
