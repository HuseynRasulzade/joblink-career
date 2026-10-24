CREATE TABLE `approval_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`kind` text NOT NULL,
	`subject` text NOT NULL,
	`payload` text NOT NULL,
	`requested_by` text NOT NULL,
	`requested_by_name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`decided_by` text DEFAULT '' NOT NULL,
	`decided_by_name` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`decided` text DEFAULT '' NOT NULL,
	`reminded_at` text DEFAULT '' NOT NULL,
	`reminders` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `approval_requests_company` ON `approval_requests` (`company_id`,`status`,`created`);
--> statement-breakpoint
CREATE TABLE `approval_delegates` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`from_user` text NOT NULL,
	`to_user` text NOT NULL,
	`until` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `approval_delegates_company` ON `approval_delegates` (`company_id`,`until`);
--> statement-breakpoint
ALTER TABLE `company_profiles` ADD `approval_rules` text DEFAULT '{}' NOT NULL;
