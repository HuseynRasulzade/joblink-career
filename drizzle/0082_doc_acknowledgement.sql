ALTER TABLE `employee_documents` ADD `ack_required` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `employee_documents` ADD `ack_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `employee_documents` ADD `ack_hash` text DEFAULT '' NOT NULL;
