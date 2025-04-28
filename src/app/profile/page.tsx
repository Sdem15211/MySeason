import { redirect } from "next/navigation";
import Link from "next/link";
import { headers as getHeaders } from "next/headers";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ArrowRight } from "lucide-react";
import type { AnalysisOutput } from "@/lib/schemas/analysis-output.schema";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
interface UserAnalysis {
  id: string;
  createdAt: Date;
  result: AnalysisOutput;
}

export default async function ProfilePage() {
  const headers = await getHeaders();
  let session;
  try {
    session = await auth.api.getSession({ headers });
  } catch (error) {
    console.error("Error fetching session on profile page:", error);
    redirect("/auth/signin?error=SessionFetchError");
  }

  if (!session?.user || session.user.isAnonymous) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen max-w-[28rem] mx-auto p-6">
        <div className="mb-6">
          <Logo className="w-32 h-32" />
        </div>
        <p className="title mb-6">Looks like you're not signed in 😞</p>
        <Button variant="season" className="w-full" asChild>
          <Link href="/auth/signin">Log in</Link>
        </Button>
        <Button
          variant="outline"
          className="w-full border-brown/25 mt-2"
          asChild
        >
          <Link href="/auth/signup">Sign up for free</Link>
        </Button>
      </div>
    );
  }

  const userId = session.user.id;
  const userName = session.user.name ?? "User";

  let userAnalyses: UserAnalysis[] = [];
  try {
    const analysisResults = await db
      .select({
        id: analyses.id,
        createdAt: analyses.createdAt,
        result: analyses.result,
      })
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));
    userAnalyses = analysisResults as UserAnalysis[];
  } catch (error) {
    console.error(`Error fetching analyses for user ${userId}:`, error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full p-6">
        <p className="text-destructive">
          Could not load your analyses. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen px-6 pt-24 pb-20">
      <p className="text-center text-sm text-neutral-900/75 font-medium mb-12 tracking-tight">
        {userName}’s <span className="text-orange">MySeason</span> profile
      </p>

      <div className="w-full max-w-[500px]">
        <h2 className="text-xl font-bold text-brown tracking-tight mb-8">
          Your analyses
        </h2>

        {userAnalyses.length === 0 ? (
          <p className="text-center text-neutral-500">
            You have no saved analyses yet.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {userAnalyses.map((analysis) => (
              <Link
                key={analysis.id}
                href={`/analysis/result/${analysis.id}`}
                className="flex justify-between items-center w-full p-5 bg-white border border-black/25 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out"
              >
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-medium text-brown/75">
                    {formatDate(analysis.createdAt)}
                  </p>
                  <p className="text-xl font-semibold text-brown tracking-tight flex gap-2">
                    {analysis.result.season}
                    <span className="">
                      {analysis.result.season.includes("Spring")
                        ? "🌸"
                        : analysis.result.season.includes("Summer")
                        ? "☀️"
                        : analysis.result.season.includes("Autumn")
                        ? "🍂"
                        : "❄️"}
                    </span>
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-orange" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
