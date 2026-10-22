CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`brand` text NOT NULL,
	`last4` text NOT NULL,
	`exp_month` integer NOT NULL,
	`exp_year` integer NOT NULL,
	`holder` text DEFAULT '' NOT NULL,
	`token` text NOT NULL,
	`provider` text DEFAULT 'mock' NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payment_methods_account` ON `payment_methods` (`account_id`);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`auto_renew` integer DEFAULT 0 NOT NULL,
	`method_id` text DEFAULT '' NOT NULL,
	`cancelled_at` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subscriptions_account` ON `subscriptions` (`account_id`,`created`);
--> statement-breakpoint
CREATE TABLE `plan_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'AZN' NOT NULL,
	`status` text NOT NULL,
	`method_label` text DEFAULT '' NOT NULL,
	`provider` text DEFAULT 'mock' NOT NULL,
	`provider_ref` text DEFAULT '' NOT NULL,
	`period_start` text DEFAULT '' NOT NULL,
	`period_end` text DEFAULT '' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `plan_payments_account` ON `plan_payments` (`account_id`,`created`);
--> statement-breakpoint
CREATE TABLE `usage_counters` (
	`account_id` text NOT NULL,
	`day` text NOT NULL,
	`feature` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`account_id`, `day`, `feature`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`number` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contracts_account` ON `contracts` (`account_id`,`created`);
