export interface ToothMarkings {
  [toothNumber: string]: string;
}

export interface DentalCounts {
  permPresent: number;
  permSound: number;
  permDecayed: number;
  permMissing: number;
  permFilled: number;
  totalDMF: number;
  tempPresent: number;
  tempSound: number;
  tempDecayed: number;
  tempFilled: number;
  totalDF: number; // Renamed from totalTeeth
}

/**
 * Helper to check if a symbol matches a check mark or sound designation
 */
const isCheckSymbol = (val: string): boolean => {
  const clean = val.toUpperCase().trim();
  return ['✓', 'CHECK', 'SOUND', 'GREEN_CHECK', 'BLUE_CHECK', 'V'].includes(clean);
};

export const calculateDentalCounts = (chartData: ToothMarkings = {}): DentalCounts => {
  let permPresent = 0;
  let permSound = 0;
  let permDecayed = 0;
  let permMissing = 0;
  let permFilled = 0;

  let tempPresent = 0;
  let tempSound = 0;
  let tempDecayed = 0;
  let tempFilled = 0;

  Object.entries(chartData).forEach(([toothStr, rawSymbol]) => {
    if (!rawSymbol) return;

    const toothNum = parseInt(toothStr, 10);
    const rawClean = rawSymbol.trim();
    const symbolUpper = rawClean.toUpperCase();

    // Permanent Tooth Range (11-18, 21-28, 31-38, 41-48)
    const isPermanent =
      (toothNum >= 11 && toothNum <= 18) ||
      (toothNum >= 21 && toothNum <= 28) ||
      (toothNum >= 31 && toothNum <= 38) ||
      (toothNum >= 41 && toothNum <= 48);

    // Temporary / Primary Tooth Range (51-55, 61-65, 71-75, 81-85)
    const isTemporary =
      (toothNum >= 51 && toothNum <= 55) ||
      (toothNum >= 61 && toothNum <= 65) ||
      (toothNum >= 71 && toothNum <= 75) ||
      (toothNum >= 81 && toothNum <= 85);

    if (isPermanent) {
      // No. of Perm. Teeth Present: green check mark (✓), D, F, X, S, JC
      if (isCheckSymbol(symbolUpper) || ['D', 'F', 'X', 'S', 'JC'].includes(symbolUpper)) {
        permPresent++;
      }

      // No. of Perm. Sound Teeth: green check mark (✓), F, JC
      if (isCheckSymbol(symbolUpper) || ['F', 'JC'].includes(symbolUpper)) {
        permSound++;
      }

      if (symbolUpper === 'D') permDecayed++;
      
      // 🎯 No. of Missing Teeth (M): Strict count for 'M'
      if (symbolUpper === 'M') permMissing++; 
      
      if (symbolUpper === 'F') permFilled++;

    } else if (isTemporary) {
      // 🎯 No. of Temp. Teeth Present: blue check mark (✓), d, f, x, s, jc
      if (isCheckSymbol(rawClean) || ['d', 'f', 'x', 's', 'jc'].includes(rawClean)) {
        tempPresent++;
      }

      // 🎯 No. of Temp. Sound Teeth: blue check mark (✓), f, jc
      if (isCheckSymbol(rawClean) || ['f', 'jc'].includes(rawClean)) {
        tempSound++;
      }

      // Individual temporary decayed and filled counts
      if (rawClean === 'd') tempDecayed++;
      if (rawClean === 'f') tempFilled++;
    }
  });

  // Total DMF Teeth = Sum of Decayed (D) + Missing (M) + Filled (F)
  const totalDMF = permDecayed + permMissing + permFilled;

  // 🎯 Total df Teeth = Sum of No. of Decayed Teeth (d) + No. of Filled Teeth (f)
  const totalDF = tempDecayed + tempFilled;

  return {
    permPresent,
    permSound,
    permDecayed,
    permMissing,
    permFilled,
    totalDMF,
    tempPresent,
    tempSound,
    tempDecayed,
    tempFilled,
    totalDF,
  };
};