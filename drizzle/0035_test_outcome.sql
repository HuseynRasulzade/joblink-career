ALTER TABLE `assessments` ADD `on_pass` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assessments` ADD `on_fail` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assessment_assignments` ADD `outcome_applied` integer DEFAULT 0 NOT NULL;
