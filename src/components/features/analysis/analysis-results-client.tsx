"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { AnalysisOutput } from "@/lib/schemas/analysis-output.schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  Briefcase,
  ArrowDown,
  ArrowUp,
  AlertCircle,
  Gem,
  Shirt,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import { ColorPassport } from "@/components/color-passport/color-passport";

import {
  CollapsibleInfoCard,
  OverallVibeCard,
  SaveAnalysisPrompt,
  ColorListCard,
  HairCard,
  MakeupCard,
  MakeupColorCard,
} from "@/app/analysis/result/_components";
import { metalGradients } from "@/lib/constants/metal-gradients";

interface AnalysisResultsClientProps {
  result: AnalysisOutput;
  showSavePrompt: boolean;
}

export function AnalysisResultsClient({
  result,
  showSavePrompt,
}: AnalysisResultsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passportImageDataUrl, setPassportImageDataUrl] = useState<
    string | null
  >(null);
  const [isLoadingPassport, setIsLoadingPassport] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);
  const passportRef = useRef<HTMLDivElement>(null);

  // Prepare props for the ColorPassport component
  const passportProps = useMemo(() => {
    const powerColorHex = result.powerColors.map((c) => c.hex);
    const avoidColorHex = result.colorsToAvoid.map((c) => c.hex);
    let foundationColorHex: string | undefined = undefined;
    let blushColorHex: string | undefined = undefined;
    let lipColorHex: string[] = [];
    let eyeColorHex: string[] = [];

    if (result.makeupRecommendations) {
      foundationColorHex =
        result.makeupRecommendations.foundationUndertoneGuidance?.color?.hex;
      blushColorHex =
        result.makeupRecommendations.blushRecommendation?.color?.hex;
      lipColorHex =
        result.makeupRecommendations.complementaryLipColors?.map(
          (c) => c.hex
        ) ?? [];
      eyeColorHex =
        result.makeupRecommendations.complementaryEyeColors?.map(
          (c) => c.hex
        ) ?? [];
    }

    return {
      season: result.season,
      undertone: result.undertone,
      contrast: result.contrastLevel,
      metalColor: result.primaryMetal,
      powerColors: powerColorHex,
      avoidColors: avoidColorHex,
      foundationColor: foundationColorHex,
      blushColor: blushColorHex,
      lipColors: lipColorHex,
      eyeColors: eyeColorHex,
    };
  }, [result]);

  // Function to generate the passport image
  const generatePassportImage = useCallback(async () => {
    if (!passportRef.current) {
      setPassportError(
        "Cannot generate passport: Component reference not found."
      );
      return;
    }

    setIsLoadingPassport(true);
    setPassportImageDataUrl(null);
    setPassportError(null);

    try {
      const canvas = await html2canvas(passportRef.current, {
        logging: true,
        useCORS: true,
        allowTaint: true,
        scale: 3,
      });
      const dataUrl = canvas.toDataURL("image/png");
      setPassportImageDataUrl(dataUrl);
      setIsModalOpen(true); // Open modal only after successful generation
    } catch (error) {
      console.error("Error generating color passport:", error);
      setPassportError("Failed to generate color passport image.");
    } finally {
      setIsLoadingPassport(false);
    }
  }, []); // No dependencies needed as it uses refs and state setters

  return (
    <>
      {/* Hidden component for rendering */}
      <div
        ref={passportRef}
        className="absolute top-0 -left-[9999px] pointer-events-none"
        aria-hidden="true"
      >
        <ColorPassport {...passportProps} />
      </div>

      <Tabs
        defaultValue="general"
        orientation="vertical"
        className="flex flex-col gap-12 lg:gap-0 lg:flex-row w-full justify-between items-center lg:items-start lg:px-6"
      >
        <TabsList className="flex lg:flex-col items-start justify-start bg-transparent gap-3 lg:w-[14rem] mb-8 lg:sticky lg:top-58">
          {/* Replicate TabsTriggers exactly */}
          <TabsTrigger
            value="general"
            className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="colors"
            className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
          >
            Colors
          </TabsTrigger>
          <TabsTrigger
            value="metal"
            className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
          >
            Metal
          </TabsTrigger>
          <TabsTrigger
            value="hair"
            className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
          >
            Hair
          </TabsTrigger>
          {result.makeupRecommendations && (
            <TabsTrigger
              value="makeup"
              className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
            >
              Makeup
            </TabsTrigger>
          )}
        </TabsList>

        <div className="max-w-[31.25rem] w-full">
          {/* Replicate TabsContent and nested components exactly */}
          <TabsContent value="general" className="flex flex-col gap-10">
            <div className="flex flex-col gap-3 items-start">
              <h2 className="title text-brown">Why this season?</h2>
              <p className="text-muted-foreground text-sm tracking-tight leading-normal">
                {result.seasonExplanation}
              </p>
            </div>
            <div className="flex flex-col gap-8">
              <CollapsibleInfoCard
                title="Undertone"
                value={result.undertone}
                explanation={result.undertoneExplanation}
              />
              <CollapsibleInfoCard
                title="Contrast Level"
                value={result.contrastLevel}
                explanation={result.contrastLevelExplanation}
              />
              <OverallVibeCard vibe={result.overallVibe} />
            </div>
          </TabsContent>

          <TabsContent value="colors" className="flex flex-col gap-8 w-full">
            <ColorListCard
              title="Power colors ✨"
              colors={result.powerColors}
            />
            <ColorListCard
              title="Colors to avoid 🚫"
              colors={result.colorsToAvoid}
            />
          </TabsContent>

          <TabsContent value="metal" className="flex flex-col gap-16">
            <div className="flex flex-col gap-8">
              <p className="text-lg font-semibold text-brown tracking-tighter">
                Metal Recommendations 💎
              </p>
              <Card className="border-black/25 p-0">
                <CardContent className="p-5 space-y-2 flex gap-8 items-center">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-brown/60 font-medium">
                      Best matching metal color
                    </p>
                    <p className="text-xl font-semibold text-brown tracking-tighter mb-2">
                      {result.primaryMetal}
                    </p>
                    <p className="text-foreground text-sm tracking-tight leading-normal">
                      {result.metalTonesExplanation}
                    </p>
                  </div>
                  <div
                    className="size-20 rounded-xl border border-black/10 shadow shrink-0"
                    style={{
                      background:
                        metalGradients[
                          result.primaryMetal as keyof typeof metalGradients
                        ] || "#EEEEEE", // Fallback color
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="hair" className="flex flex-col gap-8">
            <p className="text-lg font-semibold text-brown tracking-tighter">
              Hair color advice 💇🏻‍♂ ️💇🏼‍♀️
            </p>
            <HairCard
              description={result.hairColorGuidance.lighterToneEffect}
              title="Going lighter"
              icon={
                <ArrowUp className="size-5 text-orange absolute top-5 right-5" />
              }
            />
            <HairCard
              description={result.hairColorGuidance.darkerToneEffect}
              title="Going darker"
              icon={
                <ArrowDown className="size-5 text-orange absolute top-5 right-5" />
              }
            />
            <HairCard
              color={result.hairColorGuidance.colorToAvoid.color}
              description={result.hairColorGuidance.colorToAvoid.explanation}
              title="Color to avoid"
              icon={
                <AlertCircle className="size-5 text-orange absolute top-5 right-5" />
              }
            />
          </TabsContent>

          {result.makeupRecommendations && (
            <TabsContent value="makeup" className="flex flex-col gap-10">
              <div className="flex flex-col gap-3 items-start">
                <h2 className="title text-brown">Makeup advice 💄</h2>
                <p className="text-muted-foreground text-sm tracking-tight leading-normal">
                  {result.makeupRecommendations.generalMakeupAdvice}
                </p>
              </div>
              <MakeupCard
                title="Foundation Undertone"
                description={
                  result.makeupRecommendations.foundationUndertoneGuidance
                    .description
                }
                color={
                  result.makeupRecommendations.foundationUndertoneGuidance.color
                }
              />
              <MakeupCard
                title="Blush"
                description={
                  result.makeupRecommendations.blushRecommendation.description
                }
                color={result.makeupRecommendations.blushRecommendation.color}
              />
              <MakeupColorCard
                title="Lip colors"
                colors={result.makeupRecommendations.complementaryLipColors}
              />
              <MakeupColorCard
                title="Eye colors"
                colors={result.makeupRecommendations.complementaryEyeColors}
              />
            </TabsContent>
          )}
        </div>

        {/* Right Sidebar with Save Prompt and Download Button */}
        <div className="w-full md:w-60 space-y-4 lg:sticky lg:top-58">
          {showSavePrompt && <SaveAnalysisPrompt />}

          {/* Download Button */}
          <Button
            variant="season"
            className="w-full"
            onClick={generatePassportImage}
            disabled={isLoadingPassport}
          >
            {isLoadingPassport ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            {isLoadingPassport ? "Generating..." : "Download Color Passport"}
          </Button>
          {passportError && (
            <p className="text-xs text-destructive mt-2">{passportError}</p>
          )}

          {/* Dialog for Image Preview and Download */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col items-center bg-gradient-to-t from-[#FDE3D9] to-[#FDFDFD] border-none">
              <DialogHeader>
                <DialogTitle className="tracking-tighter">
                  Your Color Passport
                </DialogTitle>
              </DialogHeader>
              <div className="flex justify-center items-center w-auto mt-4 shadow-xl rounded-md overflow-hidden aspect-[1/2]">
                {/* Added min height */}
                {isLoadingPassport && (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                )}
                {passportError && !isLoadingPassport && (
                  <p className="text-destructive text-center">
                    {passportError}
                  </p>
                )}
                {passportImageDataUrl &&
                  !isLoadingPassport &&
                  !passportError && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={passportImageDataUrl}
                      alt="Your Color Passport Preview"
                      className="w-full h-full object-contain"
                    />
                  )}
              </div>
              <div className="flex w-full justify-end mt-4">
                {passportImageDataUrl &&
                  !isLoadingPassport &&
                  !passportError && (
                    <a
                      href={passportImageDataUrl}
                      download="myseason-color-passport.png"
                    >
                      <Button variant="secondary">
                        <Download className="mr-2 h-4 w-4" />
                        Download Image
                      </Button>
                    </a>
                  )}
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="ml-2"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Tabs>
    </>
  );
}
