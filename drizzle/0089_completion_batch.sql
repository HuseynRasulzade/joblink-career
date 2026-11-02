CREATE TABLE `insurer_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`month` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`received_on` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by_name` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `insurer_receipts_company` ON `insurer_receipts` (`company_id`,`month`);
--> statement-breakpoint
CREATE TABLE `announcement_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`announcement_id` text NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text DEFAULT '' NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `announcement_comments_item` ON `announcement_comments` (`announcement_id`,`created`);
--> statement-breakpoint
ALTER TABLE `announcements` ADD `allow_comments` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE `skill_defs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skill_defs_name` ON `skill_defs` (`company_id`,`name`);
--> statement-breakpoint
CREATE TABLE `employee_skills` (
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`target` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`company_id`, `employee_id`, `skill_id`)
);
--> statement-breakpoint
ALTER TABLE `training_participants` ADD `bond_months` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `training_participants` ADD `bond_until` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `training_participants` ADD `bond_cost_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `perf_reviews` ADD `raise_type` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `perf_reviews` ADD `raise_percent` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `perf_reviews` ADD `raise_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `perf_reviews` ADD `raise_applied` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` ADD `order_id` text DEFAULT '' NOT NULL;
