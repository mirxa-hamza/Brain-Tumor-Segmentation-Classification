"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export interface NiivueViewerProps {
  backgroundUrl: string;
  backgroundName: string;
  overlayUrl?: string | null;
  showOverlay: boolean;
  overlayOpacity: number;
  sliceType: "axial" | "coronal" | "sagittal" | "multiplanar" | "render";
}

// BraTS label convention: 0 = background, 1 = NCR/NET, 2 = ED, 4 = ET.
// Colors match the fixed segmentation palette in globals.css / design-system.md.
const SEGMENTATION_LABEL_COLORMAP = {
  R: [0, 14, 250, 239],
  G: [0, 165, 204, 68],
  B: [0, 233, 21, 68],
  A: [0, 200, 200, 200],
  I: [0, 1, 2, 4],
  labels: ["Background", "Necrotic Core (NCR/NET)", "Edema (ED)", "Enhancing Tumor (ET)"],
};

/**
 * WebGL NIfTI viewer powered by @niivue/niivue. Loaded exclusively on the client
 * (see the `next/dynamic(..., { ssr: false })` wrapper wherever this is used) because
 * it touches the DOM canvas / WebGL context directly.
 */
export function NiivueViewer({
  backgroundUrl,
  backgroundName,
  overlayUrl,
  showOverlay,
  overlayOpacity,
  sliceType,
}: NiivueViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Becomes true once Niivue has finished its async init and is attached to
  // the canvas. The loadVolumes effect depends on this so it re-runs as soon
  // as the viewer is ready (fixing the race condition where nvRef.current is
  // still null when the effect first fires).
  const [nvReady, setNvReady] = useState(false);

  // Initial mount: create the Niivue instance once.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { Niivue } = await import("@niivue/niivue");
        if (cancelled || !canvasRef.current) return;
        const nv = new Niivue({
          backColor: [0.039, 0.059, 0.102, 1], // matches --bg
          show3Dcrosshair: true,
          dragAndDropEnabled: false,
        });
        await nv.attachToCanvas(canvasRef.current);
        nvRef.current = nv;
        if (!cancelled) setNvReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error("NiiVue failed to initialize", err);
          setError("The 3D viewer failed to start. Your browser may not support WebGL2.");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload volumes whenever the background modality or overlay visibility changes.
  // Also re-runs when nvReady flips to true, which fires the initial load after
  // the async Niivue init completes (fixes the race with nvRef.current === null).
  useEffect(() => {
    let cancelled = false;

    async function loadVolumes() {
      const nv = nvRef.current;
      if (!nv) return;
      // Guard: NiiVue calls .toUpperCase() on each volume's url/name to detect
      // the file extension. Ensure both are non-empty strings before proceeding.
      if (!backgroundUrl) return;
      const safeUrl = String(backgroundUrl);
      // NiiVue's getFileExt() is called on `name || url`. If name has no dot
      // the regex returns undefined and .toUpperCase() crashes. Ensure name
      // always ends in .nii.gz so NiiVue can detect the type correctly.
      const ensureNiiGz = (s: string) =>
        s.endsWith(".nii.gz") || s.endsWith(".nii") ? s : `${s}.nii.gz`;
      const safeName = ensureNiiGz(String(backgroundName || "scan"));

      setLoading(true);
      setError(null);
      try {
        const { SLICE_TYPE } = await import("@niivue/niivue");
        const volumeList: Record<string, unknown>[] = [
          { url: safeUrl, name: safeName, colormap: "gray", opacity: 1 },
        ];
        if (showOverlay && overlayUrl) {
          volumeList.push({
            url: String(overlayUrl),
            name: "segmentation.nii.gz",
            opacity: overlayOpacity,
          });
        }
        await nv.loadVolumes(volumeList);

        if (cancelled) return;

        if (showOverlay && overlayUrl && nv.volumes.length > 1) {
          // Use setColormapLabel() on the volume object to properly parse the label lut.
          nv.volumes[1].setColormapLabel(SEGMENTATION_LABEL_COLORMAP);
          nv.volumes[1].opacity = overlayOpacity;
          nv.updateGLVolume?.();
        }

        const sliceMap: Record<string, number> = {
          axial: SLICE_TYPE.AXIAL,
          coronal: SLICE_TYPE.CORONAL,
          sagittal: SLICE_TYPE.SAGITTAL,
          multiplanar: SLICE_TYPE.MULTIPLANAR,
          render: SLICE_TYPE.RENDER,
        };
        nv.setSliceType(sliceMap[sliceType]);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("NiiVue failed to load volumes", err);
          setError("Couldn't load this scan. Check that the backend is running and reachable.");
          setLoading(false);
        }
      }
    }

    loadVolumes();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nvReady, backgroundUrl, overlayUrl, showOverlay]);

  // Opacity-only changes: avoid a full volume reload.
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || !showOverlay || nv.volumes?.length < 2) return;
    nv.volumes[1].opacity = overlayOpacity;
    nv.updateGLVolume?.();
  }, [overlayOpacity, showOverlay]);

  // Slice-type-only changes.
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv) return;
    (async () => {
      const { SLICE_TYPE } = await import("@niivue/niivue");
      const sliceMap: Record<string, number> = {
        axial: SLICE_TYPE.AXIAL,
        coronal: SLICE_TYPE.CORONAL,
        sagittal: SLICE_TYPE.SAGITTAL,
        multiplanar: SLICE_TYPE.MULTIPLANAR,
        render: SLICE_TYPE.RENDER,
      };
      nv.setSliceType(sliceMap[sliceType]);
    })();
  }, [sliceType]);

  return (
    <div className="relative aspect-square sm:aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
      <canvas ref={canvasRef} className="h-full w-full" aria-label="NIfTI brain scan viewer" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Spinner size={28} label="Loading scan" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-6 text-center">
          <AlertTriangle size={24} className="text-destructive" aria-hidden="true" />
          <p className="text-sm text-text">{error}</p>
        </div>
      )}
    </div>
  );
}
