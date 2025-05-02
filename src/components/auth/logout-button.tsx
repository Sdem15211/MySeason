"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="ghost"
      disabled={loading}
      onClick={async () => {
        await signOut({
          fetchOptions: {
            onRequest: () => setLoading(true),
            onResponse: () => {
              setLoading(false);
              router.push("/auth/signin");
              router.refresh();
            },
            onError: (ctx) => {
              toast.error(ctx.error.message);
            },
          },
        });
      }}
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        <LogOut className="size-5" />
      )}
    </Button>
  );
}
