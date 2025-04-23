import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { LogoutButton } from "../auth/logout-button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const names = name.split(" ");
  if (names.length === 1) return names[0]?.[0]?.toUpperCase() || "?";
  return (names[0]?.[0] + (names.at(-1)?.[0] || "")).toUpperCase();
}

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isLoggedIn = session?.user && !session.user.isAnonymous;

  return (
    <nav className="bg-background border-b fixed top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          MySeason
        </Link>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="relative h-8 w-8 rounded-full cursor-pointer"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={session?.user.image ?? undefined}
                    alt={session?.user.name ?? "User avatar"}
                  />
                  <AvatarFallback>
                    {getInitials(session?.user.name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
