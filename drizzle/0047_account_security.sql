CREATE TABLE `auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_tokens_user` ON `auth_tokens` (`user_id`,`kind`);
--> statement-breakpoint
ALTER TABLE `password_accounts` ADD `verified` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `sessions` ADD `created` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `sessions` ADD `agent` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `totp_secrets` (
	`user_id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`backup_codes` text DEFAULT '[]' NOT NULL,
	`created` text NOT NULL
);
