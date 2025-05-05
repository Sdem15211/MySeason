import { Card, CardContent } from "@/components/ui/card";
interface ColorInfo {
  name: string;
  hex: string;
}

interface StyleCardProps {
  description: string;
  scenario: string;
  colors: ColorInfo[];
  icon: React.ReactNode;
}

export const StyleCard = ({
  description,
  scenario,
  colors,
  icon,
}: StyleCardProps) => (
  <Card className="border-black/25 p-0">
    <CardContent className="p-5 space-y-2 relative">
      {icon}
      <p className="text-xs text-brown/60 font-medium">{scenario}</p>
      <p className="text-foreground text-sm tracking-tight leading-normal max-w-[90%]">
        {description}
      </p>
      <div className="flex items-center gap-2 mt-6">
        {colors.map((color) => (
          <div
            key={color.hex}
            className="size-8 rounded-md border border-black/10 shadow"
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);
