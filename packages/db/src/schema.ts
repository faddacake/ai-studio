import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const workflows = sqliteTable(
  "workflows",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").default(""),
    graph: text("graph").notNull(), // JSON: WorkflowGraph
    workflowVersion: integer("workflow_version").notNull().default(1),
    isTemplate: integer("is_template", { mode: "boolean" }).default(false),
    templateSource: text("template_source"), // 'builtin' | 'user' | null
    tags: text("tags").default("[]"), // JSON: string[]
    isPinned: integer("is_pinned", { mode: "boolean" }).default(false),
    lastRunId: text("last_run_id"),
    lastRunStatus: text("last_run_status"),
    lastRunAt: text("last_run_at"),
    lastRunError: text("last_run_error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [index("idx_workflows_deleted_at").on(table.deletedAt)],
);

export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id),
    status: text("status").notNull(), // pending | running | completed | failed | partial_failure | cancelled | budget_exceeded
    graphSnapshot: text("graph_snapshot").notNull(),
    graphVersion: integer("graph_version").notNull(),
    budgetCap: real("budget_cap"),
    budgetMode: text("budget_mode").default("hard_stop"),
    totalCost: real("total_cost").default(0),
    error: text("error"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_runs_workflow_id").on(table.workflowId),
    index("idx_runs_status").on(table.status),
  ],
);

export const nodeExecutions = sqliteTable(
  "node_executions",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id),
    nodeId: text("node_id").notNull(),
    status: text("status").notNull(), // pending | queued | running | awaiting_download | completed | failed | cancelled
    attempt: integer("attempt").default(1),
    cost: real("cost"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    inputs: text("inputs"), // JSON
    outputs: text("outputs"), // JSON
    error: text("error"),
    providerId: text("provider_id"),
    modelId: text("model_id"),
    debugDir: text("debug_dir"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_node_executions_run_id").on(table.runId)],
);

export const providerConfigs = sqliteTable("provider_configs", {
  id: text("id").primaryKey(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  validatedAt: text("validated_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const modelSchemaCache = sqliteTable(
  "model_schema_cache",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id").notNull(),
    modelId: text("model_id").notNull(),
    schema: text("schema").notNull(), // JSON
    fetchedAt: text("fetched_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [
    index("idx_model_schema_cache_lookup").on(table.providerId, table.modelId),
  ],
);

export const pricingOverrides = sqliteTable("pricing_overrides", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  modelId: text("model_id").notNull(),
  pricing: text("pricing").notNull(), // JSON
  updatedAt: text("updated_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON-encoded
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    action: text("action").notNull(),
    details: text("details"), // JSON
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_audit_logs_created_at").on(table.createdAt)],
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const workflowFragments = sqliteTable(
  "workflow_fragments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    graphSnapshot: text("graph_snapshot").notNull(), // JSON: { nodes, edges }
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_workflow_fragments_created_at").on(table.createdAt)],
);

export const nodePresets = sqliteTable(
  "node_presets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nodeType: text("node_type").notNull(),
    params: text("params").notNull(), // JSON: Record<string, unknown>
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_node_presets_node_type").on(table.nodeType)],
);

export const workflowRevisions = sqliteTable(
  "workflow_revisions",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id),
    label: text("label"),
    graphSnapshot: text("graph_snapshot").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_workflow_revisions_workflow_id").on(table.workflowId)],
);
