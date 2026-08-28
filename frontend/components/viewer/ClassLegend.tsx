import type { ClassVolumeStat } from "@/lib/types";
import { formatVolume } from "@/lib/utils";

export function ClassLegend({ stats }: { stats: ClassVolumeStat[] }) {
  const regions = stats.filter((s) => s.key === "ncr" || s.key === "ed" || s.key === "et");

  return (
    <ul className="space-y-2" aria-label="Segmentation class legend">
      {regions.map((s) => (
        <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2.5 min-w-0">
            <span
              className="h-3 w-3 rounded-sm shrink-0 ring-1 ring-white/10"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="text-text truncate">{s.label}</span>
          </span>
          <span className="mono-numeric text-text-muted shrink-0">{formatVolume(s.volume_cm3)}</span>
        </li>
      ))}
    </ul>
  );
}
