CREATE TABLE `payment_orders` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `plan_id` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `currency` text NOT NULL DEFAULT 'AZN',
  `status` text NOT NULL DEFAULT 'created',
  `provider` text NOT NULL DEFAULT '',
  `provider_ref` text NOT NULL DEFAULT '',
  `auto_renew` integer NOT NULL DEFAULT 0,
  `created` text NOT NULL,
  `updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payment_orders_account` ON `payment_orders` (`account_id`, `created`);
