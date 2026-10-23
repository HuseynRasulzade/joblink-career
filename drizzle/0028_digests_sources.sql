CREATE TABLE `digest_subscriptions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`frequency` text NOT NULL,
	`last_sent` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `digest_subscriptions_company` ON `digest_subscriptions` (`company_id`);
--> statement-breakpoint
ALTER TABLE `applications` ADD `source` text DEFAULT '' NOT NULL;
