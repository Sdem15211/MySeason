import { CopyButton } from "@/components/features/analysis/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorItem } from "./color-list-card";
interface ColorInfo {
  name: string;
  hex: string;
}

interface MakeupCardProps {
  title: string;
  description: string;
  color: ColorInfo;
}

export const MakeupCard = ({ title, description, color }: MakeupCardProps) => (
  <Card className="overflow-hidden w-full p-6">
    <CardHeader className="p-0 justify-start">
      <CardTitle className="text-xs text-brown/60 font-medium">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0 flex justify-between items-center">
      <p className="text-foreground text-sm tracking-tight leading-normal">
        {description}
      </p>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-xl border border-black/10 shadow"
          style={{ backgroundColor: color.hex }}
          title={`${color.name} (${color.hex})`}
        />
        <div className="flex gap-1 items-center">
          <p className="text-xs text-muted-foreground">{color.hex}</p>
          <CopyButton textToCopy={color.hex} />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface MakeupColorCardProps {
  title: string;
  colors: ColorInfo[];
}

export const MakeupColorCard = ({ title, colors }: MakeupColorCardProps) => (
  <Card className="overflow-hidden w-full p-6">
    <CardHeader className="p-0 justify-start mb-12">
      <CardTitle className="text-xs text-brown/60 font-medium">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0 flex flex-col gap-6">
      {colors.map((color) => (
        <ColorItem key={color.hex} name={color.name} hex={color.hex} />
      ))}
    </CardContent>
  </Card>
);
