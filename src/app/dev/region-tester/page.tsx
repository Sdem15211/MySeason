"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CalculatedRegions,
  ExtractedColors,
  StoredLandmarks,
} from "@/lib/types/image-analysis.types";
import { Loader2 } from "lucide-react";

interface AnalysisResult {
  landmarks: StoredLandmarks;
  regions: CalculatedRegions;
  colors: ExtractedColors;
}

export default function RegionTesterPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Fetch analysis data (landmarks, regions, colors)
  const fetchAnalysisData = useCallback(async (imageDataUrl: string) => {
    setIsProcessing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/dev/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch analysis data");
      }
      setAnalysisResult({
        landmarks: data.landmarks,
        regions: data.regions,
        colors: data.colors,
      });
    } catch (e) {
      console.error("Error fetching analysis data:", e);
      setError(
        `Error fetching analysis data: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      setAnalysisResult(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Event Handlers
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setImageDimensions(null);
      setImageUrl(null);
      imageRef.current = null;
      setAnalysisResult(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setImageUrl(url);
        const img = new window.Image();
        img.onload = () => {
          const dims = { width: img.naturalWidth, height: img.naturalHeight };
          imageRef.current = img;
          setImageDimensions(dims);
          fetchAnalysisData(url); // Call the new analysis endpoint
        };
        img.onerror = () => setError("Failed to load image element.");
        img.src = url;
      };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsDataURL(file);
    }
  };

  // Effect to draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;

    if (!canvas || !ctx || !imageDimensions) return;

    // Clear canvas and set dimensions
    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image first
    if (img && img.complete) {
      ctx.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
    }

    // If analysis results are available, draw the regions
    if (analysisResult?.regions) {
      ctx.strokeStyle = "#FF0000"; // Red color for visibility
      ctx.lineWidth = Math.max(2, Math.round(imageDimensions.width * 0.002)); // Dynamic line width

      const regionsToDraw = analysisResult.regions;

      // Helper to draw a single region if it exists
      const drawRegion = (
        region: CalculatedRegions[keyof CalculatedRegions]
      ) => {
        if (region) {
          ctx.strokeRect(region.left, region.top, region.width, region.height);
        }
      };

      drawRegion(regionsToDraw.leftCheekRegion);
      drawRegion(regionsToDraw.rightCheekRegion);
      drawRegion(regionsToDraw.foreheadRegion);
      drawRegion(regionsToDraw.leftEyeRegion);
      drawRegion(regionsToDraw.rightEyeRegion);
      // Add eyebrow regions
      drawRegion(regionsToDraw.leftEyebrowRegion);
      drawRegion(regionsToDraw.rightEyebrowRegion);
    }
  }, [imageUrl, imageDimensions, analysisResult]); // Add analysisResult to dependencies

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Image Analysis Tester</h1>

      <Card>
        <CardHeader>
          <CardTitle>1. Upload Image</CardTitle>
          <CardDescription>
            Select an image. Regions and colors will be calculated and
            displayed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
          {isProcessing && (
            <div className="flex items-center space-x-2 mt-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing image...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>2. Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Calculated Regions:</h3>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify(analysisResult.regions, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                Extracted Colors & Undertone:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Color Swatches */}
                <div className="flex space-x-4 items-center">
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded border border-border"
                      style={{
                        backgroundColor:
                          analysisResult.colors.skinColorHex ?? "transparent",
                      }}
                    ></div>
                    <span className="text-xs mt-1 block">
                      Skin: {analysisResult.colors.skinColorHex ?? "N/A"}
                    </span>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded border border-border"
                      style={{
                        backgroundColor:
                          analysisResult.colors.averageEyeColorHex ??
                          "transparent",
                      }}
                    ></div>
                    <span className="text-xs mt-1 block">
                      Eye: {analysisResult.colors.averageEyeColorHex ?? "N/A"}
                    </span>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded border border-border"
                      style={{
                        backgroundColor:
                          analysisResult.colors.averageEyebrowColorHex ??
                          "transparent",
                      }}
                    ></div>
                    <span className="text-xs mt-1 block">
                      Eyebrow:{" "}
                      {analysisResult.colors.averageEyebrowColorHex ?? "N/A"}
                    </span>
                  </div>
                </div>

                {/* Undertone & Lab Values */}
                <div className="text-sm">
                  <p>
                    <span className="font-medium">Skin Undertone:</span>{" "}
                    {analysisResult.colors.skinUndertone ?? "N/A"}
                  </p>
                  {analysisResult.colors.skinColorLab && (
                    <p>
                      <span className="font-medium">Skin Lab Values:</span> L:{" "}
                      {analysisResult.colors.skinColorLab.l.toFixed(1)}, a:{" "}
                      {analysisResult.colors.skinColorLab.a.toFixed(1)}, b:{" "}
                      {analysisResult.colors.skinColorLab.b.toFixed(1)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>3. Visualize Image</CardTitle>
          <CardDescription>
            The uploaded image is displayed below with calculated regions
            overlaid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto border border-dashed p-2">
            <canvas ref={canvasRef} className="max-w-full h-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
