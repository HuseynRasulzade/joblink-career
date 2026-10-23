CREATE TABLE `company_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_reviews_unique` ON `company_reviews` (`company_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `company_reviews_status` ON `company_reviews` (`status`,`created`);
