CREATE TABLE `custom_certifications` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`issuer` text NOT NULL,
	`category` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`levels` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_certifications_name` ON `custom_certifications` (`name`);
