import { AnalysisProcessor } from "./_components/analysis-processor";
import { notFound } from "next/navigation";

interface ProcessingPageProps {
  params: {
    sessionId: string;
  };
}
export default async function ProcessingPage({ params }: ProcessingPageProps) {
  const sessionId = (await params).sessionId;

  if (!sessionId) {
    console.error("ProcessingPage: Missing sessionId in params");
    notFound();
  }

  return (
    <div className="container mx-auto h-screen flex flex-col items-center justify-center text-center">
      <AnalysisProcessor sessionId={sessionId} />
    </div>
  );
}
