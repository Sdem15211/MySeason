import { Card, CardContent } from "@/components/ui/card";

export const OverallVibeCard = ({ vibe }: { vibe: string }) => (
  <Card className="border-black/25 p-0">
    <CardContent className="p-5 space-y-2">
      <p className="text-xs text-brown/60 font-medium">Overall vibe</p>
      <p className="text-foreground text-sm tracking-tight leading-normal">
        {vibe}
      </p>
    </CardContent>
  </Card>
);
