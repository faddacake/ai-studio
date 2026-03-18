CREATE TABLE `node_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`node_type` text NOT NULL,
	`params` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_node_presets_node_type` ON `node_presets` (`node_type`);
