CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`job_id` text NOT NULL,
	`company_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`signature_name` text DEFAULT '' NOT NULL,
	`signed_at` text DEFAULT '' NOT NULL,
	`signed_ip` text DEFAULT '' NOT NULL,
	`response_note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `offers_application` ON `offers` (`application_id`);
--> statement-breakpoint
CREATE INDEX `offers_candidate` ON `offers` (`candidate_id`,`created`);
--> statement-breakpoint
CREATE INDEX `offers_company` ON `offers` (`company_id`,`created`);
