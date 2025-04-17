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
import { Input } from "@/components/ui/input";
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

interface QuestionnaireFormProps {
  sessionId: string;
}

// Placeholder color palettes
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

// --- Define Steps ---
const steps = [
  {
    id: "step1",
    title: "Basic Info",
    fields: ["makeupUsage", "ageGroup"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "step2",
    title: "Hair & Undertone",
    fields: [
      "naturalHairColor",
      "skinReactionToSun",
      "veinColor",
      "jewelryPreference",
    ] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "step3",
    title: "Color Preferences",
    fields: [
      "flatteringColors",
      "unflatteringColors",
    ] as (keyof QuestionnaireFormData)[],
  },
];

export function QuestionnaireForm({ sessionId }: QuestionnaireFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<QuestionnaireFormData>({
    resolver: zodResolver(questionnaireSchema),
    // Update default values
    defaultValues: {
      makeupUsage: undefined,
      ageGroup: undefined,
      naturalHairColor: "",
      skinReactionToSun: undefined,
      veinColor: undefined,
      jewelryPreference: undefined,
      flatteringColors: "",
      unflatteringColors: "",
    },
  });

  // formState is removed as it's unused
  const { trigger, handleSubmit } = form;

  const handleNext = async () => {
    // Check if steps[currentStep] exists before accessing fields
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
        // Final step, trigger form submission
        handleSubmit(onSubmit)();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSubmit: SubmitHandler<QuestionnaireFormData> = async (data) => {
    // Remove optional color preference fields if empty before submitting
    const submissionData: Partial<QuestionnaireFormData> = { ...data };
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
          body: JSON.stringify(submissionData), // Send cleaned data
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to submit questionnaire.");
      }

      console.log("Questionnaire submitted successfully.");
      toast.success("Questionnaire submitted! Starting analysis...");

      // Redirect to processing page
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
  // Add check for current step definition
  const currentStepDef = steps[currentStep];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          Step {currentStep + 1}: {currentStepDef?.title ?? "Questionnaire"}
        </CardTitle>
        <Progress value={progressValue} className="mt-2" />
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Render fields based on current step */}
            {currentStep === 0 && (
              <>
                {/* Makeup Usage */}
                <FormField
                  control={form.control}
                  name="makeupUsage"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Do you use makeup?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
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
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="prefer_not_to_say" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Prefer not to say
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Age Group */}
                <FormField
                  control={form.control}
                  name="ageGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What is your age group?</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select age group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="under_18">Under 18</SelectItem>
                          <SelectItem value="18_24">18-24</SelectItem>
                          <SelectItem value="25_34">25-34</SelectItem>
                          <SelectItem value="35_44">35-44</SelectItem>
                          <SelectItem value="45_54">45-54</SelectItem>
                          <SelectItem value="55_plus">55+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {currentStep === 1 && (
              <>
                {/* Natural Hair Color */}
                <FormField
                  control={form.control}
                  name="naturalHairColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What is your natural hair color?</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            className="p-1 h-10 w-14 block bg-white border border-gray-200 cursor-pointer rounded-lg disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700"
                            {...field}
                          />
                          <Input
                            type="text"
                            placeholder="#000000"
                            maxLength={7}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Skin Reaction to Sun */}
                <FormField
                  control={form.control}
                  name="skinReactionToSun"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>
                        How does your skin react to the sun?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="burns_easily" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              I burn easily and rarely tan.
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="burns_then_tans" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              I usually burn first, then tan lightly.
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="tans_easily" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              I tan easily and rarely burn.
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="tans_deeply" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              My skin tans deeply and I almost never burn.
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Vein Color */}
                <FormField
                  control={form.control}
                  name="veinColor"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>
                        What color do your veins appear in natural light?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="blue_or_purple" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              My veins appear mostly Blue or Purple.
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="green" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              My veins appear mostly Green.
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="blue_and_green" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              My veins appear to be a mix of Blue and Green.
                            </FormLabel>
                          </FormItem>
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
                      <FormLabel>Which metal tones look best on you?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="silver_platinum" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Silver, Platinum, or White Gold
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="gold" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Gold or Yellow Gold
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="rose_gold_or_both" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Both or Rose Gold
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="unknown" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              I don&apos;t know / I don&apos;t usually wear
                              jewelry
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {currentStep === 2 && (
              <>
                {/* Flattering Colors */}
                <FormField
                  control={form.control}
                  name="flatteringColors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Which color palette do you feel looks best on you?
                        (Optional)
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a color palette" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                      <FormLabel>
                        Which color palette do you tend to avoid? (Optional)
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a color palette" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
        <Button type="button" onClick={handleNext} disabled={isLoading}>
          {isLoading
            ? "Submitting..."
            : currentStep === steps.length - 1
            ? "Submit Questionnaire"
            : "Next Step"}
        </Button>
      </CardFooter>
    </Card>
  );
}
