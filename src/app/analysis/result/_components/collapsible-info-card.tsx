import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface InfoCardProps {
  title: string;
  value: string;
  explanation?: string;
  icon?: React.ElementType;
}

export const CollapsibleInfoCard = ({
  title,
  value,
  explanation,
  icon: Icon = Info,
}: InfoCardProps) => (
  <Card className="border-black/25 p-0">
    <CardContent className="p-5">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="explanation" className="border-none">
          <AccordionTrigger className="p-0 w-full cursor-pointer">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1 items-start">
                <p className="text-xs text-brown/60 font-medium">{title}</p>
                <p className="text-xl font-semibold text-brown tracking-tighter">
                  {value}
                </p>
              </div>
              <Icon className="w-6 h-6 text-orange" />
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm tracking-tight leading-normal pt-6 pb-0">
            {explanation}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
);
