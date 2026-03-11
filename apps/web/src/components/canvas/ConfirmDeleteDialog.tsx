"use client";

/**
 * ConfirmDeleteDialog — shown before deleting a node that has connected edges.
 *
 * Follows the same modal pattern as ConfirmReplaceDialog / SaveAsTemplateDialog.
 * The caller resolves a Promise<boolean> via onConfirm / onCancel so that
 * React Flow's onBeforeDelete can block or allow the deletion asynchronously.
 */

export interface ConfirmDeleteDialogProps {
  open: boolean;
  nodeLabel?: string;
  edgeCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  open,
  nodeLabel,
  edgeCount,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  if (!open) return null;

  const connections = edgeCount === 1 ? "1 connection" : `${edgeCount} connections`;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="mx-4 w-full max-w-sm overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-neutral-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-100">
            Delete node?
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 text-sm text-neutral-400 leading-relaxed">
          {nodeLabel ? (
            <>
              <span className="font-medium text-neutral-200">{nodeLabel}</span>{" "}
              has{" "}
            </>
          ) : (
            "This node has "
          )}
          <span className="font-medium text-neutral-200">{connections}</span>.
          {" "}Deleting it will also remove those edges.
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
