import type { DemographicMatrix } from './reportTypes';

export const parseAgeToYearsNum = (rawAge: any): number | null => {
  if (rawAge === undefined || rawAge === null || rawAge === '') return null;
  const ageStr = rawAge.toString().toLowerCase().trim();

  if (ageStr.includes('mo') || ageStr.includes('month')) {
    const matches = ageStr.match(/\d+/g);
    if (matches && matches.length > 0) return parseInt(matches[0], 10) / 12;
  }

  const matches = ageStr.match(/\d+/g);
  if (matches && matches.length > 0) return parseInt(matches[0], 10);

  const parsed = parseFloat(ageStr);
  return isNaN(parsed) ? null : parsed;
};

export const isInfantAge = (rawAge: any): boolean => {
  if (rawAge === undefined || rawAge === null || rawAge === '') return false;
  const ageStr = rawAge.toString().toLowerCase().trim();

  if (ageStr.includes('mo') || ageStr.includes('month')) {
    const matches = ageStr.match(/\d+/g);
    if (matches && matches.length > 0) {
      const monthVal = parseInt(matches[0], 10);
      return monthVal >= 0 && monthVal <= 11;
    }
  }

  const numAge = parseFloat(ageStr);
  return !isNaN(numAge) && numAge >= 0 && numAge < 1.0;
};

export const matchesSelectedMonthAndYear = (rawDateStr: any, targetMonth: string, targetYear: string): boolean => {
  if (!rawDateStr) return false;

  const dateStr = rawDateStr.toString().trim();
  const selectedMonth = targetMonth.toLowerCase().trim();
  const selectedYear = targetYear.toString().trim();

  const monthsMap: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const monthIndex = monthsMap[selectedMonth];
  if (monthIndex === undefined) return false;

  // Handles standard date objects & ISO 8601 strings (e.g. "2026-07-29T01:54:11.144757")
  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.getMonth() === monthIndex && parsedDate.getFullYear().toString() === selectedYear;
  }

  const mmddyyyyParts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mmddyyyyParts) {
    const m = parseInt(mmddyyyyParts[1], 10) - 1;
    return m === monthIndex && mmddyyyyParts[3] === selectedYear;
  }

  return false;
};

export const parseJsonObject = (data: any) => {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch (e) { return null; }
  }
  return data;
};

export const incrementMatrix = (
  matrix: DemographicMatrix,
  numAgeInYears: number | null,
  ageVal: any,
  isMale: boolean,
  isFemale: boolean,
  isPregnant: boolean
) => {
  if (isFemale && isPregnant && numAgeInYears !== null) {
    const pAge = Math.floor(numAgeInYears);
    if (pAge >= 10 && pAge <= 14) matrix.preg10to14++;
    else if (pAge >= 15 && pAge <= 19) matrix.preg15to19++;
    else if (pAge >= 20 && pAge <= 49) matrix.preg20to49++;
    return;
  }

  if (isInfantAge(ageVal)) {
    if (isMale) matrix.infantMale++;
    else if (isFemale) matrix.infantFemale++;
    return;
  }

  if (numAgeInYears !== null) {
    const roundedAge = Math.floor(numAgeInYears);
    if (roundedAge === 1) { if (isMale) matrix.age1Male++; else if (isFemale) matrix.age1Female++; }
    else if (roundedAge === 2) { if (isMale) matrix.age2Male++; else if (isFemale) matrix.age2Female++; }
    else if (roundedAge === 3) { if (isMale) matrix.age3Male++; else if (isFemale) matrix.age3Female++; }
    else if (roundedAge === 4) { if (isMale) matrix.age4Male++; else if (isFemale) matrix.age4Female++; }
    else if (roundedAge === 5) { if (isMale) matrix.age5Male++; else if (isFemale) matrix.age5Female++; }
    else if (roundedAge === 6) { if (isMale) matrix.age6Male++; else if (isFemale) matrix.age6Female++; }
    else if (roundedAge === 7) { if (isMale) matrix.age7Male++; else if (isFemale) matrix.age7Female++; }
    else if (roundedAge === 8) { if (isMale) matrix.age8Male++; else if (isFemale) matrix.age8Female++; }
    else if (roundedAge === 9) { if (isMale) matrix.age9Male++; else if (isFemale) matrix.age9Female++; }
    else if (roundedAge === 10 || roundedAge === 11 || roundedAge === 13 || roundedAge === 14) {
      if (isMale) matrix.adolescentExcept12Male++; else if (isFemale) matrix.adolescentExcept12Female++;
    } else if (roundedAge === 12) {
      if (isMale) matrix.adolescent12Male++; else if (isFemale) matrix.adolescent12Female++;
    } else if (roundedAge >= 15 && roundedAge <= 19) {
      if (isMale) matrix.adolescent15to19Male++; else if (isFemale) matrix.adolescent15to19Female++;
    } else if (roundedAge >= 20 && roundedAge <= 59) {
      if (isMale) matrix.adult20to59Male++; else if (isFemale) matrix.adult20to59Female++;
    } else if (roundedAge >= 60) {
      if (isMale) matrix.older60PlusMale++; else if (isFemale) matrix.older60PlusFemale++;
    }
  }
};

