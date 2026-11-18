CREATE TABLE `company_ai_credits` (
  `company_id` text PRIMARY KEY NOT NULL,
  `full_left` integer NOT NULL DEFAULT 0,
  `rank_left` integer NOT NULL DEFAULT 0,
  `updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_ai_topups` (
  `id` text PRIMARY KEY NOT NULL,
  `company_id` text NOT NULL,
  `pack_id` text NOT NULL,
  `full_count` integer NOT NULL,
  `rank_count` integer NOT NULL,
  `price_cents` integer NOT NULL,
  `invoice_id` text NOT NULL DEFAULT '',
  `created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `company_ai_topups_company` ON `company_ai_topups` (`company_id`);
