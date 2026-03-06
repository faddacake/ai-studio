import type { NodeDefinition, PortDefinition } from "./nodeDefinition.js";
import type { Port } from "./workflowSchema.js";
import { PORT_COMPATIBILITY } from "./portTypes.js";

/**
 * Extract default parameter values from a node definition's parameter schema.
 * Returns a Record<string, unknown> suitable for use as `node.data.params`.
 */
export function getDefaultParams(def: NodeDefinition): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const field of def.parameterSchema) {
    if (field.defaultValue !== undefined) {
      params[field.key] = field.defaultValue;
    }
  }
  return params;
}

/**
 * Convert a NodeDefinition's PortDefinitions into the Port[] format
 * used by the workflow schema. This is used when creating a new node
 * on the canvas from a registry definition.
 */
export function toWorkflowPorts(portDefs: PortDefinition[], direction: "input" | "output"): Port[] {
  return portDefs.map((pd) => ({
    id: pd.id,
    name: pd.label,
    type: pd.type,
    direction,
    isArray: pd.isArray,
  }));
}

/**
 * Validate parameter values against a node definition's schema.
 * Returns an array of error messages, or empty array if valid.
 */
export function validateParams(
  def: NodeDefinition,
  params: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  for (const field of def.parameterSchema) {
    const value = params[field.key];
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push(`${field.label} is required`);
      continue;
    }
    if (value === undefined || value === null) continue;

    if (field.type === "number" && typeof value === "number") {
      if (field.min !== undefined && value < field.min) {
        errors.push(`${field.label} must be at least ${field.min}`);
      }
      if (field.max !== undefined && value > field.max) {
        errors.push(`${field.label} must be at most ${field.max}`);
      }
    }
    if (field.type === "enum" && field.options) {
      const validValues = field.options.map((o) => o.value);
      if (!validValues.includes(String(value))) {
        errors.push(`${field.label} must be one of: ${validValues.join(", ")}`);
      }
    }
  }
  return errors;
}

/**
 * Check if two port definitions are compatible for connection.
 * Uses the PORT_COMPATIBILITY matrix from portTypes.ts.
 */
export function arePortsCompatible(
  sourcePort: PortDefinition,
  targetPort: PortDefinition,
): boolean {
  const compat = PORT_COMPATIBILITY[sourcePort.type];
  return compat ? compat[targetPort.type] === true : false;
}

/**
 * Get a human-readable summary of a node definition.
 * Useful for palette tooltips and search results.
 */
export function getNodeSummary(def: NodeDefinition): string {
  const inCount = def.inputs.length;
  const outCount = def.outputs.length;
  const paramCount = def.parameterSchema.length;
  return `${def.description} (${inCount} inputs, ${outCount} outputs, ${paramCount} parameters)`;
}
