CREATE TABLE `workflow_fragments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`graph_snapshot` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_fragments_created_at` ON `workflow_fragments` (`created_at`);
