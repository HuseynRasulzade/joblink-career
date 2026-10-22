CREATE TABLE `password_accounts` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_accounts_user` ON `password_accounts` (`user_id`);