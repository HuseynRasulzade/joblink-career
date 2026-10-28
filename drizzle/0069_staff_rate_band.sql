ALTER TABLE `staff_units` ADD `rate` real DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `staff_units` ADD `salary_max_cents` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `org_names` ADD `parent` text DEFAULT '' NOT NULL;
