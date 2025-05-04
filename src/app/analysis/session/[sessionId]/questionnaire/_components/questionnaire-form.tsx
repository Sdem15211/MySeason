"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
  questionnaireSchema,
  type QuestionnaireFormData,
} from "@/lib/schemas/questionnaire";
import { naturalHairColors } from "@/lib/constants/hair-colors";
import { cn } from "@/lib/utils";

interface QuestionnaireFormProps {
  sessionId: string;
}

const sunReactionSwatches: Record<string, string> = {
  always_burn_rarely_tan: "#FADADD",
  burn_then_tan: "#F5C3A9",
  tan_easily_occasionally_burn: "#DDB89E",
  always_tan_never_burn: "#A67B5B",
};

const blushSwatches: Record<string, string> = {
  rosy_pink_red: "#E84D5B",
  peachy_golden: "#F5A76C",
  unsure: "#CCCCCC",
};

const whiteCreamSwatches: Record<string, string> = {
  pure_white: "#FFFFFF",
  off_white_cream: "#FFF5DC",
  both_equal: "#CCCCCC",
};

const veinSwatches: Record<string, string> = {
  blue_purple: "#6A7AB5",
  green_olive: "#7FAD8C",
  mix_both: "#7D9AA3",
  unsure: "#CCCCCC",
};

const jewelrySwatches: Record<string, string> = {
  silver_white:
    "linear-gradient(319.96deg, #A8A8A6 15.87%, #898989 30.19%, #F9F8F6 53.23%, #7F7F7F 88.5%)",
  gold_yellow:
    "linear-gradient(135.59deg, #EDC967 6.24%, #F7EF8A 41.83%, #AE8625 71.57%, #D2AC47 96.56%)",
  rose_gold_copper:
    "linear-gradient(141.14deg, #B6947E 14.91%, #F8DAC8 54.86%, #AC836E 77.14%, #F8DCCB 93.31%)",
  unsure: "#CCCCCC",
};

// ---  Colors for Steps 7 & 8 ---
interface PreferenceColor {
  name: string;
  hex: string;
}

