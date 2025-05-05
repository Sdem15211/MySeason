import { metalGradients } from "@/lib/constants/metal-gradients";

const ColorSwatch: React.FC<{ color: string; className?: string }> = ({
  color,
  className = "",
}) => (
  <div
    style={{ background: color }}
    className={`size-22 rounded-xl border swatch-shadow border-[#DDDDDD] ${className}`}
  />
);

export interface ColorPassportProps {
  season: string;
  undertone: string;
  contrast: string;
  powerColors: string[];
  avoidColors: string[];
  metalColor: string;
  foundationColor?: string;
  blushColor?: string;
  lipColors?: string[];
  eyeColors?: string[];
}

export const ColorPassport: React.FC<ColorPassportProps> = ({
  season,
  undertone,
  contrast,
  powerColors,
  avoidColors,
  metalColor,
  foundationColor,
  blushColor,
  lipColors = [],
  eyeColors = [],
}) => {
  // Limit the number of colors displayed to avoid overflow
  const displayedPowerColors = powerColors.slice(0, 5);
  const displayedAvoidColors = avoidColors.slice(0, 3);
  const displayedLipColors = lipColors.slice(0, 3);
  const displayedEyeColors = eyeColors.slice(0, 3);

  return (
    <div className="flex flex-col space-between w-[600px] h-[1200px] bg-[#FDFDFD]">
      {/* Header */}
      <div
        className="flex items-center border-b mb-8"
        style={{ borderColor: "rgba(17, 17, 17, 0.1)" }}
      >
        <div
          className="flex items-center px-5 py-4 rounded-br-[24px] border-b border-r"
          style={{
            backgroundColor: "rgba(17, 17, 17, 0.1)",
            borderColor: "rgba(17, 17, 17, 0.1)",
          }}
        >
          <img
            src="/assets/myseason.svg"
            alt="MySeason Logo"
            width={60}
            height={60}
            className="size-15"
          />
          <span className="font-bold text-xl tracking-tighter">MySeason</span>
        </div>
        <span className="text-xl font-semibold flex-1 text-center tracking-tight">
          Color passport
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col items-center flex-grow">
        {/* Season */}
        <div className="flex flex-col items-center text-center mb-8">
          <p
            className="text-sm uppercase mb-1"
            style={{ color: "rgba(17, 17, 17, 0.5)" }}
          >
            season
          </p>
          <h1
            style={{ fontWeight: "bold", lineHeight: "1" }}
            className="text-5xl flex items-center tracking-tighter"
          >
            {season}
            <span className="ml-2 text-3xl">
              {season.includes("Spring")
                ? "🌸"
                : season.includes("Summer")
                ? "☀️"
                : season.includes("Autumn")
                ? "🍂"
                : "❄️"}
            </span>
          </h1>
        </div>

        {/* Undertone & Contrast */}
        <div className="flex justify-around w-full mb-8">
          <div className="text-center flex flex-col items-center">
            <p
              className="text-sm uppercase"
              style={{ color: "rgba(17, 17, 17, 0.5)" }}
            >
              skin undertone
            </p>
            <p className="text-3xl font-bold flex items-center tracking-tighter line-height-1">
              {undertone.toLowerCase()}
            </p>
          </div>
          <div className="text-center flex flex-col items-center">
            <p
              className="text-sm uppercase"
              style={{ color: "rgba(17, 17, 17, 0.5)" }}
            >
              contrast level
            </p>
            <p className="text-3xl font-bold flex items-center tracking-tighter line-height-1">
              {contrast.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Separator */}
        <div
          className="w-full h-px mb-6 flex justify-center"
          style={{ backgroundColor: "rgba(17, 17, 17, 0.1)" }}
        ></div>

        {/* Power Colors */}
        <div className="flex flex-col w-full mb-6 px-6">
          <p
            className="text-base mb-6 items-center tracking-tight"
            style={{ color: "rgba(17, 17, 17, 0.75)" }}
          >
            power colors ✨
          </p>
          <div className="flex w-full justify-between">
            {displayedPowerColors.map((color: string) => (
              <ColorSwatch key={`power-${color}`} color={color} />
            ))}
          </div>
        </div>

        {/* Metal & Avoid Colors */}
        <div className="flex w-full justify-between mb-6 px-6">
          <div className="flex flex-col items-start gap-1">
            <p
              className="text-base mb-6 items-center tracking-tight"
              style={{ color: "rgba(17, 17, 17, 0.75)" }}
            >
              metal color 💎
            </p>
            <ColorSwatch
              color={
                metalGradients[metalColor as keyof typeof metalGradients] ||
                "#EEEEEE"
              }
            />
          </div>
          <div className="flex flex-col w-[60%]">
            <p
              className="text-base mb-6 items-center tracking-tight"
              style={{ color: "rgba(17, 17, 17, 0.75)" }}
            >
              colors to avoid ❌
            </p>
            <div className="flex w-full justify-between">
              {displayedAvoidColors.map((color: string) => (
                <ColorSwatch key={`avoid-${color}`} color={color} />
              ))}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div
          className="w-full h-px mb-6 flex justify-center"
          style={{ backgroundColor: "rgba(17, 17, 17, 0.1)" }}
        ></div>

        {/* Makeup Section */}
        {(foundationColor ||
          blushColor ||
          displayedLipColors.length > 0 ||
          displayedEyeColors.length > 0) && (
          <div className="w-full flex flex-col items-center">
            <div className="flex w-full justify-between mb-6 px-6">
              {/* Foundation & Blush */}
              {(foundationColor || blushColor) && (
                <div className="flex flex-col">
                  {foundationColor && (
                    <div className="flex flex-col items-start mb-6">
                      <p
                        className="text-base mb-6 items-center tracking-tight"
                        style={{ color: "rgba(17, 17, 17, 0.75)" }}
                      >
                        foundation tone 🤩
                      </p>
                      <ColorSwatch color={foundationColor!} />
                    </div>
                  )}
                  {blushColor && (
                    <div className="flex flex-col items-start">
                      <p
                        className="text-base mb-6 items-center tracking-tight"
                        style={{ color: "rgba(17, 17, 17, 0.75)" }}
                      >
                        blush ☺️
                      </p>
                      <ColorSwatch color={blushColor!} />
                    </div>
                  )}
                </div>
              )}

              {/* Lip & Eye Colors */}
              {(displayedLipColors.length > 0 ||
                displayedEyeColors.length > 0) && (
                <div className="flex flex-col w-[60%]">
                  {displayedLipColors.length > 0 && (
                    <div className="flex flex-col items-start mb-6">
                      <p
                        className="text-base mb-6 items-center tracking-tight"
                        style={{ color: "rgba(17, 17, 17, 0.75)" }}
                      >
                        lip colors 💄
                      </p>
                      <div className="flex w-full justify-between">
                        {displayedLipColors.map((color: string) => (
                          <ColorSwatch key={`lip-${color}`} color={color} />
                        ))}
                      </div>
                    </div>
                  )}
                  {displayedEyeColors.length > 0 && (
                    <div className="flex flex-col items-start">
                      <p
                        className="text-base mb-6 items-center tracking-tight"
                        style={{ color: "rgba(17, 17, 17, 0.75)" }}
                      >
                        eye colors 👀
                      </p>
                      <div className="flex w-full justify-between">
                        {displayedEyeColors.map((color: string) => (
                          <ColorSwatch key={`eye-${color}`} color={color} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-around items-center bg-[#3D3533] px-6 py-4">
        <span className="text-base font-semibold text-[#FFFFFF] tracking-tight">
          Try it yourself in the MySeason app!
        </span>
        <div className="size-25 flex items-center justify-center">
          <img
            src="/assets/qr-code-footer.png"
            alt="QR Code for MySeason App"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};
