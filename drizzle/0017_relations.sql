CREATE TABLE `relations` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`target_id` text NOT NULL,
	`target_role` text NOT NULL,
	`kind` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relations_unique` ON `relations` (`actor_id`,`target_id`,`kind`);
--> statement-breakpoint
CREATE INDEX `relations_target` ON `relations` (`target_id`,`kind`);
