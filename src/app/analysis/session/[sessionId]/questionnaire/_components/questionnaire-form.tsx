"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import shared schema and type
import {
  questionnaireSchema,
  type QuestionnaireFormData,
} from "@/lib/schemas/questionnaire";
// Import hair colors
import { groupedHairColors } from "@/lib/constants/hair-colors";
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface QuestionnaireFormProps {
  sessionId: string;
}

// Placeholder color palettes (reuse for flattering/unflattering for now)
const colorPalettes = [
  "Green",
  "Brown",
  "Red",
  "Blue",
  "Grey",
  "Yellow",
  "Orange",
  "Purple",
  "Pink",
  "Black",
  "White",
];

// --- Color Swatch Definitions ---
const swatchSize = "h-4 w-4 rounded-sm border border-muted-foreground/50"; // Consistent swatch style

const sunReactionSwatches: Record<string, string> = {
  always_burn_rarely_tan: "#F8D7DA", // Light pink
  burn_then_tan: "#EBC8B2", // Light tan
  tan_easily_occasionally_burn: "#DDB89E", // Medium tan
  always_tan_never_burn: "#C6A88C", // Deeper tan
};

const blushSwatches: Record<string, string> = {
  rosy_pink_red: "#E57373", // Rosy red
  peachy_golden: "#F2C797", // Peach
  // No swatch for 'unsure'
};

const whiteCreamSwatches: Record<string, string> = {
  pure_white: "#FFFFFF",
  off_white_cream: "#FFF8DC", // Cornsilk/Cream
  // No swatch for 'both_equal'
};

const veinSwatches: Record<string, string> = {
  blue_purple: "#9FA8DA", // Blue/Purple
  green_olive: "#A5D6A7", // Green
  mix_both: "#B0BEC5", // Blue Grey (Neutral mix representation)
  // No swatch for 'unsure'
};

const jewelrySwatches: Record<string, string> = {
  silver_white: "#E0E0E0", // Silver/Grey
  gold_yellow: "#FFD700", // Gold
  rose_gold_copper: "#E0BFB8", // Copper/Rose Gold
  // No swatch for 'unsure'
};

