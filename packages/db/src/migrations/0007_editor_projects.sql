CREATE TABLE `editor_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`aspect_ratio` text NOT NULL DEFAULT '16:9',
	`scenes` text NOT NULL DEFAULT '[]',
	`audio_track` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_editor_projects_created_at` ON `editor_projects` (`created_at`);
