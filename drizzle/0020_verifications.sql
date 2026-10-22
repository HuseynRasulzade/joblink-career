CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`item_key` text NOT NULL,
	`item_label` text DEFAULT '' NOT NULL,
	`doc_name` text DEFAULT '' NOT NULL,
	`doc_type` text DEFAULT '' NOT NULL,
	`doc_data` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`ai_result` text DEFAULT '' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verifications_item` ON `verifications` (`user_id`,`kind`,`item_key`);
--> statement-breakpoint
CREATE INDEX `verifications_status` ON `verifications` (`status`,`updated`);
