"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CopyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  textToCopy: string;
}

export function CopyButton({
  textToCopy,
  className,
  ...props
}: CopyButtonProps) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setHasCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setHasCopied(false), 2000); // Reset icon after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy to clipboard.");
    }
  };

  return (
    <Button
      variant="ghost" // Use ghost variant for less visual clutter inline
      size="icon"
      className={cn("h-6 w-6 ml-1", className)} // Adjust size and margin
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      {...props}
    >
      {hasCopied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
