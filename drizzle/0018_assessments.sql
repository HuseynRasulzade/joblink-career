CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`job_id` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`duration_min` integer DEFAULT 30 NOT NULL,
	`passing_score` integer DEFAULT 0 NOT NULL,
	`questions` text DEFAULT '[]' NOT NULL,
	`attachment_name` text DEFAULT '' NOT NULL,
	`attachment_type` text DEFAULT '' NOT NULL,
	`attachment_data` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assessments_company` ON `assessments` (`company_id`,`updated`);
--> statement-breakpoint
CREATE TABLE `assessment_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assessment_revisions_assessment` ON `assessment_revisions` (`assessment_id`,`created`);
--> statement-breakpoint
CREATE TABLE `assessment_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`application_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`company_id` text NOT NULL,
	`status` text DEFAULT 'assigned' NOT NULL,
	`assigned_at` text NOT NULL,
	`started_at` text DEFAULT '' NOT NULL,
	`deadline_at` text DEFAULT '' NOT NULL,
	`submitted_at` text DEFAULT '' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`max_score` integer DEFAULT 0 NOT NULL,
	`violations` text DEFAULT '[]' NOT NULL,
	`late` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assessment_assignments_candidate` ON `assessment_assignments` (`candidate_id`,`assigned_at`);
--> statement-breakpoint
CREATE INDEX `assessment_assignments_company` ON `assessment_assignments` (`company_id`,`assigned_at`);
