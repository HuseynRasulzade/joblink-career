CREATE TABLE `company_members` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text DEFAULT '' NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`invited_by` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_members_company_email` ON `company_members` (`company_id`,`email`);
--> statement-breakpoint
CREATE INDEX `company_members_user` ON `company_members` (`user_id`,`status`);
--> statement-breakpoint
CREATE INDEX `company_members_email` ON `company_members` (`email`,`status`);
--> statement-breakpoint
CREATE TABLE `company_profiles` (
	`company_id` text PRIMARY KEY NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`doc_name` text DEFAULT '' NOT NULL,
	`doc_type` text DEFAULT '' NOT NULL,
	`doc_data` text DEFAULT '' NOT NULL,
	`verification_status` text DEFAULT 'none' NOT NULL,
	`verification_note` text DEFAULT '' NOT NULL,
	`submitted_at` text DEFAULT '' NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `company_profiles_verification` ON `company_profiles` (`verification_status`,`submitted_at`);
--> statement-breakpoint
CREATE TABLE `company_employees` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`position` text DEFAULT '' NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`salary_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`application_id` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `company_employees_company` ON `company_employees` (`company_id`,`status`);
--> statement-breakpoint
CREATE TABLE `company_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target` text DEFAULT '' NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `company_audit_company` ON `company_audit` (`company_id`,`created`);
