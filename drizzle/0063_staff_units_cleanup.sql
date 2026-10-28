DELETE FROM `staff_units` WHERE `company_id` NOT IN (SELECT `id` FROM `accounts`);
