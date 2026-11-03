CREATE TABLE `order_effects` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`order_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`kind` text NOT NULL,
	`effective_date` text NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`plan` text DEFAULT '{}' NOT NULL,
	`before` text DEFAULT '{}' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`applied_at` text DEFAULT '' NOT NULL,
	`reverted_at` text DEFAULT '' NOT NULL,
	`reverted_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_effects_order` ON `order_effects` (`order_id`);
--> statement-breakpoint
CREATE INDEX `order_effects_due` ON `order_effects` (`company_id`,`status`,`effective_date`);
--> statement-breakpoint
ALTER TABLE `trainings` ADD `skill_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trainings` ADD `skill_level` integer DEFAULT 0 NOT NULL;
