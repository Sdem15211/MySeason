interface HairColor {
  name: string;
  hex: string;
  category: "Blondes" | "Browns" | "Blacks" | "Reds/Auburns";
}

export const naturalHairColors: HairColor[] = [
  // Blondes (7)
  { name: "Platinum Blonde", hex: "#E2DACC", category: "Blondes" },
  { name: "Light Ash Blonde", hex: "#D1C4AE", category: "Blondes" },
  { name: "Light Golden Blonde", hex: "#F0E2B6", category: "Blondes" },
  { name: "Golden Blonde", hex: "#E6CE9C", category: "Blondes" },
  { name: "Honey Blonde", hex: "#C5A46F", category: "Blondes" },
  { name: "Dishwater Blonde", hex: "#C1A87C", category: "Blondes" },
  { name: "Dark Blonde", hex: "#B89B71", category: "Blondes" },
  // Browns (7)
  { name: "Light Brown", hex: "#A57F58", category: "Browns" },
  { name: "Ash Brown", hex: "#907B68", category: "Browns" },
  { name: "Golden Brown", hex: "#8B694A", category: "Browns" },
  { name: "Medium Brown", hex: "#715441", category: "Browns" },
  { name: "Chestnut Brown", hex: "#6D4C3C", category: "Browns" },
  { name: "Dark Brown", hex: "#5C4033", category: "Browns" },
  { name: "Cool Dark Brown", hex: "#4A362A", category: "Browns" },
  // Blacks (7)
  { name: "Brown-Black", hex: "#2E2622", category: "Blacks" },
  { name: "Soft Black", hex: "#3D312A", category: "Blacks" },
  { name: "Medium Black", hex: "#352A25", category: "Blacks" },
  { name: "Warm Black", hex: "#302926", category: "Blacks" },
  { name: "Natural Black", hex: "#2C221F", category: "Blacks" },
  { name: "Blue-Black", hex: "#1F2124", category: "Blacks" },
  { name: "Jet Black", hex: "#1A1110", category: "Blacks" },
  // Reds/Auburns (7)
  { name: "Strawberry Blonde", hex: "#C99A7C", category: "Reds/Auburns" },
  { name: "Ginger Red", hex: "#C16E48", category: "Reds/Auburns" },
  { name: "Copper Red", hex: "#B85C3A", category: "Reds/Auburns" },
  { name: "Light Auburn", hex: "#A45D41", category: "Reds/Auburns" },
  { name: "Auburn", hex: "#8E4433", category: "Reds/Auburns" },
  { name: "Dark Auburn", hex: "#5D2E27", category: "Reds/Auburns" },
  { name: "Deep Red Mahogany", hex: "#522E2B", category: "Reds/Auburns" },
];

// Helper to group colors by category
export const groupedHairColors = naturalHairColors.reduce((acc, color) => {
  if (!acc[color.category]) {
    acc[color.category] = [];
  }
  acc[color.category].push(color);
  return acc;
}, {} as Record<HairColor["category"], HairColor[]>);
