import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { QuestionnaireForm } from "./_components/questionnaire-form"; // Client component

interface QuestionnairePageProps {
  params: {
    sessionId: string;
  };
}

export default async function QuestionnairePage({
  params,
}: QuestionnairePageProps) {
  const sessionId = (await params).sessionId;

  if (!sessionId) {
    console.error("QuestionnairePage: Missing sessionId in params");
    notFound(); // Or redirect to an error page/home
  }

  let session;
  try {
    const results = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    session = results[0];
  } catch (error) {
    console.error(
      `QuestionnairePage: Database error fetching session ${sessionId}:`,
      error
    );
    // Consider showing a generic error message page instead of notFound
    throw new Error("Failed to load session data. Please try again later.");
    // Or: return <ErrorMessage message="..." />
  }

  if (!session) {
    console.log(`QuestionnairePage: Session not found for ID: ${sessionId}`);
    notFound();
  }

  // Check if session has expired
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    console.log(`QuestionnairePage: Session ${sessionId} has expired.`);
    // Redirect to an expired session page or home
    // For now, just show not found, but a dedicated page is better UX
    notFound();
    // redirect("/session-expired"); // Example redirect
  }

  // Check if the session status is correct
  if (session.status !== "awaiting_questionnaire") {
    console.warn(
      `QuestionnairePage: Session ${sessionId} has invalid status: ${session.status}`
    );
    // Redirect based on status? Or just show error/not found?
    // If already completed, maybe redirect to processing?
    if (
      session.status === "questionnaire_complete" ||
      session.status === "analysis_pending"
    ) {
      redirect(`/analysis/${sessionId}/processing`); // Redirect if questionnaire already done
    }
    // For other statuses, treat as invalid access
    notFound(); // Or show an error message
  }

  // Session is valid and awaiting questionnaire
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Color Analysis Questionnaire
      </h1>
      <p className="mb-8 text-center text-muted-foreground">
        Please answer the following questions to help us provide the most
        accurate analysis.
      </p>
      {/* Render the client component responsible for the form logic */}
      <QuestionnaireForm sessionId={sessionId} />
    </div>
  );
}
