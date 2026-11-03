CREATE TABLE `company_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_company_id` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_groups_owner` ON `company_groups` (`owner_company_id`);
--> statement-breakpoint
CREATE TABLE `company_group_links` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`company_id` text DEFAULT '' NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`expires` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`share_pay` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	`joined_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `company_group_links_group` ON `company_group_links` (`group_id`, `status`);
--> statement-breakpoint
CREATE INDEX `company_group_links_company` ON `company_group_links` (`company_id`, `status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_group_links_code` ON `company_group_links` (`code`) WHERE `code` <> '';
