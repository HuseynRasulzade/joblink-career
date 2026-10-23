ALTER TABLE `messages` ADD `attachment_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_type` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_data` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `message_threads` ADD `assignee_id` text DEFAULT '' NOT NULL;
