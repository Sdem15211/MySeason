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
import { Checkbox } from "@/components/ui/checkbox";

// Import shared schema and type
import {
  questionnaireSchema,
  type QuestionnaireFormData,
} from "@/lib/schemas/questionnaire";

interface QuestionnaireFormProps {
  sessionId: string;
}

// --- Define Steps ---
const steps = [
  {
    id: "step1",
    title: "Basic Information",
    fields: ["gender", "ageGroup"], // Group gender and age
  },
  {
    id: "step2",
    title: "Personality & Preferences",
    fields: ["personality", "placeholderInfo1"], // Group personality and placeholder 1
  },
  {
    id: "step3",
    title: "Additional Details",
    fields: ["placeholderInfo2", "placeholderInfo3"], // Group placeholders 2 and 3
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
      gender: undefined,
      ageGroup: undefined,
      personality: undefined,
      placeholderInfo1: "",
      placeholderInfo2: "",
      placeholderInfo3: false,
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
    // Remove optional fields if they are undefined or empty before submitting
    const submissionData: Partial<QuestionnaireFormData> = { ...data };
    if (!submissionData.placeholderInfo1)
      delete submissionData.placeholderInfo1;
    if (!submissionData.placeholderInfo2)
      delete submissionData.placeholderInfo2;
    if (submissionData.placeholderInfo3 === false)
      delete submissionData.placeholderInfo3;

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
                {/* Gender Field */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>What is your gender?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="man" />
                            </FormControl>
                            <FormLabel className="font-normal">Man</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="woman" />
                            </FormControl>
                            <FormLabel className="font-normal">Woman</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="other" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Something else / Prefer not to say
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Age Group Field */}
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
                {/* Personality Field */}
                <FormField
                  control={form.control}
                  name="personality"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>
                        Would you say you are rather introverted or extraverted?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="introvert" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Introvert
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="extravert" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Extravert
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="ambivert" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Something in between (Ambivert)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Placeholder 1 Field */}
                <FormField
                  control={form.control}
                  name="placeholderInfo1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placeholder Question 1 (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter some optional info..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {currentStep === 2 && (
              <>
                {/* Placeholder 2 Field */}
                <FormField
                  control={form.control}
                  name="placeholderInfo2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Placeholder Question 2 (Optional Text)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Another optional text field..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Placeholder 3 Field */}
                <FormField
                  control={form.control}
                  name="placeholderInfo3"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Placeholder Question 3 (Optional Boolean)
                        </FormLabel>
                      </div>
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
