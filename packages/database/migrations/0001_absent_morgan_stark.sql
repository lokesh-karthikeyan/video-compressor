CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`original_key` text NOT NULL,
	`output_key` text,
	`original_size` integer NOT NULL,
	`output_size` integer,
	`status` text DEFAULT 'pending_upload' NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`options` text NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	`processing_started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
