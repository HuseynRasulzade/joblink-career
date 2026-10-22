CREATE TABLE `custom_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`label_en` text NOT NULL,
	`category` text NOT NULL,
	`category_en` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_skills_label` ON `custom_skills` (`label`);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_skills_label_en` ON `custom_skills` (`label_en`);
--> statement-breakpoint
CREATE INDEX `custom_skills_category` ON `custom_skills` (`category`);
