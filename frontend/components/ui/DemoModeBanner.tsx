import { FlaskConical } from "lucide-react";

export function DemoModeBanner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning ${className ?? ""}`}
    >
      <FlaskConical size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="font-medium">Demo mode — no trained model loaded yet</p>
        <p className="text-warning/80 mt-0.5">
          This segmentation is a synthetic placeholder so you can test the full workflow before
          training finishes. Drop your trained checkpoint into{" "}
          <code className="mono-numeric bg-warning/10 px-1 py-0.5 rounded">
            backend/models_store/model.pt
          </code>{" "}
          and restart the backend to see real predictions.
        </p>
      </div>
    </div>
  );
}
