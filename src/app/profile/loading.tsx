import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingProfile() {
  return (
    <div className="container mx-auto pt-24 pb-24 max-w-7xl px-4 lg:px-0">
      <div className="flex flex-col w-full items-center mb-8 lg:mb-12">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-10 w-48 mb-3" />
      </div>
    </div>
  );
}
