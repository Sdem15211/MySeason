import { CopyButton } from "@/components/features/analysis/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ColorInfo {
  name: string;
  hex: string;
}

export const ColorItem = ({ name, hex }: ColorInfo) => (
  <div className="flex items-center justify-between border-b border-black/10 pb-6 last:border-b-0 last:pb-0">
    <div className="flex items-start gap-8">
      <div
        className="w-20 h-20 rounded-xl border border-black/10 shadow"
        style={{ backgroundColor: hex }}
        title={`${name} (${hex})`}
      />
      <div className="flex flex-col gap-1 pt-2">
        <p className="title text-brown">{name}</p>
        <p className="text-xs text-muted-foreground">{hex}</p>
      </div>
    </div>
    <CopyButton textToCopy={hex} />
  </div>
);

interface ColorListCardProps {
  title: string;
  colors: ColorInfo[];
}

export const ColorListCard = ({ title, colors }: ColorListCardProps) => (
  <Card className="overflow-hidden w-full p-6">
    <CardHeader className="p-0 justify-start mb-12">
      <CardTitle className="text-lg font-semibold text-brown tracking-tighter">
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
