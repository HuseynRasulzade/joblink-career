CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `branches_company` ON `branches` (`company_id`);
--> statement-breakpoint
CREATE TABLE `employee_branches` (
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`share_pct` real DEFAULT 0 NOT NULL,
	`bonus_eligible` integer DEFAULT 1 NOT NULL,
	`from_date` text DEFAULT '' NOT NULL,
	`to_date` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`employee_id`, `branch_id`)
);
--> statement-breakpoint
CREATE INDEX `employee_branches_company` ON `employee_branches` (`company_id`);
--> statement-breakpoint
CREATE TABLE `branch_sales` (
	`company_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`month` text NOT NULL,
	`target` real DEFAULT 0 NOT NULL,
	`sales` real DEFAULT 0 NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`branch_id`, `month`)
);
--> statement-breakpoint
CREATE INDEX `branch_sales_company` ON `branch_sales` (`company_id`,`month`);
--> statement-breakpoint
CREATE TABLE `branch_bonus_rules` (
	`company_id` text NOT NULL,
	`branch_id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'fixed' NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
