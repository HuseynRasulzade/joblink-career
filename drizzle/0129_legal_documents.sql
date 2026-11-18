CREATE TABLE `legal_documents` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `category` text NOT NULL DEFAULT 'other',
  `effective_date` text NOT NULL DEFAULT '',
  `note` text NOT NULL DEFAULT '',
  `file_name` text NOT NULL,
  `file_type` text NOT NULL DEFAULT '',
  `size` integer NOT NULL DEFAULT 0,
  `chunks` integer NOT NULL DEFAULT 0,
  `analysis` text NOT NULL DEFAULT '',
  `analysis_source` text NOT NULL DEFAULT '',
  `uploaded_by` text NOT NULL DEFAULT '',
  `created` text NOT NULL,
  `updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `legal_chunks` (
  `doc_id` text NOT NULL,
  `idx` integer NOT NULL,
  `data` text NOT NULL,
  PRIMARY KEY (`doc_id`, `idx`)
);
