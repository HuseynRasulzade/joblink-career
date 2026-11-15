CREATE TABLE `company_ai_plans` (
  `company_id` text PRIMARY KEY NOT NULL,
  `plan_id` text NOT NULL,
  `started` text NOT NULL,
  `updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_ai_usage` (
  `company_id` text NOT NULL,
  `month` text NOT NULL,
  `full_used` integer NOT NULL DEFAULT 0,
  `rank_used` integer NOT NULL DEFAULT 0,
  PRIMARY KEY (`company_id`, `month`)
);
--> statement-breakpoint
-- The companies that exist now (all of them test accounts before the launch) keep working with the Peşəkar quotas.
INSERT INTO `company_ai_plans` (`company_id`, `plan_id`, `started`, `updated`)
  SELECT `id`, 'pro', datetime('now'), datetime('now') FROM `accounts` WHERE `role` = 'company';
