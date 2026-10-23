CREATE TABLE `interview_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`questions` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `interview_templates_company` ON `interview_templates` (`company_id`,`updated`);
