ALTER TABLE `support_messages` ADD `attachment_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `support_messages` ADD `attachment_type` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `support_messages` ADD `attachment_data` text DEFAULT '' NOT NULL;
