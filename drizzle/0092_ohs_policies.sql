CREATE TABLE `ohs_records` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`type` text NOT NULL,
	`employee_id` text DEFAULT '' NOT NULL,
	`record_date` text NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'done' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ohs_records_company` ON `ohs_records` (`company_id`, `type`, `record_date`);
--> statement-breakpoint
CREATE INDEX `ohs_records_employee` ON `ohs_records` (`company_id`, `employee_id`);
--> statement-breakpoint
CREATE TABLE `policy_docs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`kind` text DEFAULT 'rules' NOT NULL,
	`title` text NOT NULL,
	`requires_ack` integer DEFAULT 1 NOT NULL,
	`current_version` integer DEFAULT 1 NOT NULL,
	`retired` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `policy_docs_company` ON `policy_docs` (`company_id`, `retired`);
--> statement-breakpoint
CREATE TABLE `policy_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`doc_id` text NOT NULL,
	`version` integer NOT NULL,
	`effective_date` text NOT NULL,
	`body` text NOT NULL,
	`change_note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_versions_doc` ON `policy_versions` (`doc_id`, `version`);
--> statement-breakpoint
CREATE TABLE `policy_acks` (
	`doc_id` text NOT NULL,
	`version` integer NOT NULL,
	`employee_id` text NOT NULL,
	`company_id` text NOT NULL,
	`acked_at` text NOT NULL,
	`hash` text DEFAULT '' NOT NULL,
	`withdrawn_at` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`doc_id`, `version`, `employee_id`)
);
--> statement-breakpoint
CREATE INDEX `policy_acks_company` ON `policy_acks` (`company_id`, `employee_id`);
--> statement-breakpoint
CREATE TABLE `retention_rules` (
	`company_id` text NOT NULL,
	`category` text NOT NULL,
	`years` integer NOT NULL,
	PRIMARY KEY(`company_id`, `category`)
);
