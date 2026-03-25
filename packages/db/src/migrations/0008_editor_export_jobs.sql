CREATE TABLE `editor_export_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL DEFAULT 'pending',
	`payload` text NOT NULL,
	`total_duration_ms` integer NOT NULL,
	`scene_count` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_editor_export_jobs_project_id` ON `editor_export_jobs` (`project_id`);
