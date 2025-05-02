import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingAnalysisResult() {
  return (
    <div className="container mx-auto pt-24 pb-24 max-w-7xl px-4 lg:px-0">
      <div className="flex flex-col w-full items-center mb-8 lg:mb-12">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-10 w-48 mb-3" />
      </div>
      <div className="flex flex-col gap-12 lg:gap-0 lg:flex-row w-full justify-between items-center lg:items-start lg:px-6">
        {/* Sidebar Skeleton */}
        <div className="flex lg:flex-col items-start justify-start gap-3 lg:w-[14rem] mb-8 lg:sticky lg:top-58">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        {/* Main Content Skeleton */}
        <div className="max-w-[31.25rem] w-full space-y-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        {/* Right Sidebar Skeleton */}
        <div className="w-full md:w-60 space-y-4 lg:sticky lg:top-58">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
