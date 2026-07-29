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