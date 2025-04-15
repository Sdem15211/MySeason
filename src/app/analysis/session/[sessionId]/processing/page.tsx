import { AnalysisProcessor } from "./_components/analysis-processor";
import { notFound } from "next/navigation";

interface ProcessingPageProps {
  params: {
    sessionId: string;
  };
}

// This page primarily acts as a container for the client component
// that handles the analysis triggering and status polling.
// We could add server-side checks here (e.g., verify session status briefly)
// but the core logic resides in the client component for polling.
export default async function ProcessingPage({ params }: ProcessingPageProps) {
  const sessionId = (await params).sessionId;

  if (!sessionId) {
    console.error("ProcessingPage: Missing sessionId in params");
    notFound();
  }

  // Optional: Basic session check on server before rendering client component
  // try {
  //   const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId), columns: { status: true } });
  //   if (!session || !['questionnaire_complete', 'analysis_pending', 'analysis_running', 'analysis_complete'].includes(session.status)) {
  //      console.warn(`ProcessingPage: Session ${sessionId} has invalid status for processing: ${session?.status}`);
  //      notFound(); // Or redirect based on status
  //   }
  // } catch (error) { ... }

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">Processing Your Analysis</h1>
      <p className="text-muted-foreground mb-8">
        Please wait while we generate your personalized color analysis. This may
        take a moment.
      </p>
      <AnalysisProcessor sessionId={sessionId} />
    </div>
  );
}
