CREATE TABLE `ai_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_cache_created` ON `ai_cache` (`created`);
--> statement-breakpoint
CREATE INDEX `ai_cache_user` ON `ai_cache` (`user_id`);
