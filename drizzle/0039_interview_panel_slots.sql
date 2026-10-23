ALTER TABLE `interviews` ADD `panel` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `interviews` ADD `slots` text DEFAULT '[]' NOT NULL;
