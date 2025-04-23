"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await signOut({
          fetchOptions: {
            onResponse: () => {
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
      <LogOut className="mr-2 h-4 w-4" />
      Log Out
    </Button>
  );
}
