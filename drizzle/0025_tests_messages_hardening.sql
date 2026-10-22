ALTER TABLE `company_members` ADD `grants` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `messages` ADD `author_id` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assessment_assignments` ADD `snapshot` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assessment_assignments` ADD `manual_scores` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assessment_assignments` ADD `review_status` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assessment_assignments` ADD `reviewed_by` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assessment_assignments` ADD `reviewed_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assessment_assignments` ADD `autosaved_at` text DEFAULT '' NOT NULL;
