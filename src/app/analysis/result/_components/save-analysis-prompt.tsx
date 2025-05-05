import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export const SaveAnalysisPrompt = () => (
  <Card className="bg-gradient-to-t from-[#ED6F3F] to-[#F48257] shadow-season lg:w-full w-full flex flex-col gap-4">
    <CardHeader className="flex flex-col items-start gap-3">
      <AlertCircle className="w-6 h-6 text-black" />
      <div className="flex flex-col gap-2">
        <CardTitle className="text-xl font-bold text-black tracking-tighter">
          Save your analysis
        </CardTitle>
        <CardDescription className="text-xs text-black">
          <span className="font-bold">Log in</span> or{" "}
          <span className="font-bold">Sign up for free</span> to save your
          analysis. This is the only way to view your analysis results later.
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent className="flex lg:flex-col gap-3 w-full">
      <Button asChild variant="secondary" className="flex-1">
        <Link href="/auth/signin">Log In</Link>
      </Button>
      <Button
        asChild
        variant="outline"
        className="bg-transparent hover:bg-white/20 flex-1"
      >
        <Link href="/auth/signup">Sign Up</Link>
      </Button>
    </CardContent>
  </Card>
);
