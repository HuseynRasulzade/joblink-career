CREATE TABLE `candidate_notes` (
  `id` text PRIMARY KEY NOT NULL,
  `company_id` text NOT NULL,
  `candidate_id` text NOT NULL,
  `author_id` text NOT NULL,
  `author_name` text NOT NULL DEFAULT '',
  `text` text NOT NULL,
  `created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `candidate_notes_lookup` ON `candidate_notes` (`company_id`, `candidate_id`, `created`);
