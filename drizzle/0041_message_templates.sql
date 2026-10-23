CREATE TABLE `message_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`body` text NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `message_templates_company` ON `message_templates` (`company_id`,`created`);
