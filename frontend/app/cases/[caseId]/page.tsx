import { CaseDetailClient } from "@/components/cases/CaseDetailClient";

export default function CasePage({ params }: { params: { caseId: string } }) {
  return <CaseDetailClient caseId={params.caseId} />;
}
