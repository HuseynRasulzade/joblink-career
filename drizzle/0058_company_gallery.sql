CREATE TABLE `company_images` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `company_images_company` ON `company_images` (`company_id`,`position`);
