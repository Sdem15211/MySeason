import Image from "next/image";
import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Image
      src="/assets/myseason.svg"
      alt="MySeason"
      width={60}
      height={60}
      className={cn("w-15 h-15", className)}
    />
  );
};
