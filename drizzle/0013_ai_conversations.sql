CREATE TABLE `ai_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`title` text NOT NULL,
	`context_type` text NOT NULL,
	`context_id` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_conversations_user` ON `ai_conversations` (`user_id`,`updated`);
--> statement-breakpoint
CREATE TABLE `ai_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_messages_conversation` ON `ai_messages` (`conversation_id`,`created`);