export const finalizeMatrixTotals = (matrix: DemographicMatrix) => {
  matrix.school1to4Male = matrix.age1Male + matrix.age2Male + matrix.age3Male + matrix.age4Male;
  matrix.school1to4Female = matrix.age1Female + matrix.age2Female + matrix.age3Female + matrix.age4Female;
  matrix.school5to6Male = matrix.age5Male + matrix.age6Male;
  matrix.school5to6Female = matrix.age5Female + matrix.age6Female;
  matrix.school5to9Male = matrix.age5Male + matrix.age6Male + matrix.age7Male + matrix.age8Male + matrix.age9Male;
  matrix.school5to9Female = matrix.age5Female + matrix.age6Female + matrix.age7Female + matrix.age8Female + matrix.age9Female;

  const pregTotal = matrix.preg10to14 + matrix.preg15to19 + matrix.preg20to49;

  matrix.totalAllAgesMale =
    matrix.infantMale + matrix.school1to4Male + matrix.school5to9Male +
    matrix.adolescentExcept12Male + matrix.adolescent12Male + matrix.adolescent15to19Male +
    matrix.adult20to59Male + matrix.older60PlusMale;

  matrix.totalAllAgesFemale =
    pregTotal + matrix.infantFemale + matrix.school1to4Female + matrix.school5to9Female +
    matrix.adolescentExcept12Female + matrix.adolescent12Female + matrix.adolescent15to19Female +
    matrix.adult20to59Female + matrix.older60PlusFemale;

  matrix.grandTotal = matrix.totalAllAgesMale + matrix.totalAllAgesFemale;
};

