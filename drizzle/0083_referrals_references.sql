CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`job_id` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`candidate_name` text NOT NULL,
	`candidate_phone` text DEFAULT '' NOT NULL,
	`candidate_email` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`bonus_cents` integer DEFAULT 0 NOT NULL,
	`bonus_paid_at` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `referrals_company` ON `referrals` (`company_id`,`status`);
--> statement-breakpoint
CREATE INDEX `referrals_employee` ON `referrals` (`company_id`,`employee_id`);
--> statement-breakpoint
CREATE TABLE `reference_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`candidate_name` text NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`referee_name` text NOT NULL,
	`referee_role` text DEFAULT '' NOT NULL,
	`referee_company` text DEFAULT '' NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`verdict` text DEFAULT '' NOT NULL,
	`checked_by_name` text DEFAULT '' NOT NULL,
	`checked_at` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reference_checks_company` ON `reference_checks` (`company_id`,`candidate_name`);
