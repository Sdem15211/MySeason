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
      variant="ghost"
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
      <LogOut className="size-5" />
    </Button>
  );
}