// Helper to add a specific integer count (e.g. 3 decayed teeth) to the correct demographic matrix cell
export const addValueToMatrix = (
  m: DemographicMatrix,
  valToAdd: number,
  numAgeInYears: number,
  rawAgeStr: string,
  isMale: boolean,
  isFemale: boolean,
  isPregnant: boolean
) => {
  if (valToAdd <= 0) return;

  // Pregnant Women
  if (isPregnant && isFemale) {
    if (numAgeInYears >= 10 && numAgeInYears <= 14) m.preg10to14 = (m.preg10to14 || 0) + valToAdd;
    else if (numAgeInYears >= 15 && numAgeInYears <= 19) m.preg15to19 = (m.preg15to19 || 0) + valToAdd;
    else if (numAgeInYears >= 20 && numAgeInYears <= 49) m.preg20to49 = (m.preg20to49 || 0) + valToAdd;
  }

  // Infant 0-11 mos
  if (isInfantAge(rawAgeStr, numAgeInYears)) {
    if (isMale) m.infantMale = (m.infantMale || 0) + valToAdd;
    if (isFemale) m.infantFemale = (m.infantFemale || 0) + valToAdd;
    return;
  }

  // School Age 1-4 Y/O
  if (numAgeInYears === 1) {
    if (isMale) m.age1Male = (m.age1Male || 0) + valToAdd;
    if (isFemale) m.age1Female = (m.age1Female || 0) + valToAdd;
  } else if (numAgeInYears === 2) {
    if (isMale) m.age2Male = (m.age2Male || 0) + valToAdd;
    if (isFemale) m.age2Female = (m.age2Female || 0) + valToAdd;
  } else if (numAgeInYears === 3) {
    if (isMale) m.age3Male = (m.age3Male || 0) + valToAdd;
    if (isFemale) m.age3Female = (m.age3Female || 0) + valToAdd;
  } else if (numAgeInYears === 4) {
    if (isMale) m.age4Male = (m.age4Male || 0) + valToAdd;
    if (isFemale) m.age4Female = (m.age4Female || 0) + valToAdd;
  }

  // School Age 5-9 Y/O
  else if (numAgeInYears === 5) {
    if (isMale) m.age5Male = (m.age5Male || 0) + valToAdd;
    if (isFemale) m.age5Female = (m.age5Female || 0) + valToAdd;
  } else if (numAgeInYears === 6) {
    if (isMale) m.age6Male = (m.age6Male || 0) + valToAdd;
    if (isFemale) m.age6Female = (m.age6Female || 0) + valToAdd;
  } else if (numAgeInYears === 7) {
    if (isMale) m.age7Male = (m.age7Male || 0) + valToAdd;
    if (isFemale) m.age7Female = (m.age7Female || 0) + valToAdd;
  } else if (numAgeInYears === 8) {
    if (isMale) m.age8Male = (m.age8Male || 0) + valToAdd;
    if (isFemale) m.age8Female = (m.age8Female || 0) + valToAdd;
  } else if (numAgeInYears === 9) {
    if (isMale) m.age9Male = (m.age9Male || 0) + valToAdd;
    if (isFemale) m.age9Female = (m.age9Female || 0) + valToAdd;
  }

  // Adolescents 10-14 (except 12)
  else if (numAgeInYears >= 10 && numAgeInYears <= 14 && numAgeInYears !== 12) {
    if (isMale) m.adolescentExcept12Male = (m.adolescentExcept12Male || 0) + valToAdd;
    if (isFemale) m.adolescentExcept12Female = (m.adolescentExcept12Female || 0) + valToAdd;
  }

  // Adolescent 12 Y/O
  else if (numAgeInYears === 12) {
    if (isMale) m.adolescent12Male = (m.adolescent12Male || 0) + valToAdd;
    if (isFemale) m.adolescent12Female = (m.adolescent12Female || 0) + valToAdd;
  }

  // Adolescents 15-19 Y/O
  else if (numAgeInYears >= 15 && numAgeInYears <= 19) {
    if (isMale) m.adolescent15to19Male = (m.adolescent15to19Male || 0) + valToAdd;
    if (isFemale) m.adolescent15to19Female = (m.adolescent15to19Female || 0) + valToAdd;
  }

  // Adults 20-59 Y/O
  else if (numAgeInYears >= 20 && numAgeInYears <= 59) {
    if (isMale) m.adult20to59Male = (m.adult20to59Male || 0) + valToAdd;
    if (isFemale) m.adult20to59Female = (m.adult20to59Female || 0) + valToAdd;
  }

  // Older Persons 60+ Y/O
  else if (numAgeInYears >= 60) {
    if (isMale) m.older60PlusMale = (m.older60PlusMale || 0) + valToAdd;
    if (isFemale) m.older60PlusFemale = (m.older60PlusFemale || 0) + valToAdd;
  }
};