// --- Define New 5 Steps --- (Order matches user request)
const steps = [
  {
    id: "step1",
    title: "Hair Color",
    fields: ["naturalHairColor"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "step2",
    title: "Skin Reaction",
    fields: [
      "skinReactionToSun",
      "blushColor",
      "whiteOrCreamPreference",
    ] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "step3",
    title: "Undertone Indicators",
    fields: [
      "veinColor",
      "jewelryPreference",
    ] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "step4",
    title: "Color Preferences",
    fields: [
      "flatteringColors",
      "unflatteringColors",
    ] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "step5",
    title: "Preferences",
    fields: ["makeupAdvicePreference"] as (keyof QuestionnaireFormData)[],
  },
];

export function QuestionnaireForm({ sessionId }: QuestionnaireFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<QuestionnaireFormData>({
    resolver: zodResolver(questionnaireSchema),
    // Update default values to match new schema
    defaultValues: {
      naturalHairColor: "", // Required, but selection makes it non-empty
      skinReactionToSun: undefined,
      blushColor: undefined,
      whiteOrCreamPreference: undefined,
      veinColor: undefined,
      jewelryPreference: undefined,
      flatteringColors: "", // Optional
      unflatteringColors: "", // Optional
      makeupAdvicePreference: undefined,
    },
  });

  const { trigger, handleSubmit, watch } = form;

  // Watch color preference fields for Step 4 button logic
  const flatteringColorValue = watch("flatteringColors");
  const unflatteringColorValue = watch("unflatteringColors");
  const isStep4Complete = !!flatteringColorValue || !!unflatteringColorValue;

  const handleNext = async () => {
    // Skip validation for Step 4 if skipping
    if (currentStep === 3 && !isStep4Complete) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    const currentStepFields = steps[currentStep]?.fields as
      | (keyof QuestionnaireFormData)[]
      | undefined;
    if (!currentStepFields) {
      console.error(`Invalid current step: ${currentStep}`);
      return;
    }

    const isValid = await trigger(currentStepFields);

    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit(onSubmit)();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Specific handler for the skip button on Step 4
  const handleSkipStep4 = () => {
    if (currentStep === 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const onSubmit: SubmitHandler<QuestionnaireFormData> = async (data) => {
    const submissionData: Partial<QuestionnaireFormData> = { ...data };
    // Remove optional fields if they are empty strings
    if (!submissionData.flatteringColors)
      delete submissionData.flatteringColors;
    if (!submissionData.unflatteringColors)
      delete submissionData.unflatteringColors;

    console.log("Submitting questionnaire data:", submissionData);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/analysis/${sessionId}/questionnaire`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submissionData),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to submit questionnaire.");
      }

      console.log("Questionnaire submitted successfully.");
      toast.success("Questionnaire submitted! Starting analysis...");

      router.push(`/analysis/session/${sessionId}/processing`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      console.error("Error submitting questionnaire:", err);
      setError(message);
      toast.error(`Submission failed: ${message}`);
      setIsLoading(false);
    }
  };

  const progressValue = ((currentStep + 1) / steps.length) * 100;
  const currentStepDef = steps[currentStep];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          Step {currentStep + 1} of {steps.length}:{" "}
          {currentStepDef?.title ?? "Questionnaire"}
        </CardTitle>
        <Progress value={progressValue} className="mt-2" />
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Step 1: Natural Hair Color */}
            {currentStep === 0 && (
              <FormField
                control={form.control}
                name="naturalHairColor"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>
                      Your <strong>natural</strong> hair color is:
                      <span className="ml-1 text-xs text-muted-foreground">
                        (Select the closest match)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-4"
                      >
                        {Object.entries(groupedHairColors).map(
                          ([category, colors]) => (
                            <div key={category}>
                              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                                {category}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {colors.map((color) => (
                                  <FormItem
                                    key={color.hex}
                                    className="flex items-center space-x-0 space-y-0"
                                  >
                                    <FormControl>
                                      <RadioGroupItem
                                        value={color.hex}
                                        id={color.hex}
                                        className="sr-only peer"
                                      />
                                    </FormControl>
                                    <FormLabel
                                      htmlFor={color.hex}
                                      className={cn(
                                        "h-10 w-10 rounded-full border-2 border-transparent cursor-pointer transition-all",
                                        "flex items-center justify-center",
                                        "hover:border-primary/50",
                                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/30"
                                      )}
                                      style={{ backgroundColor: color.hex }}
                                      title={color.name}
                                      aria-label={color.name}
                                    />
                                  </FormItem>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Step 2: Skin Reaction, Blush Color, White/Cream Preference */}
            {currentStep === 1 && (
              <>
                {/* Skin Reaction to Sun */}
                <FormField
                  control={form.control}
                  name="skinReactionToSun"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>
                        How does your skin react to sun exposure?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {Object.entries({
                            always_burn_rarely_tan: "Always burn, rarely tan",
                            burn_then_tan: "Burn first, then tan",
                            tan_easily_occasionally_burn:
                              "Tan easily, occasionally burn",
                            always_tan_never_burn: "Always tan, never burn",
                          }).map(([value, label]) => (
                            <FormItem
                              key={value}
                              className="flex items-center space-x-3"
                            >
                              <FormControl>
                                <RadioGroupItem value={value} />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center gap-2">
                                {sunReactionSwatches[value] && (
                                  <div
                                    className={swatchSize}
                                    style={{
                                      backgroundColor:
                                        sunReactionSwatches[value],
                                    }}
                                  />
                                )}
                                {label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Blush Color */}
                <FormField
                  control={form.control}
                  name="blushColor"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>When you blush, your skin turns:</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {Object.entries({
                            rosy_pink_red: "Rosy pink or red",
                            peachy_golden: "Peachy or golden",
                            unsure: "Not sure / Can't tell",
                          }).map(([value, label]) => (
                            <FormItem
                              key={value}
                              className="flex items-center space-x-3"
                            >
                              <FormControl>
                                <RadioGroupItem value={value} />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center gap-2">
                                {blushSwatches[value] && (
                                  <div
                                    className={swatchSize}
                                    style={{
                                      backgroundColor: blushSwatches[value],
                                    }}
                                  />
                                )}
                                {label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* White vs Cream Preference */}
                <FormField
                  control={form.control}
                  name="whiteOrCreamPreference" // Updated name
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>
                        Which color looks better against your skin?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {Object.entries({
                            pure_white: "Pure white (crisp, bright white)",
                            off_white_cream: "Off-white (ivory, cream)",
                            both_equal: "Both look equally good",
                          }).map(([value, label]) => (
                            <FormItem
                              key={value}
                              className="flex items-center space-x-3"
                            >
                              <FormControl>
                                <RadioGroupItem value={value} />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center gap-2">
                                {whiteCreamSwatches[value] && (
                                  <div
                                    className={swatchSize}
                                    style={{
                                      backgroundColor:
                                        whiteCreamSwatches[value],
                                    }}
                                  />
                                )}
                                {label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 3: Vein Color, Jewelry Preference */}
            {currentStep === 2 && (
              <>
                {/* Vein Color */}
                <FormField
                  control={form.control}
                  name="veinColor"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>
                        The veins on your inner wrist appear mostly:
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {Object.entries({
                            blue_purple: "Blue or purple",
                            green_olive: "Green or olive",
                            mix_both: "Mix of both colors",
                            unsure: "Can't tell clearly",
                          }).map(([value, label]) => (
                            <FormItem
                              key={value}
                              className="flex items-center space-x-3"
                            >
                              <FormControl>
                                <RadioGroupItem value={value} />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center gap-2">
                                {veinSwatches[value] && (
                                  <div
                                    className={swatchSize}
                                    style={{
                                      backgroundColor: veinSwatches[value],
                                    }}
                                  />
                                )}
                                {label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Jewelry Preference */}
                <FormField
                  control={form.control}
                  name="jewelryPreference"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>
                        Which metal best complements your skin tone?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {Object.entries({
                            silver_white: "Silver/White metals",
                            gold_yellow: "Gold/Yellow metals",
                            rose_gold_copper: "Rose gold/Copper",
                            unsure: "Not sure",
                          }).map(([value, label]) => (
                            <FormItem
                              key={value}
                              className="flex items-center space-x-3"
                            >
                              <FormControl>
                                <RadioGroupItem value={value} />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center gap-2">
                                {jewelrySwatches[value] && (
                                  <div
                                    className={swatchSize}
                                    style={{
                                      backgroundColor: jewelrySwatches[value],
                                    }}
                                  />
                                )}
                                {label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 4: Color Preferences */}
            {currentStep === 3 && (
              <>
                {/* Flattering Colors */}
                <FormField
                  control={form.control}
                  name="flatteringColors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Which colors get you the most compliments?
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""} // Handle optional empty string
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a color palette" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Using placeholder colorPalettes */}
                          {colorPalettes.map((palette) => (
                            <SelectItem key={palette} value={palette}>
                              {palette}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Unflattering Colors */}
                <FormField
                  control={form.control}
                  name="unflatteringColors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Which colors make you look tired?</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""} // Handle optional empty string
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a color palette" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Using placeholder colorPalettes */}
                          {colorPalettes.map((palette) => (
                            <SelectItem key={palette} value={palette}>
                              {palette}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 5: Preferences */}
            {currentStep === 4 && (
              <FormField
                control={form.control}
                name="makeupAdvicePreference"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Do you want basic makeup advice?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <RadioGroupItem value="yes" />
                          </FormControl>
                          <FormLabel className="font-normal">Yes</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <RadioGroupItem value="no" />
                          </FormControl>
                          <FormLabel className="font-normal">No</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {error && (
              <p className="text-sm font-medium text-destructive">
                Error: {error}
              </p>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0 || isLoading}
        >
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {" "}
          {/* Container for right buttons */}
          {/* Show Skip button only on Step 4 */}
          {currentStep === 3 && (
            <Button
              type="button"
              variant="ghost" // Use ghost variant for less emphasis
              onClick={handleSkipStep4}
              disabled={isLoading}
            >
              Skip
            </Button>
          )}
          <Button
            type="button"
            onClick={handleNext}
            disabled={
              isLoading || (currentStep === 3 && !isStep4Complete) // Disable Next on Step 4 if nothing selected
            }
          >
            {isLoading
              ? "Submitting..."
              : currentStep === steps.length - 1
              ? "Submit Questionnaire"
              : "Next Step"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
