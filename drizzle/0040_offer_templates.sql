CREATE TABLE `offer_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`created_by` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `offer_templates_company` ON `offer_templates` (`company_id`,`updated`);
