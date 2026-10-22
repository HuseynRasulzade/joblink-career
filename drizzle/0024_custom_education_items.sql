CREATE TABLE `custom_education_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`label_en` text DEFAULT '' NOT NULL,
	`label_ru` text DEFAULT '' NOT NULL,
	`extra` text DEFAULT '' NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_education_items_label` ON `custom_education_items` (`kind`,`label`);
