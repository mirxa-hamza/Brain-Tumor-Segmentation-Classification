"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { ClassLegend } from "./ClassLegend";
import type { ClassVolumeStat } from "@/lib/types";

export interface NiivueViewerProps {
  backgroundUrl: string;
  backgroundName: string;
  overlayUrl?: string | null;
  showOverlay: boolean;
  overlayOpacity: number;
  sliceType: "axial" | "coronal" | "sagittal" | "multiplanar" | "render";
  visibleRegions?: string[];
  stats?: ClassVolumeStat[];
  onToggleRegion?: (key: string) => void;
}

// BraTS label convention: 0 = background, 1 = NCR/NET, 2 = ED, 4 = ET.
const getSegmentationColormap = (visibleRegions?: string[]) => {
  const cmap = {
    R: [0, 14, 250, 239],
    G: [0, 165, 204, 68],
    B: [0, 233, 21, 68],
    A: [0, 200, 200, 200],
    I: [0, 1, 2, 4],
    labels: ["Background", "Necrotic Core (NCR/NET)", "Edema (ED)", "Enhancing Tumor (ET)"],
  };
  if (visibleRegions) {
    cmap.A[1] = visibleRegions.includes("ncr") ? 200 : 0;
    cmap.A[2] = visibleRegions.includes("ed") ? 200 : 0;
    cmap.A[3] = visibleRegions.includes("et") ? 200 : 0;
  }
  return cmap;
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
  visibleRegions,
  stats,
  onToggleRegion,
}: NiivueViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
          nv.volumes[1].setColormapLabel(getSegmentationColormap(visibleRegions));
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

  // Visible regions changes: update colormap labels dynamically.
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || !showOverlay || nv.volumes?.length < 2) return;
    nv.volumes[1].setColormapLabel(getSegmentationColormap(visibleRegions));
    nv.updateGLVolume?.();
  }, [visibleRegions, showOverlay]);

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

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black ${
        isFullscreen ? "h-screen rounded-none" : "aspect-square sm:aspect-video rounded-lg border border-border"
      }`}
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-label="NIfTI brain scan viewer" />
      
      {/* Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>

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
