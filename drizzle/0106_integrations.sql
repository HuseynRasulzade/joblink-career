ALTER TABLE `hr_expenses` ADD `order_no` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hr_expenses` ADD `ordered_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hr_expenses` ADD `external_id` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `hr_expenses` ADD `source` text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `hr_expenses_order_no` ON `hr_expenses` (`company_id`,`order_no`) WHERE `order_no` <> '';
--> statement-breakpoint
CREATE TABLE `integration_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`system` text DEFAULT 'other' NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`created` text NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`last_used` text DEFAULT '' NOT NULL,
	`revoked` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_keys_hash` ON `integration_keys` (`key_hash`);
--> statement-breakpoint
CREATE INDEX `integration_keys_company` ON `integration_keys` (`company_id`);
--> statement-breakpoint
CREATE TABLE `integration_log` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`at` text NOT NULL,
	`direction` text NOT NULL,
	`actor` text DEFAULT '' NOT NULL,
	`action` text NOT NULL,
	`ref` text DEFAULT '' NOT NULL,
	`ok` integer DEFAULT 1 NOT NULL,
	`message` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `integration_log_company` ON `integration_log` (`company_id`,`at`);
