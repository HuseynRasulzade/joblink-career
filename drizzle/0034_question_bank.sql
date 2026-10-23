CREATE TABLE `question_bank` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`question` text NOT NULL,
	`tag` text DEFAULT '' NOT NULL,
	`text_key` text NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `question_bank_company` ON `question_bank` (`company_id`,`created`);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_bank_unique` ON `question_bank` (`company_id`,`text_key`);
