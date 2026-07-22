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
  totalTeeth: number;
}

/**
 * Modular helper function to parse tooth markings and return exact counts.
 * 
 * Mapping Rules:
 * - Permanent Teeth (11-18, 21-28, 31-38, 41-48):
 *    - Green Check ('✓') = No. of Perm. Sound Teeth
 *    - Green 'D' = No. of Decayed Teeth (D)
 *    - Green 'M' = No. of Missing Teeth (M)
 *    - Green 'F' = No. of Filled Teeth (F)
 * 
 * - Temporary / Primary Teeth (51-55, 61-65, 71-75, 81-85):
 *    - Blue Check ('✓') = No. of Temp. Sound Teeth
 *    - Blue 'd' = No. of Decayed Teeth (d)
 *    - Blue 'f' / 'e' = No. of Filled Teeth (f)
 */
export const calculateDentalCounts = (chartData: ToothMarkings = {}): DentalCounts => {
  let permSound = 0, permDecayed = 0, permMissing = 0, permFilled = 0;
  let tempSound = 0, tempDecayed = 0, tempFilled = 0;

  Object.entries(chartData).forEach(([toothStr, symbol]) => {
    if (!symbol) return;

    const toothNum = parseInt(toothStr, 10);

    // Check if Permanent Tooth Range (11-48)
    const isPermanent =
      (toothNum >= 11 && toothNum <= 18) ||
      (toothNum >= 21 && toothNum <= 28) ||
      (toothNum >= 31 && toothNum <= 38) ||
      (toothNum >= 41 && toothNum <= 48);

    // Check if Temporary / Primary Tooth Range (51-85)
    const isTemporary =
      (toothNum >= 51 && toothNum <= 55) ||
      (toothNum >= 61 && toothNum <= 65) ||
      (toothNum >= 71 && toothNum <= 75) ||
      (toothNum >= 81 && toothNum <= 85);

    if (isPermanent) {
      if (symbol === '✓' || symbol === 'S') permSound++;
      else if (symbol === 'D') permDecayed++;
      else if (symbol === 'M') permMissing++;
      else if (symbol === 'F') permFilled++;
    } else if (isTemporary) {
      if (symbol === '✓' || symbol === 's') tempSound++;
      else if (symbol === 'd') tempDecayed++;
      else if (symbol === 'f' || symbol === 'e') tempFilled++;
    }
  });

  const permPresent = permSound + permDecayed + permMissing + permFilled;
  const tempPresent = tempSound + tempDecayed + tempFilled;
  const totalDMF = permDecayed + permMissing + permFilled;
  const totalTeeth = permPresent + tempPresent;

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
    totalTeeth,
  };
};