CREATE TABLE `error_log` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`source` text NOT NULL,
	`message` text NOT NULL,
	`where_at` text DEFAULT '' NOT NULL,
	`fingerprint` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `error_log_created` ON `error_log` (`created`);
--> statement-breakpoint
CREATE INDEX `error_log_fingerprint` ON `error_log` (`fingerprint`,`created`);
--> statement-breakpoint
CREATE TABLE `privacy_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`role` text NOT NULL,
	`created` text NOT NULL
);
