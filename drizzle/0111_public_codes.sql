ALTER TABLE `accounts` ADD `public_code` text;
--> statement-breakpoint
UPDATE `accounts` SET `public_code` = 'JM-' || upper(hex(randomblob(5))) WHERE `public_code` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_public_code` ON `accounts` (`public_code`);