const preferenceColors: PreferenceColor[] = [
  { name: "Red", hex: "#D22B2B" },
  { name: "Orange", hex: "#FF8E32" },
  { name: "Yellow", hex: "#FFD700" },
  { name: "Pink", hex: "#F2A7BE" },
  { name: "Purple", hex: "#8E4585" },
  { name: "Blue", hex: "#1E73BE" },
  { name: "Green", hex: "#2E8B57" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Beige", hex: "#E6D6B8" },
  { name: "Brown", hex: "#5D4037" },
  { name: "Grey", hex: "#CCCCCC" },
  { name: "Black", hex: "#000000" },
];

// --- Define 9 Steps ---
const steps = [
  {
    id: "naturalHairColor",
    title: "What is your natural hair color?",
    subtitle:
      "Select the swatch that is the closest match to your natural hair color",
    fields: ["naturalHairColor"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "skinReactionToSun",
    title: "How does your skin react to sun? ☀️",
    fields: ["skinReactionToSun"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "blushColor",
    title: "When you blush ☺️, your skin turns:",
    fields: ["blushColor"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "whiteOrCreamPreference",
    title: "Which color looks best against your skin? 👕",
    fields: ["whiteOrCreamPreference"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "veinColor",
    title: "The veins on your inner wrist appear mostly:",
    fields: ["veinColor"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "jewelryPreference",
    title: "Which metal best complements your skin tone? 💎",
    fields: ["jewelryPreference"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "flatteringColors",
    title: "Which color gets you the most compliments? 👑",
    fields: ["flatteringColors"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "unflatteringColors",
    title: "Which color makes you look tired? 😴",
    fields: ["unflatteringColors"] as (keyof QuestionnaireFormData)[],
  },
  {
    id: "makeupAdvicePreference",
    title: "Do you want makeup advice in your analysis? 💄",
    fields: ["makeupAdvicePreference"] as (keyof QuestionnaireFormData)[],
  },
];

// --- Custom Progress Indicator ---
interface ProgressIndicatorProps {
  totalSteps: number;
  currentStep: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  totalSteps,
  currentStep,
}) => {
  return (
    <div className="flex w-full gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1 flex-1 rounded-full",
            index === currentStep || currentStep > index
              ? "bg-orange"
              : "bg-orange/20"
          )}
        />
      ))}
    </div>
  );
};

export function QuestionnaireForm({ sessionId }: QuestionnaireFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<QuestionnaireFormData>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      naturalHairColor: "",
      skinReactionToSun: undefined,
      blushColor: undefined,
      whiteOrCreamPreference: undefined,
      veinColor: undefined,
      jewelryPreference: undefined,
      flatteringColors: undefined,
      unflatteringColors: undefined,
      makeupAdvicePreference: undefined,
    },
    mode: "onChange",
  });

  const { trigger, handleSubmit, watch } = form;

  // Watch the field for the current step to enable/disable Next button
  const currentFields = steps[currentStep]?.fields;
  const firstFieldName = currentFields?.[0];
  const currentFieldValue = firstFieldName ? watch(firstFieldName) : undefined;
  const isCurrentStepComplete = !!currentFieldValue;

  const handleNext = async () => {
    // Always validate the current step now
    const currentStepFields = steps[currentStep]
      ?.fields as (keyof QuestionnaireFormData)[];
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

  const onSubmit: SubmitHandler<QuestionnaireFormData> = async (data) => {
    console.log("Submitting questionnaire data:", data);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/analysis/${sessionId}/questionnaire`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
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

  const currentStepDef = steps[currentStep];

  return (
    <Card className="w-[750px] h-[600px] mx-auto flex justify-between flex-col overflow-hidden p-8">
      <CardContent className="flex-grow flex flex-col items-center justify-center space-y-8">
        <div className="w-full mb-8">
          <ProgressIndicator
            totalSteps={steps.length}
            currentStep={currentStep}
          />
        </div>

        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full flex flex-col items-center justify-center flex-grow"
          >
            <div className="w-full flex flex-col items-center text-center space-y-8 mb-auto">
              <div className="flex flex-col items-center gap-3">
                {currentStepDef?.title && (
                  <h2 className="title">{currentStepDef.title}</h2>
                )}
                {currentStep === 0 && currentStepDef?.subtitle && (
                  <p className="subtitle">{currentStepDef.subtitle}</p>
                )}
              </div>

              <div className="w-full">
                {currentStep === 0 && (
                  <FormField
                    control={form.control}
                    name="naturalHairColor"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-4 gap-4 justify-center w-max mx-auto"
                          >
                            {naturalHairColors.map((color) => (
                              <FormItem
                                key={color.hex}
                                className="flex items-center justify-center space-x-0 space-y-0"
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
                                    "h-16 w-16 rounded-2xl border-2 border-neutral-300 cursor-pointer transition-all",
                                    "flex items-center justify-center shadow-sm",
                                    "hover:border-orange-500/50",
                                    "peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:ring-4 peer-data-[state=checked]:ring-orange-500/30"
                                  )}
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                  aria-label={color.name}
                                />
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 1 && (
                  <FormField
                    control={form.control}
                    name="skinReactionToSun"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-xs mx-auto">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-4"
                          >
                            {[
                              {
                                value: "always_burn_rarely_tan",
                                label: "Always burn, rarely tan",
                                swatch:
                                  sunReactionSwatches.always_burn_rarely_tan,
                              },
                              {
                                value: "burn_then_tan",
                                label: "Burn first, then tan",
                                swatch: sunReactionSwatches.burn_then_tan,
                              },
                              {
                                value: "tan_easily_occasionally_burn",
                                label: "Tan easily, occasionally burn",
                                swatch:
                                  sunReactionSwatches.tan_easily_occasionally_burn,
                              },
                              {
                                value: "always_tan_never_burn",
                                label: "Always tan, never burn",
                                swatch:
                                  sunReactionSwatches.always_tan_never_burn,
                              },
                            ].map((option) => (
                              <FormItem key={option.value}>
                                <FormControl>
                                  <RadioGroupItem
                                    value={option.value}
                                    id={option.value}
                                    className="sr-only peer"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor={option.value}
                                  className={cn(
                                    "flex items-center justify-between p-4 h-[5rem] rounded-lg border border-neutral-300 cursor-pointer transition-all",
                                    "hover:border-orange",
                                    "peer-data-[state=checked]:border-orange peer-data-[state=checked]:border-2 peer-data-[state=checked]:bg-orange/20"
                                  )}
                                >
                                  <span className="text-sm font-medium text-neutral-700">
                                    {option.label}
                                  </span>
                                  {option.swatch && (
                                    <div
                                      className="h-10 w-10 rounded-full border border-neutral-300"
                                      style={{ backgroundColor: option.swatch }}
                                    />
                                  )}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 2 && (
                  <FormField
                    control={form.control}
                    name="blushColor"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-xs mx-auto">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-4"
                          >
                            {[
                              {
                                value: "rosy_pink_red",
                                label: "Rosy pink or red",
                                swatch: blushSwatches.rosy_pink_red,
                              },
                              {
                                value: "peachy_golden",
                                label: "Peachy golden",
                                swatch: blushSwatches.peachy_golden,
                              },
                              {
                                value: "unsure",
                                label: "Not sure/can't tell",
                                swatch: blushSwatches.unsure,
                              },
                            ].map((option) => (
                              <FormItem key={option.value}>
                                <FormControl>
                                  <RadioGroupItem
                                    value={option.value}
                                    id={option.value}
                                    className="sr-only peer"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor={option.value}
                                  className={cn(
                                    "flex items-center justify-between p-4 h-[5rem] rounded-lg border border-neutral-300 cursor-pointer transition-all",
                                    "hover:border-orange",
                                    "peer-data-[state=checked]:border-orange peer-data-[state=checked]:border-2 peer-data-[state=checked]:bg-orange/20"
                                  )}
                                >
                                  <span className="text-sm font-medium text-neutral-700">
                                    {option.label}
                                  </span>
                                  {option.swatch && (
                                    <div
                                      className="h-10 w-10 rounded-full border border-neutral-300"
                                      style={{ backgroundColor: option.swatch }}
                                    />
                                  )}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 3 && (
                  <FormField
                    control={form.control}
                    name="whiteOrCreamPreference"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-xs mx-auto">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-4"
                          >
                            {[
                              {
                                value: "pure_white",
                                label: "Pure white",
                                swatch: whiteCreamSwatches.pure_white,
                              },
                              {
                                value: "off_white_cream",
                                label: "Off-white",
                                swatch: whiteCreamSwatches.off_white_cream,
                              },
                              {
                                value: "both_equal",
                                label: "Both look equally good",
                                swatch: whiteCreamSwatches.both_equal,
                              },
                            ].map((option) => (
                              <FormItem key={option.value}>
                                <FormControl>
                                  <RadioGroupItem
                                    value={option.value}
                                    id={option.value}
                                    className="sr-only peer"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor={option.value}
                                  className={cn(
                                    "flex items-center justify-between p-4 h-[5rem] rounded-lg border border-neutral-300 cursor-pointer transition-all",
                                    "hover:border-orange",
                                    "peer-data-[state=checked]:border-orange peer-data-[state=checked]:border-2 peer-data-[state=checked]:bg-orange/20"
                                  )}
                                >
                                  <span className="text-sm font-medium text-neutral-700">
                                    {option.label}
                                  </span>
                                  {option.swatch && (
                                    <div
                                      className={cn(
                                        "h-10 w-10 rounded-full border border-neutral-300",
                                        option.value === "pure_white" &&
                                          "border-neutral-400"
                                      )}
                                      style={{ backgroundColor: option.swatch }}
                                    />
                                  )}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 4 && (
                  <FormField
                    control={form.control}
                    name="veinColor"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-xs mx-auto">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-4"
                          >
                            {[
                              {
                                value: "blue_purple",
                                label: "Blue or purple",
                                swatch: veinSwatches.blue_purple,
                              },
                              {
                                value: "green_olive",
                                label: "Green or olive",
                                swatch: veinSwatches.green_olive,
                              },
                              {
                                value: "mix_both",
                                label: "Mix of both colors",
                                swatch: veinSwatches.mix_both,
                              },
                              {
                                value: "unsure",
                                label: "Can't tell clearly",
                                swatch: veinSwatches.unsure,
                              },
                            ].map((option) => (
                              <FormItem key={option.value}>
                                <FormControl>
                                  <RadioGroupItem
                                    value={option.value}
                                    id={option.value}
                                    className="sr-only peer"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor={option.value}
                                  className={cn(
                                    "flex items-center justify-between p-4 h-[5rem] rounded-lg border border-neutral-300 cursor-pointer transition-all",
                                    "hover:border-orange",
                                    "peer-data-[state=checked]:border-orange peer-data-[state=checked]:border-2 peer-data-[state=checked]:bg-orange/20"
                                  )}
                                >
                                  <span className="text-sm font-medium text-neutral-700">
                                    {option.label}
                                  </span>
                                  {option.swatch && (
                                    <div
                                      className="h-10 w-10 rounded-full border border-neutral-300"
                                      style={{ backgroundColor: option.swatch }}
                                    />
                                  )}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 5 && (
                  <FormField
                    control={form.control}
                    name="jewelryPreference"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-xs mx-auto">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-4"
                          >
                            {[
                              {
                                value: "silver_white",
                                label: "Silver/white",
                                swatch: jewelrySwatches.silver_white,
                              },
                              {
                                value: "gold_yellow",
                                label: "Gold/yellow",
                                swatch: jewelrySwatches.gold_yellow,
                              },
                              {
                                value: "rose_gold_copper",
                                label: "Rose gold/copper",
                                swatch: jewelrySwatches.rose_gold_copper,
                              },
                              {
                                value: "unsure",
                                label: "Not sure",
                                swatch: jewelrySwatches.unsure,
                              },
                            ].map((option) => (
                              <FormItem key={option.value}>
                                <FormControl>
                                  <RadioGroupItem
                                    value={option.value}
                                    id={option.value}
                                    className="sr-only peer"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor={option.value}
                                  className={cn(
                                    "flex items-center justify-between p-4 h-[5rem] rounded-lg border border-neutral-300 cursor-pointer transition-all",
                                    "hover:border-orange",
                                    "peer-data-[state=checked]:border-orange peer-data-[state=checked]:border-2 peer-data-[state=checked]:bg-orange/20"
                                  )}
                                >
                                  <span className="text-sm font-medium text-neutral-700">
                                    {option.label}
                                  </span>
                                  {option.swatch && (
                                    <div
                                      className="h-10 w-10 rounded-full border border-neutral-300"
                                      style={{ background: option.swatch }}
                                    />
                                  )}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 6 && (
                  <FormField
                    control={form.control}
                    name="flatteringColors"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-4 gap-6 justify-center w-max mx-auto mt-8"
                          >
                            {preferenceColors.map((color) => (
                              <FormItem
                                key={color.name}
                                className="flex items-center justify-center space-x-0 space-y-0"
                              >
                                <FormControl>
                                  <RadioGroupItem
                                    value={color.name}
                                    id={`flattering-${color.name}`}
                                    className="sr-only peer"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor={`flattering-${color.name}`}
                                  className={cn(
                                    "h-16 w-16 rounded-2xl border-2 border-neutral-300 cursor-pointer transition-all",
                                    "flex items-center justify-center shadow-sm",
                                    color.name === "White" &&
                                      "border-neutral-400",
                                    "hover:border-orange-500/50",
                                    "peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:ring-4 peer-data-[state=checked]:ring-orange-500/30"
                                  )}
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                  aria-label={color.name}
                                />
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 7 && (
                  <FormField
                    control={form.control}
                    name="unflatteringColors"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-4 gap-6 justify-center w-max mx-auto mt-8"
                          >
                            {preferenceColors.map((color) => (
                              <FormItem
                                key={color.name}
                                className="flex items-center justify-center space-x-0 space-y-0"
                              >
                                <FormControl>
                                  <RadioGroupItem
                                    value={color.name}
                                    id={`unflattering-${color.name}`}
                                    className="sr-only peer"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor={`unflattering-${color.name}`}
                                  className={cn(
                                    "h-16 w-16 rounded-2xl border-2 border-neutral-300 cursor-pointer transition-all",
                                    "flex items-center justify-center shadow-sm",
                                    color.name === "White" &&
                                      "border-neutral-400",
                                    "hover:border-orange-500/50",
                                    "peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:ring-4 peer-data-[state=checked]:ring-orange-500/30"
                                  )}
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                  aria-label={color.name}
                                />
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 8 && (
                  <FormField
                    control={form.control}
                    name="makeupAdvicePreference"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-md mx-auto mt-16">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex justify-center gap-8"
                          >
                            {[
                              {
                                value: "yes",
                                label: "Yes please 🙏🏼",
                              },
                              {
                                value: "no",
                                label: "No, thank you 🙅🏻‍♂️",
                              },
                            ].map((option) => (
                              <FormItem key={option.value}>
                                <FormControl>
                                  <RadioGroupItem
                                    value={option.value}
                                    id={`makeup-${option.value}`}
                                    className="sr-only peer"
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor={`makeup-${option.value}`}
                                  className={cn(
                                    "flex items-center justify-center text-center p-4 h-[150px] w-[150px] rounded-lg border border-neutral-300 cursor-pointer transition-all shadow-season",
                                    "hover:border-orange",
                                    "peer-data-[state=checked]:border-orange peer-data-[state=checked]:border-2 peer-data-[state=checked]:bg-orange/20"
                                  )}
                                >
                                  <span className="text-sm font-semibold text-neutral-700 tracking-tight">
                                    {option.label}
                                  </span>
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive mt-4 text-center">
                Error: {error}
              </p>
            )}
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentStep === 0 || isLoading}
          className="font-semibold tracking-tight"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </Button>

        <Button
          type="button"
          variant="season"
          onClick={handleNext}
          disabled={isLoading || !isCurrentStepComplete}
          className="font-semibold tracking-tight"
        >
          {isLoading
            ? "Submitting..."
            : currentStep === steps.length - 1
            ? "Finish"
            : "Next"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
