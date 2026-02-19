export default function WorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Workflow Editor</h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Canvas will be implemented in T-008.</p>
    </div>
  );
}
