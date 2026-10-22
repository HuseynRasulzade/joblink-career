ALTER TABLE `accounts` ADD `status` text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_created` ON `admin_audit_logs` (`created`);
--> statement-breakpoint
CREATE INDEX `admin_audit_admin` ON `admin_audit_logs` (`admin_id`);
