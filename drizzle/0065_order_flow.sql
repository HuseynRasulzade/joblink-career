ALTER TABLE `employee_orders` ADD `holder` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `employee_orders` ADD `history` text DEFAULT '[]' NOT NULL;
