CREATE TABLE `billing_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'AZN' NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `billing_invoices_account` ON `billing_invoices` (`account_id`);
--> statement-breakpoint
CREATE INDEX `billing_invoices_due` ON `billing_invoices` (`due_date`);
--> statement-breakpoint
CREATE INDEX `billing_invoices_status` ON `billing_invoices` (`status`);
--> statement-breakpoint
CREATE TABLE `billing_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'AZN' NOT NULL,
	`method` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`paid_at` text NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `billing_payments_invoice` ON `billing_payments` (`invoice_id`);
--> statement-breakpoint
CREATE INDEX `billing_payments_account` ON `billing_payments` (`account_id`);
--> statement-breakpoint
CREATE INDEX `billing_payments_paid_at` ON `billing_payments` (`paid_at`);
