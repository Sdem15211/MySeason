import { ColorPassport } from "@/components/color-passport/color-passport";
import { ColorPassportProps } from "@/app/api/color-passport/route";
import React from "react";

// Sample data for development preview
const samplePassportData: ColorPassportProps = {
  season: "Soft Autumn",
  undertone: "Warm",
  contrast: "Medium",
  powerColors: ["#7A874E", "#2A4764", "#B16A56", "#D5A970", "#6B8E7E"],
  avoidColors: ["#FF0000", "#87CEEB", "#8A2BE2"],
  metalColor: "Gold",
  foundationColor: "#D8B8A7",
  blushColor: "#C78D7E",
  lipColors: ["#B67F7F", "#A76B59", "#9F8496"],
  eyeColors: ["#B07C7A", "#A76B59", "#9F8496"],
  logoUrl: "/assets/myseason.svg",
  qrCodeUrl: "/assets/qr-code-footer.png",
};

export default function ColorPassportDevPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-gray-200 p-10 pt-32">
      <div className="shadow-lg rounded-lg overflow-hidden">
        {/* <div className="w-full h-full scale-50"> */}
        <ColorPassport {...samplePassportData} />
        {/* </div> */}
      </div>
    </main>
  );
}
