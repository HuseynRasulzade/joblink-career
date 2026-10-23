CREATE TABLE `ai_usage` (
	`day` text NOT NULL,
	`feature` text NOT NULL,
	`provider` text NOT NULL,
	`user_id` text DEFAULT '' NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL,
	`chars_in` integer DEFAULT 0 NOT NULL,
	`chars_out` integer DEFAULT 0 NOT NULL,
	`errors` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `feature`, `provider`, `user_id`)
);
