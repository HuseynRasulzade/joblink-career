CREATE TABLE `employee_photos` (
	`employee_id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`mime` text NOT NULL,
	`data` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `employee_photos_company` ON `employee_photos` (`company_id`);
