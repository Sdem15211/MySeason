import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming Shadcn Button is available
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2 text-foreground">
        Page Not Found
      </h2>
      <p className="text-muted-foreground mb-6">
        Could not find the requested resource.
      </p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}
