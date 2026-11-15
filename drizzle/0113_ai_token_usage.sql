CREATE TABLE `ai_token_usage` (
  `user_id` text NOT NULL,
  `period` text NOT NULL,
  `tokens` integer NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`, `period`)
);
