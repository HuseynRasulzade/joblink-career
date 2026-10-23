CREATE TABLE `notification_prefs` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email_off` text DEFAULT '[]' NOT NULL,
	`updated` text NOT NULL
);
