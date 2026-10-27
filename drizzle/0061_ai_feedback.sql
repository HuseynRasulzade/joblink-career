CREATE TABLE `ai_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`job_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`ai_score` integer DEFAULT 0 NOT NULL,
	`rule_score` integer DEFAULT 0 NOT NULL,
	`ai_recommendation` text DEFAULT '' NOT NULL,
	`verdict` text NOT NULL,
	`hr_decision` text DEFAULT '' NOT NULL,
	`hr_score` integer,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_feedback_unique` ON `ai_feedback` (`user_id`,`kind`,`job_id`,`candidate_id`);
--> statement-breakpoint
CREATE INDEX `ai_feedback_company` ON `ai_feedback` (`company_id`,`job_id`);
