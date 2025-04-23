import { redirect } from "next/navigation";
import Link from "next/link";
import { headers as getHeaders } from "next/headers";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Calendar } from "lucide-react";

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
    console.log(
      `Redirecting from profile: User not logged in or is anonymous (isAnonymous: ${session?.user?.isAnonymous})`
    );
    redirect("/auth/signin");
  }

  const userId = session.user.id;

  let userAnalyses = [];
  try {
    userAnalyses = await db
      .select({
        id: analyses.id,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));
  } catch (error) {
    console.error(`Error fetching analyses for user ${userId}:`, error);
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Analyses</h1>
        </div>
        <p className="text-destructive">
          Could not load your analyses. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center w-screen h-screen px-4 py-12">
      {userAnalyses.length === 0 ? (
        <p className="text-muted-foreground">You have no saved analyses yet.</p>
      ) : (
        <div className="space-y-4">
          {userAnalyses.map((analysis) => (
            <Card key={analysis.id}>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Result</CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Calendar size={14} />
                  Saved: {new Date(analysis.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText size={14} /> ID: {analysis.id}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/analysis/result/${analysis.id}`}>
                    View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
