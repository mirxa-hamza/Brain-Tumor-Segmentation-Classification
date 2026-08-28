import { Brain, Upload, ScanEye, LineChart, ArrowRight, Layers3 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { BackendStatusCard } from "@/components/dashboard/BackendStatusCard";
import { CaseList } from "@/components/dashboard/CaseList";
import { StatCard } from "@/components/ui/StatCard";

const PIPELINE = [
  {
    icon: Upload,
    title: "1. Upload a case",
    description: "Drop a patient's T1, T1-CE, T2, and FLAIR NIfTI scans, or a zipped case folder.",
  },
  {
    icon: Layers3,
    title: "2. Preprocess & segment",
    description:
      "The backend normalizes each modality and runs the 3D U-Net to predict tumor sub-regions.",
  },
  {
    icon: ScanEye,
    title: "3. Explore in 3D",
    description: "Scroll through axial, coronal, and sagittal slices with the segmentation overlay.",
  },
  {
    icon: LineChart,
    title: "4. Review metrics",
    description: "Check per-class Dice scores and volumes once your Kaggle-trained model is loaded.",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-5">
            <Brain size={14} aria-hidden="true" />
            BraTS 2021 Task 1 &middot; local inference
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-text leading-tight">
            Brain tumor segmentation,
            <br className="hidden sm:block" /> viewed the way radiologists think.
          </h1>
          <p className="mt-4 text-base text-text-muted max-w-xl leading-relaxed">
            NeuroScan AI turns multi-modal MRI scans into an interactive 3D viewer with
            tumor sub-region overlays — necrotic core, edema, and enhancing tumor — computed by a
            3D U-Net you train yourself on Kaggle and run entirely on your own machine.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/upload" size="lg">
              Upload a case <ArrowRight size={16} aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/about" size="lg" variant="secondary">
              How it works
            </ButtonLink>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Tumor sub-regions" value="3" icon={Layers3} hint="NCR/NET, ED, ET" />
          <StatCard label="MRI modalities" value="4" icon={ScanEye} hint="T1, T1-CE, T2, FLAIR" />
          <StatCard label="Model architecture" value="3D U-Net" icon={Brain} hint="4→3 channels" />
          <StatCard label="Runs on" value="localhost" icon={Upload} hint="No cloud, no auth" />
        </div>
      </section>

      <BackendStatusCard />

      <section aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="text-lg font-semibold text-text mb-4">
          The pipeline
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/30 mb-4">
                <Icon size={18} aria-hidden="true" />
              </span>
              <h3 className="text-sm font-semibold text-text">{title}</h3>
              <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <CaseList />
    </div>
  );
}
