CREATE TABLE `payroll_bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`bank_name` text NOT NULL,
	`bank_code` text DEFAULT '' NOT NULL,
	`swift` text DEFAULT '' NOT NULL,
	`iban` text NOT NULL,
	`account_number` text DEFAULT '' NOT NULL,
	`voen` text DEFAULT '' NOT NULL,
	`holder` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'AZN' NOT NULL,
	`auto` text DEFAULT 'off' NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payroll_bank_accounts_company` ON `payroll_bank_accounts` (`company_id`);
--> statement-breakpoint
CREATE TABLE `payroll_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`kind` text NOT NULL,
	`account_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`skipped` text DEFAULT '[]' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by_name` text DEFAULT '' NOT NULL,
	`approved_by_name` text DEFAULT '' NOT NULL,
	`approved_at` text DEFAULT '' NOT NULL,
	`sent_at` text DEFAULT '' NOT NULL,
	`paid_at` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payroll_batches_month` ON `payroll_batches` (`company_id`,`month`);
