CREATE TABLE `org_names` (
	`company_id` text NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`company_id`, `kind`, `key`)
);
--> statement-breakpoint
CREATE TABLE `staff_plan_state` (
	`company_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `company_employees` ADD `profile` text DEFAULT '{}' NOT NULL;
