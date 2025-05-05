import { Card, CardContent } from "@/components/ui/card";

interface ColorInfo {
  name: string;
  hex: string;
}
interface HairCardProps {
  description: string;
  title: string;
  icon: React.ReactNode;
  color?: ColorInfo;
}
export const HairCard = ({
  description,
  title,
  icon,
  color,
}: HairCardProps) => (
  <Card className="border-black/25 p-0">
    <CardContent className="p-5 space-y-2 relative">
      {icon}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-brown/60 font-medium">{title}</p>
        <p className="text-foreground text-sm tracking-tight leading-normal max-w-[90%]">
          {description}
        </p>
        {color && (
          <div
            className="w-20 h-20 rounded-xl border border-black/10 shadow mt-4"
            style={{ backgroundColor: color.hex }}
          />
        )}
      </div>
    </CardContent>
  </Card>
);
