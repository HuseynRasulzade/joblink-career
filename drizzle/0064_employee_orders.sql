CREATE TABLE `employee_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`kind` text NOT NULL,
	`number` text DEFAULT '' NOT NULL,
	`order_date` text DEFAULT '' NOT NULL,
	`input` text DEFAULT '{}' NOT NULL,
	`signers` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `employee_orders_employee` ON `employee_orders` (`company_id`,`employee_id`,`created`);
