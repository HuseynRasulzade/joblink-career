CREATE TABLE `employee_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`order_id` text DEFAULT '' NOT NULL,
	`decision` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created_by_name` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `employee_requests_company` ON `employee_requests` (`company_id`,`status`,`created`);
