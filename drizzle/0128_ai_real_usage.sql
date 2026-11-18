ALTER TABLE `ai_usage` ADD `tokens_in` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `tokens_out` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `tokens_cached` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `measured` integer NOT NULL DEFAULT 0;
