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
  R: [0, 249, 250, 239],
  G: [0, 115, 204, 68],
  B: [0, 22, 21, 68],
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
  useEffect(() => {
    let cancelled = false;

    async function loadVolumes() {
      const nv = nvRef.current;
      if (!nv) return;
      setLoading(true);
      setError(null);
      try {
        const { SLICE_TYPE } = await import("@niivue/niivue");
        const volumeList: Record<string, unknown>[] = [
          { url: backgroundUrl, name: backgroundName, colormap: "gray", opacity: 1 },
        ];
        if (showOverlay && overlayUrl) {
          volumeList.push({ url: overlayUrl, name: "segmentation", colormap: "gray", opacity: overlayOpacity });
        }
        await nv.loadVolumes(volumeList);
        if (cancelled) return;

        if (showOverlay && overlayUrl && nv.volumes.length > 1) {
          nv.setColormapLabel(1, SEGMENTATION_LABEL_COLORMAP);
          nv.volumes[1].opacity = overlayOpacity;
        }

        const sliceMap: Record<string, number> = {
          axial: SLICE_TYPE.AXIAL,
          coronal: SLICE_TYPE.CORONAL,
          sagittal: SLICE_TYPE.SAGITTAL,
          multiplanar: SLICE_TYPE.MULTIPLANAR,
          render: SLICE_TYPE.RENDER,
        };
        nv.setSliceType(sliceMap[sliceType]);
        nv.updateGLVolume?.();
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
  }, [backgroundUrl, overlayUrl, showOverlay]);

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
