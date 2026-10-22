CREATE TABLE `esco_skills` (
	`uri` text PRIMARY KEY NOT NULL,
	`label_en` text NOT NULL,
	`normalized_label` text NOT NULL,
	`alternative_labels` text DEFAULT '[]' NOT NULL,
	`normalized_alternatives` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '' NOT NULL,
	`skill_type` text DEFAULT '' NOT NULL,
	`reuse_level` text DEFAULT '' NOT NULL,
	`source_version` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `esco_skills_normalized_label` ON `esco_skills` (`normalized_label`);
--> statement-breakpoint
CREATE INDEX `esco_skills_label_en` ON `esco_skills` (`label_en`);
