import { UploadDropzone } from "@/components/upload/UploadDropzone";

export const metadata = { title: "Upload a case — NeuroScan AI" };

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-semibold text-text tracking-tight">Upload a case</h1>
      <p className="mt-2 text-sm text-text-muted max-w-xl">
        Provide the four standard BraTS modalities for one patient — T1, T1-CE, T2, and FLAIR —
        as separate <code className="mono-numeric">.nii.gz</code> files, or a single zipped case
        folder in the same layout as the BraTS 2021 dataset.
      </p>
      <div className="mt-8">
        <UploadDropzone />
      </div>
    </div>
  );
}
