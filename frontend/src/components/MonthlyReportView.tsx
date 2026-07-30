import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';

import { createEmptyMatrix } from '../utils/reportTypes';
import type { DemographicMatrix } from '../utils/reportTypes';

import { calculateDentalCounts } from '../utils/dentalChartCalculator';

import {
  parseAgeToYearsNum,
  isInfantAge,
  matchesSelectedMonthAndYear,
  parseJsonObject,
  incrementMatrix,
  finalizeMatrixTotals
} from '../utils/reportHelpers';

const rawHost = window.location.hostname;
const hostName = (rawHost === 'tauri.localhost' || !rawHost) ? '127.0.0.1' : rawHost;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${hostName}:8000`;

// Helper to add an exact numeric count (e.g., 3 decayed teeth) to the matrix
const addValueToMatrix = (
  m: DemographicMatrix,
  valToAdd: number,
  numAgeInYears: number,
  rawAgeStr: string,
  isMale: boolean,
  isFemale: boolean,
  isPregnant: boolean
) => {
  if (!valToAdd || valToAdd <= 0) return;

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

// --- REUSABLE MATRIX ROW COMPONENT ---
const MatrixRow = ({ label, m }: { label: string; m: DemographicMatrix }) => (
  <tr className="hover:bg-slate-900/40">
    <td className="p-1 border border-slate-800 text-left sticky left-0 bg-slate-950 z-10">{label}</td>
    
    {/* Pregnant Women */}
    <td className="p-1 border border-slate-800">{m.preg10to14 || 0}</td>
    <td className="p-1 border border-slate-800">{m.preg15to19 || 0}</td>
    <td className="p-1 border border-slate-800">{m.preg20to49 || 0}</td>

    {/* Infant 0-11 mos */}
    <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-blue-950/30">{m.infantMale || 0}</td>
    <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-blue-950/30">{m.infantFemale || 0}</td>

    {/* School Age 1-4 */}
    <td className="p-1 border border-slate-800">{m.age1Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.age1Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.age2Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.age2Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.age3Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.age3Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.age4Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.age4Female || 0}</td>
    <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{m.school1to4Male || 0}</td>
    <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{m.school1to4Female || 0}</td>

    {/* School Age 5-9 */}
    <td className="p-1 border border-slate-800">{m.age5Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.age5Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.age6Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.age6Female || 0}</td>
    <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{m.school5to6Male || 0}</td>
    <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{m.school5to6Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.age7Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.age7Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.age8Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.age8Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.age9Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.age9Female || 0}</td>
    <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{m.school5to9Male || 0}</td>
    <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{m.school5to9Female || 0}</td>

    {/* Adolescents & Adults */}
    <td className="p-1 border border-slate-800">{m.adolescentExcept12Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.adolescentExcept12Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.adolescent12Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.adolescent12Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.adolescent15to19Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.adolescent15to19Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.adult20to59Male || 0}</td>
    <td className="p-1 border border-slate-800">{m.adult20to59Female || 0}</td>
    <td className="p-1 border border-slate-800">{m.older60PlusMale || 0}</td>
    <td className="p-1 border border-slate-800">{m.older60PlusFemale || 0}</td>

    {/* Totals */}
    <td className="p-1 border border-slate-800 font-bold text-blue-300 bg-slate-900">{m.totalAllAgesMale || 0}</td>
    <td className="p-1 border border-slate-800 font-bold text-blue-300 bg-slate-900">{m.totalAllAgesFemale || 0}</td>
    <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/40">{m.grandTotal || 0}</td>
  </tr>
);

export function MonthlyReportView() {
  const [month, setMonth] = useState<string>('JANUARY');
  const [quarter, setQuarter] = useState<string>('1ST');
  const [year, setYear] = useState<string>('2026');
  const [facility, setFacility] = useState<string>('RURAL HEALTH UNIT II');
  const [municipality, setMunicipality] = useState<string>('SAN JOSE CITY / NUEVA ECIJA');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  
  // Dynamic indicators (NO. OF PERSON ATTENDED)
  const [counts, setCounts] = useState(createEmptyMatrix());
  
  // NO. OF PERSON EXAMINED indicators
  const [examinedCounts, setExaminedCounts] = useState(createEmptyMatrix());
  
  // SECTION A: MEDICAL HISTORY INDICATORS
  const [medHistory, setMedHistory] = useState({
    allergies: createEmptyMatrix(),
    hypertension: createEmptyMatrix(),
    diabetes: createEmptyMatrix(),
    bloodDisorder: createEmptyMatrix(),
    cardiovascular: createEmptyMatrix(),
    thyroid: createEmptyMatrix(),
    hepatitis: createEmptyMatrix(),
    malignancy: createEmptyMatrix(),
    hospitalization: createEmptyMatrix(),
    transfusion: createEmptyMatrix(),
    tattoo: createEmptyMatrix(),
  });

  // SECTION B: DIETARY / SOCIAL HISTORY INDICATORS
  const [dietaryHistory, setDietaryHistory] = useState({
    sweetenedBeverage: createEmptyMatrix(),
    alcohol: createEmptyMatrix(),
    tobacco: createEmptyMatrix(),
    betelNut: createEmptyMatrix(),
  });

  // SECTION C: ORAL HEALTH STATUS INDICATORS
  const [oralHealth, setOralHealth] = useState({
    dentalCaries: createEmptyMatrix(),
    gingivitis: createEmptyMatrix(),
    periodontalDisease: createEmptyMatrix(),
    debris: createEmptyMatrix(),
    calculus: createEmptyMatrix(),
    dentoFacialAnomalies: createEmptyMatrix(),
  });

  // SECTION C (ITEMS 7 & 8): df T AND DMF T INDICATORS
  const [dmfDfCounts, setDmfDfCounts] = useState({
    totalDf: createEmptyMatrix(),
    tempDecayed: createEmptyMatrix(),
    tempFilled: createEmptyMatrix(),
    totalDmf: createEmptyMatrix(),
    permDecayed: createEmptyMatrix(),
    permMissing: createEmptyMatrix(),
    permFilled: createEmptyMatrix(),
  });

  // SECTION D: SERVICES RENDERED INDICATORS
  const [servicesRenderedCounts, setServicesRenderedCounts] = useState({
    opScaling: createEmptyMatrix(),
    permFillings: createEmptyMatrix(),
    tempFillings: createEmptyMatrix(),
    extraction: createEmptyMatrix(),
    gumTreatment: createEmptyMatrix(),
    sealant: createEmptyMatrix(),
    completedFluoride: createEmptyMatrix(),
    sdfFluoride: createEmptyMatrix(),
    postOpTreatment: createEmptyMatrix(),
    abscessTreated: createEmptyMatrix(),
    otherServices: createEmptyMatrix(),
    referred: createEmptyMatrix(),
    counselling: createEmptyMatrix(),
    toothBrushingDrill: createEmptyMatrix(),
  });

  // SECTION E: ORALLY FIT CHILD (OFC) STATUS
  const [ofcStatus, setOfcStatus] = useState({
    examTotal: createEmptyMatrix(),
    examNhts: createEmptyMatrix(),
    examNonNhts: createEmptyMatrix(),
    rehabTotal: createEmptyMatrix(),
    rehabNhts: createEmptyMatrix(),
    rehabNonNhts: createEmptyMatrix(),
  });

  // SECTION F: PATIENTS EXAMINED GIVEN BOHC
  const [bohcStatus, setBohcStatus] = useState({
    totalBohc: createEmptyMatrix(),
    nhts: createEmptyMatrix(),
    nonNhts: createEmptyMatrix(),
  });

  const fetchReportData = async () => {
    setIsLoading(true);
    
    const candidateEndpoints = [
      `${API_BASE_URL}/api/v1/forms/records`,
      `${API_BASE_URL}/api/v1/records`,
      `${API_BASE_URL}/api/v1/patients`,
      `${API_BASE_URL}/api/v1/forms/search`,
      `${API_BASE_URL}/api/v1/forms/`
    ];

    let resData: any = null;

    for (const url of candidateEndpoints) {
      try {
        const res = await axios.get(url);
        if (res.status === 200 && res.data) {
          console.log(`✅ Successfully connected to endpoint: ${url}`, res.data);
          resData = res.data;
          break;
        }
      } catch (err) {
        // Silently try next endpoint
      }
    }

    if (!resData) {
      console.warn('❌ Could not locate GET endpoint for forms list.');
      setIsLoading(false);
      setAllRecords([]);
      calculateCounts([]);
      return;
    }

    let recordsList: any[] = [];
    if (Array.isArray(resData)) {
      recordsList = resData;
    } else if (resData && Array.isArray(resData.records)) {
      recordsList = resData.records;
    } else if (resData && Array.isArray(resData.forms)) {
      recordsList = resData.forms;
    } else if (resData && Array.isArray(resData.data)) {
      recordsList = resData.data;
    }

    setAllRecords(recordsList);
    calculateCounts(recordsList);
    setIsLoading(false);
  };

  const handleExportExcel = () => {
    const tableElement = document.querySelector('table');
    if (!tableElement) {
      alert('Report table not found.');
      return;
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Monthly Oral Health Report</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; }
            th, td { border: 1px solid #333333; padding: 4px; text-align: center; }
            th { background-color: #0f172a; color: #ffffff; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>CONSOLIDATED ORAL HEALTH STATUS, SERVICES AND MEDICAL HISTORY MONTHLY REPORTING</h2>
          <p><b>Facility:</b> ${facility} | <b>Location:</b> ${municipality} | <b>Period:</b> ${month} ${quarter} QTR ${year}</p>
          ${tableElement.outerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const sanitizedFacility = facility.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Monthly_Report_${sanitizedFacility}_${month}_${year}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const calculateCounts = (records: any[]) => {
    const attended = createEmptyMatrix();
    const examined = createEmptyMatrix();

    const med = {
      allergies: createEmptyMatrix(),
      hypertension: createEmptyMatrix(),
      diabetes: createEmptyMatrix(),
      bloodDisorder: createEmptyMatrix(),
      cardiovascular: createEmptyMatrix(),
      thyroid: createEmptyMatrix(),
      hepatitis: createEmptyMatrix(),
      malignancy: createEmptyMatrix(),
      hospitalization: createEmptyMatrix(),
      transfusion: createEmptyMatrix(),
      tattoo: createEmptyMatrix(),
    };

    const diet = {
      sweetenedBeverage: createEmptyMatrix(),
      alcohol: createEmptyMatrix(),
      tobacco: createEmptyMatrix(),
      betelNut: createEmptyMatrix(),
    };

    const oral = {
      dentalCaries: createEmptyMatrix(),
      gingivitis: createEmptyMatrix(),
      periodontalDisease: createEmptyMatrix(),
      debris: createEmptyMatrix(),
      calculus: createEmptyMatrix(),
      dentoFacialAnomalies: createEmptyMatrix(),
    };

    const dmfDf = {
      totalDf: createEmptyMatrix(),
      tempDecayed: createEmptyMatrix(),
      tempFilled: createEmptyMatrix(),
      totalDmf: createEmptyMatrix(),
      permDecayed: createEmptyMatrix(),
      permMissing: createEmptyMatrix(),
      permFilled: createEmptyMatrix(),
    };

    const serv = {
      opScaling: createEmptyMatrix(),
      permFillings: createEmptyMatrix(),
      tempFillings: createEmptyMatrix(),
      extraction: createEmptyMatrix(),
      gumTreatment: createEmptyMatrix(),
      sealant: createEmptyMatrix(),
      completedFluoride: createEmptyMatrix(),
      sdfFluoride: createEmptyMatrix(),
      postOpTreatment: createEmptyMatrix(),
      abscessTreated: createEmptyMatrix(),
      otherServices: createEmptyMatrix(),
      referred: createEmptyMatrix(),
      counselling: createEmptyMatrix(),
      toothBrushingDrill: createEmptyMatrix(),
    };

    const ofc = {
      examTotal: createEmptyMatrix(),
      examNhts: createEmptyMatrix(),
      examNonNhts: createEmptyMatrix(),
      rehabTotal: createEmptyMatrix(),
      rehabNhts: createEmptyMatrix(),
      rehabNonNhts: createEmptyMatrix(),
    };

    const bohc = {
      totalBohc: createEmptyMatrix(),
      nhts: createEmptyMatrix(),
      nonNhts: createEmptyMatrix(),
    };

    if (!Array.isArray(records) || records.length === 0) {
      setCounts(attended);
      setExaminedCounts(examined);
      setMedHistory(med);
      setDietaryHistory(diet);
      setOralHealth(oral);
      setDmfDfCounts(dmfDf);
      setServicesRenderedCounts(serv);
      setOfcStatus(ofc);
      setBohcStatus(bohc);
      return;
    }

    const isTrue = (val: any) => {
      if (val === undefined || val === null) return false;
      if (typeof val === 'boolean') return val;
      const s = val.toString().trim().toLowerCase();
      return (
        s === 'true' ||
        s === 'yes' ||
        s === '1' ||
        s === 'checked' ||
        s === '✓' ||
        s === 'present'
      );
    };

    const hasCondition = (rawObj: any, flatRecord: any, ...keys: string[]) => {
      for (const key of keys) {
        if (rawObj && isTrue(rawObj[key])) return true;
        if (flatRecord && isTrue(flatRecord[key])) return true;
      }
      return false;
    };

    // Flexible manual date parser (handles single/double digits like 1/25/2026 or 01/25/2026)
    const extractManualDate = (logObj: any): string => {
      if (!logObj) return '';
      const candidates = [
        logObj.recordEntryDate,
        logObj.record_entry_date,
        logObj.entryDate,
        logObj.visitDate,
        logObj.activeLog,
        logObj.active_log,
        logObj.date,
        logObj.visitLabel,
      ];

      for (const cand of candidates) {
        if (!cand) continue;
        const str = cand.toString().trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
          return str;
        }
      }

      for (const cand of candidates) {
        if (!cand) continue;
        const str = cand.toString().trim().split(',')[0].split('T')[0];
        if (str && str !== 'N/A') return str;
      }

      return '';
    };

    records.forEach((record: any) => {
      try {
        const patientInfo = typeof record.patient_info === 'string'
          ? parseJsonObject(record.patient_info) || {}
          : (record.patient_info || {});

        const medHistoryRaw = typeof record.medical_history === 'string'
          ? parseJsonObject(record.medical_history) || {}
          : (record.medical_history || {});

        const dentalChartRaw = parseJsonObject(record.dental_chart);
        const servicesMonRaw = parseJsonObject(record.services_monitoring);

        const socialHistoryRaw = typeof record.social_history === 'string'
          ? parseJsonObject(record.social_history) || {}
          : (record.social_history || {});

        const oralSummaryRaw = typeof record.oral_health_condition_summary === 'string'
          ? parseJsonObject(record.oral_health_condition_summary) || {}
          : (record.oral_health_condition_summary || {});

        const servicesRenderedRaw = typeof record.record_of_services_rendered === 'string'
          ? parseJsonObject(record.record_of_services_rendered) || []
          : (record.record_of_services_rendered || []);

        // -------------------------------------------------------------
        // 🎯 MEMBERSHIP & DEMOGRAPHIC PARSING WITH PREGNANCY DETECTION
        // -------------------------------------------------------------
        const membershipsRaw = typeof record.memberships === 'string'
          ? parseJsonObject(record.memberships) || {}
          : (record.memberships || {});

        // Strict Membership Boolean Check (Matches formData.nhtsPr -> memberships.nhts_pr)
        const isNHTS = Boolean(
          isTrue(membershipsRaw.nhts_pr) ||
          isTrue(membershipsRaw.nhtsPr) ||
          isTrue(membershipsRaw.nhts) ||
          isTrue(record.nhts_pr) ||
          isTrue(record.nhtsPr) ||
          isTrue(record.nhts)
        );

        const ageVal = patientInfo.age || record.age || '';
        const sexVal = (patientInfo.sex || record.sex || '').toString().trim().toLowerCase();
        const isMale = sexVal === 'm' || sexVal === 'male';
        const isExplicitFemale = sexVal === 'f' || sexVal === 'female';
        const numAgeInYears = parseAgeToYearsNum(ageVal);

        // Medical History "Others (Please specify)" Pregnancy Check
        const othersSpecifiedVal = (
          medHistoryRaw.others_specified ||
          medHistoryRaw.othersSpecified ||
          record.others_specified ||
          record.othersSpecified ||
          medHistoryRaw.others ||
          ''
        ).toString().trim().toLowerCase();

        const isOthersPregnant =
          othersSpecifiedVal.includes('pregnant') ||
          othersSpecifiedVal.includes('pregnancy');

        const isPregnantFlag = Boolean(
          patientInfo.is_pregnant ||
          record.is_pregnant ||
          patientInfo.pregnant ||
          record.pregnant
        );

        // 🎯 Evaluates to TRUE if flagged OR if "pregnant" was entered under Others
        const isPregnant = isPregnantFlag || isOthersPregnant;
        
        // 🎯 Automatically classifies patient as Female if pregnant
        const isFemale = isExplicitFemale || isPregnant;

        // -------------------------------------------------------------
        // 1. DENTAL CHART VISITS
        // -------------------------------------------------------------
        const visitsArr = Array.isArray(dentalChartRaw)
          ? dentalChartRaw
          : dentalChartRaw && typeof dentalChartRaw === 'object'
          ? [dentalChartRaw]
          : [];

        let recordHasMatchingClinicalVisit = false;

        visitsArr.forEach((visitLog: any) => {
          if (!visitLog) return;
          const visitDateStr = extractManualDate(visitLog);

          if (visitDateStr && matchesSelectedMonthAndYear(visitDateStr, month, year)) {
            recordHasMatchingClinicalVisit = true;

            let rawVisitData = visitLog.chartData !== undefined ? visitLog.chartData : (visitLog.teeth !== undefined ? visitLog.teeth : visitLog);
            if (typeof rawVisitData === 'string') {
              rawVisitData = parseJsonObject(rawVisitData) || {};
            }

            const chartData: Record<string, string> = typeof rawVisitData === 'object' && rawVisitData !== null ? rawVisitData : {};
            const dCounts = calculateDentalCounts(chartData);

            addValueToMatrix(dmfDf.totalDf, dCounts.totalDF, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
            addValueToMatrix(dmfDf.tempDecayed, dCounts.tempDecayed, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
            addValueToMatrix(dmfDf.tempFilled, dCounts.tempFilled, numAgeInYears, ageVal, isMale, isFemale, isPregnant);

            addValueToMatrix(dmfDf.totalDmf, dCounts.totalDMF, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
            addValueToMatrix(dmfDf.permDecayed, dCounts.permDecayed, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
            addValueToMatrix(dmfDf.permMissing, dCounts.permMissing, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
            addValueToMatrix(dmfDf.permFilled, dCounts.permFilled, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
        });

        // -------------------------------------------------------------
        // 2. SERVICES RENDERED LOGS
        // -------------------------------------------------------------
        const servRows = Array.isArray(servicesRenderedRaw)
          ? servicesRenderedRaw
          : servicesRenderedRaw && typeof servicesRenderedRaw === 'object'
          ? [servicesRenderedRaw]
          : [];

        const dateMatchedServRows = servRows.filter((r: any) => {
          if (!r) return false;
          const rowDateStr = extractManualDate(r);
          return rowDateStr && matchesSelectedMonthAndYear(rowDateStr, month, year);
        });

        const hasServiceChecked = (...keys: string[]) => {
          return dateMatchedServRows.some((r) => keys.some((k) => isTrue(r[k])));
        };

        const hasServiceValue = (...keys: string[]) => {
          return dateMatchedServRows.some((r) =>
            keys.some((k) => r[k] !== undefined && r[k] !== null && r[k].toString().trim() !== '')
          );
        };

        if (dateMatchedServRows.length > 0) {
          recordHasMatchingClinicalVisit = true;

          if (hasServiceChecked('oralProphylaxis', 'oral_prophylaxis', 'op')) {
            incrementMatrix(serv.opScaling, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceValue('permanentFilling', 'permanent_filling')) {
            incrementMatrix(serv.permFillings, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceValue('temporaryFilling', 'temporary_filling')) {
            incrementMatrix(serv.tempFillings, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceValue('extraction')) {
            incrementMatrix(serv.extraction, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceChecked('gumTreatment', 'gum_treatment')) {
            incrementMatrix(serv.gumTreatment, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceValue('pitAndFissureSealant', 'pit_and_fissure_sealant', 'sealant')) {
            incrementMatrix(serv.sealant, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceChecked('fluorideVarnishGel', 'fluoride_varnish_gel', 'silverDiamineFluoride')) {
            incrementMatrix(serv.sdfFluoride, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceChecked('postOperativeTreatment', 'post_operative_treatment')) {
            incrementMatrix(serv.postOpTreatment, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceChecked('oralAbscessDrained', 'oral_abscess_drained')) {
            incrementMatrix(serv.abscessTreated, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceValue('remarks', 'details')) {
            incrementMatrix(serv.otherServices, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceChecked('referred')) {
            incrementMatrix(serv.referred, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceChecked('givenCounselling', 'given_counselling')) {
            incrementMatrix(serv.counselling, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasServiceChecked('completedToothBrushingDrill', 'completed_tooth_brushing_drill')) {
            incrementMatrix(serv.toothBrushingDrill, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
        }

        const servMonArr = Array.isArray(servicesMonRaw)
          ? servicesMonRaw
          : servicesMonRaw && typeof servicesMonRaw === 'object'
          ? [servicesMonRaw]
          : [];

        const hasCompletedFluorideDateMatched = servMonArr.some((s) => {
          if (!s) return false;
          const sDate = extractManualDate(s);
          return (
            sDate &&
            matchesSelectedMonthAndYear(sDate, month, year) &&
            s.fluorideStatus &&
            s.fluorideStatus.toString().trim().toLowerCase() === 'completed'
          );
        });

        if (hasCompletedFluorideDateMatched) {
          recordHasMatchingClinicalVisit = true;
          incrementMatrix(serv.completedFluoride, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
        }

        // -------------------------------------------------------------
        // 3. ATTENDED / EXAMINED / MEDICAL HISTORY / DIETARY HISTORY
        // -------------------------------------------------------------
        if (recordHasMatchingClinicalVisit) {
          incrementMatrix(attended, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          incrementMatrix(examined, numAgeInYears, ageVal, isMale, isFemale, isPregnant);

          if (hasCondition(medHistoryRaw, record, 'allergies_checked', 'allergiesChecked', 'allergies', 'allergies_specified')) {
            incrementMatrix(med.allergies, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'hypertension_cva', 'hypertensionCva', 'hypertension', 'cva')) {
            incrementMatrix(med.hypertension, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'diabetes_mellitus', 'diabetesMellitus', 'diabetes')) {
            incrementMatrix(med.diabetes, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'blood_disorder', 'bloodDisorder', 'blood_disorders', 'bloodDisorders')) {
            incrementMatrix(med.bloodDisorder, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'cardiovascular_heart_diseases', 'cardiovascularHeartDiseases', 'cardiovascular', 'heart_disease')) {
            incrementMatrix(med.cardiovascular, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'thyroid_disorders', 'thyroidDisorders', 'thyroid')) {
            incrementMatrix(med.thyroid, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'hepatitis_checked', 'hepatitisChecked', 'hepatitis', 'hepatitis_specified')) {
            incrementMatrix(med.hepatitis, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'malignancy_checked', 'malignancyChecked', 'malignancy', 'malignancy_specified')) {
            incrementMatrix(med.malignancy, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'medical_hospitalization_checked', 'medicalHospitalizationChecked', 'medical_hospitalization_specified', 'surgical_checked', 'surgicalChecked', 'last_admission')) {
            incrementMatrix(med.hospitalization, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'blood_transfusion_checked', 'bloodTransfusionChecked', 'blood_transfusion_specified', 'blood_transfusion')) {
            incrementMatrix(med.transfusion, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(medHistoryRaw, record, 'tattoo_checked', 'tattooChecked', 'tattoo_specified', 'tattoo')) {
            incrementMatrix(med.tattoo, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          if (hasCondition(socialHistoryRaw, record, 'sugar_beverages_checked', 'sugarBeveragesChecked', 'sugar_beverages_specified', 'sugarBeveragesSpecified', 'sugar_beverage')) {
            incrementMatrix(diet.sweetenedBeverage, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(socialHistoryRaw, record, 'use_alcohol_checked', 'useAlcoholChecked', 'use_alcohol_specified', 'useAlcoholSpecified', 'alcohol')) {
            incrementMatrix(diet.alcohol, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(socialHistoryRaw, record, 'use_tobacco_checked', 'useTobaccoChecked', 'use_tobacco_specified', 'useTobaccoSpecified', 'tobacco')) {
            incrementMatrix(diet.tobacco, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(socialHistoryRaw, record, 'betel_nut_checked', 'betelNutChecked', 'betel_nut_specified', 'betelNutSpecified', 'betel_nut')) {
            incrementMatrix(diet.betelNut, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          if (hasCondition(oralSummaryRaw, record, 'oh_dental_caries', 'dentalCaries', 'dental_caries', 'caries')) {
            incrementMatrix(oral.dentalCaries, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(oralSummaryRaw, record, 'oh_gingivitis', 'gingivitis', 'has_gingivitis')) {
            incrementMatrix(oral.gingivitis, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(oralSummaryRaw, record, 'oh_periodontal_disease', 'periodontalDisease', 'periodontal_disease')) {
            incrementMatrix(oral.periodontalDisease, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(oralSummaryRaw, record, 'oh_debris', 'debris', 'oral_debris', 'oralDebris')) {
            incrementMatrix(oral.debris, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(oralSummaryRaw, record, 'oh_calculus', 'calculus', 'has_calculus')) {
            incrementMatrix(oral.calculus, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
          if (hasCondition(oralSummaryRaw, record, 'oh_cleft_lip_palate', 'cleftLipPalate', 'cleft_lip_palate', 'cleftLip', 'cleftPalate', 'oh_abnormal_growth', 'abnormalGrowth')) {
            incrementMatrix(oral.dentoFacialAnomalies, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
        }

		// -------------------------------------------------------------
        // 🎯 SECTION E: ORALLY FIT CHILD (OFC) STATUS & SECTION F: BOHC
        // -------------------------------------------------------------
        const isOFC = (obj: any) => {
          if (!obj) return false;
          const val = (
            obj.oh_orally_fit_child ??
            obj.orally_fit_child ??
            obj.orallyFitChild ??
            obj.ofc ??
            ''
          ).toString().trim().toLowerCase();

          return val === 'present' || val === 'checked' || val === 'true' || val === '✓' || val === 'yes' || val === '1';
        };

        const isOFCAbsent = (obj: any) => {
          if (!obj) return false;
          const val = (
            obj.oh_orally_fit_child ??
            obj.orally_fit_child ??
            obj.orallyFitChild ??
            obj.ofc ??
            ''
          ).toString().trim().toLowerCase();

          return val === '*' || val === 'absent' || val === 'false' || val === 'no' || val === '0';
        };

        // 🎯 DIRECT TOP-LEVEL & VISIT OFC CHECK
        const isExamOfcChecked = 
          isOFC(oralSummaryRaw) || 
          isOFC(record.oral_health_condition_summary) || 
          isOFC(record);

        let hasOFCUponExam = false;
        let rehabMatchingCount = 0;

        // Check if OFC exam date matches selected month/year
        if (isExamOfcChecked) {
          // Check top-level entry date OR visit entry dates
          const recordEntryDate = extractManualDate(record) || extractManualDate(oralSummaryRaw);
          if (recordEntryDate && matchesSelectedMonthAndYear(recordEntryDate, month, year)) {
            hasOFCUponExam = true;
          } else if (visitsArr.length > 0) {
            visitsArr.forEach((v: any) => {
              const vDate = extractManualDate(v);
              if (vDate && matchesSelectedMonthAndYear(vDate, month, year)) {
                hasOFCUponExam = true;
              }
            });
          } else {
            // Fallback: If clinical visit matched this month, count OFC Upon Exam
            hasOFCUponExam = recordHasMatchingClinicalVisit;
          }
        }

        // 🎯 REHABILITATION TRIGGER: ONLY IF NOT EXAM OFC
        if (!hasOFCUponExam && servMonArr.length > 0) {
          servMonArr.forEach((servMonVisit: any) => {
            if (!servMonVisit) return;
            const activeLogDateStr =
              servMonVisit.activeLog ||
              servMonVisit.active_log ||
              extractManualDate(servMonVisit);

            if (activeLogDateStr && matchesSelectedMonthAndYear(activeLogDateStr, month, year)) {
              rehabMatchingCount += 1;
            }
          });
        }

        // -------------------------------------------------------------
        // INCREMENT MATRICES
        // -------------------------------------------------------------
        if (hasOFCUponExam) {
          incrementMatrix(ofc.examTotal, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          if (isNHTS) {
            incrementMatrix(ofc.examNhts, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          } else {
            incrementMatrix(ofc.examNonNhts, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
        }

        if (rehabMatchingCount > 0) {
          for (let i = 0; i < rehabMatchingCount; i++) {
            incrementMatrix(ofc.rehabTotal, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
            if (isNHTS) {
              incrementMatrix(ofc.rehabNhts, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
            } else {
              incrementMatrix(ofc.rehabNonNhts, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
            }
          }
        }

        // SECTION F: NO. OF PATIENTS EXAMINED GIVEN BOHC
        if (recordHasMatchingClinicalVisit) {
          incrementMatrix(bohc.totalBohc, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          if (isNHTS) {
            incrementMatrix(bohc.nhts, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          } else {
            incrementMatrix(bohc.nonNhts, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }
        }

      } catch (e) {
        console.error('Error processing record:', e, record);
      }
    });

    finalizeMatrixTotals(attended);
    finalizeMatrixTotals(examined);
    Object.values(med).forEach(finalizeMatrixTotals);
    Object.values(diet).forEach(finalizeMatrixTotals);
    Object.values(oral).forEach(finalizeMatrixTotals);
    Object.values(dmfDf).forEach(finalizeMatrixTotals);
    Object.values(serv).forEach(finalizeMatrixTotals);

    finalizeMatrixTotals(ofc.examTotal);
    finalizeMatrixTotals(ofc.examNhts);
    finalizeMatrixTotals(ofc.examNonNhts);
    finalizeMatrixTotals(ofc.rehabTotal);
    finalizeMatrixTotals(ofc.rehabNhts);
    finalizeMatrixTotals(ofc.rehabNonNhts);

    finalizeMatrixTotals(bohc.totalBohc);
    finalizeMatrixTotals(bohc.nhts);
    finalizeMatrixTotals(bohc.nonNhts);

    setCounts(attended);
    setExaminedCounts(examined);
    setMedHistory(med);
    setDietaryHistory(diet);
    setOralHealth(oral);
    setDmfDfCounts(dmfDf);
    setServicesRenderedCounts(serv);
    setOfcStatus(ofc);
    setBohcStatus(bohc);
  };
  
  useEffect(() => {
    fetchReportData();
  }, [month, quarter, year]);

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Consolidated Monthly Oral Health Report</h2>
            <p className="text-xs text-slate-400">Official DOH / CHO Treatment Record Analytics Aggregator</p>
          </div>
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">Month / Quarter / Year</label>
            <div className="flex gap-1.5">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg font-semibold"
              >
                {['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg font-semibold"
              >
                {['1ST', '2ND', '3RD', '4TH'].map((q) => (
                  <option key={q} value={q}>{q} QTR</option>
                ))}
              </select>

              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg w-16 text-center font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex items-end gap-2 pt-4">
            <button
              onClick={fetchReportData}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-lg transition border border-slate-700"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
              title="Export to Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Official Form Header Summary */}
      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4 print:bg-white print:text-black print:border-none">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono border-b border-slate-800 pb-4">
          <div>
            <label className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Month / Quarter / Year:
            </label>
            <div className="flex items-center gap-1.5 border-b border-slate-700 pb-0.5 focus-within:border-blue-500">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent text-blue-400 font-bold text-sm focus:outline-none cursor-pointer uppercase"
              >
                {['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-slate-100">{m}</option>
                ))}
              </select>

              <span className="text-blue-400 font-bold text-sm">/</span>

              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="bg-transparent text-blue-400 font-bold text-sm focus:outline-none cursor-pointer uppercase"
              >
                {['1ST', '2ND', '3RD', '4TH'].map((q) => (
                  <option key={q} value={q} className="bg-slate-900 text-slate-100">{q} QTR</option>
                ))}
              </select>

              <span className="text-blue-400 font-bold text-sm">/</span>

              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="bg-transparent text-blue-400 font-bold text-sm w-16 focus:outline-none font-mono"
                placeholder="2026"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Name of Health Facility:
            </label>
            <div className="border-b border-slate-700 pb-0.5 focus-within:border-blue-500">
              <input
                type="text"
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                className="bg-transparent font-bold text-slate-200 text-sm w-full focus:outline-none uppercase tracking-wide"
                placeholder="RURAL HEALTH UNIT II"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Municipality / City / Province:
            </label>
            <div className="border-b border-slate-700 pb-0.5 focus-within:border-blue-500">
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="bg-transparent font-bold text-slate-200 text-sm w-full focus:outline-none uppercase tracking-wide"
                placeholder="SAN JOSE CITY / NUEVA ECIJA"
              />
            </div>
          </div>
        </div>

        <div className="text-center py-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
            CONSOLIDATED ORAL HEALTH STATUS, SERVICES AND MEDICAL HISTORY MONTHLY REPORTING
          </h3>
        </div>

        {/* Reporting Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-800 text-[9px] font-mono whitespace-nowrap">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th rowSpan={3} className="border border-slate-800 p-2 min-w-[220px] align-middle text-center bg-slate-950 font-bold sticky left-0 z-10">
                  INDICATORS
                </th>
                <th colSpan={3} className="border border-slate-800 p-1 text-center bg-slate-950 font-bold">
                  Pregnant Women
                </th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center font-bold">
                  Infant (0-11 mos.)
                </th>
                <th colSpan={24} className="border border-slate-800 p-1 text-center bg-slate-950 font-bold">
                  School Age Children
                </th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center font-bold">
                  Adolescents 10-14 Y/O <br/>except 12 Y/O
                </th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center bg-slate-950 font-bold">
                  Adolescents 12 <br/>Y/O
                </th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center font-bold">
                  Adolescents 15-19 <br/>Y/O
                </th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center bg-slate-950 font-bold">
                  Adults 20-59 Y/O
                </th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center font-bold">
                  Older Persons 60+ Y/O
                </th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center bg-slate-950 font-bold">
                  TOTAL ALL AGES
                </th>
                <th rowSpan={3} className="border border-slate-800 p-1 text-center font-bold bg-blue-950/60 text-blue-300 align-middle">
                  GRAND TOTAL<br/>(M+F+Preg. Women)
                </th>
              </tr>

              <tr className="text-[8.5px] text-center font-semibold">
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">10-14 Y/O</th>
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">15-19 Y/O</th>
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">20-49 Y/O</th>

                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">M</th>
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">F</th>

                <th colSpan={2} className="border border-slate-800 p-0.5">1</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">2</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">3</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">4</th>
                <th colSpan={2} className="border border-slate-800 p-0.5 bg-slate-800/60 font-bold text-blue-300">Total (1-4 Y/O)</th>

                <th colSpan={2} className="border border-slate-800 p-0.5">5</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">6</th>
                <th colSpan={2} className="border border-slate-800 p-0.5 bg-slate-800/60 font-bold text-blue-300">Total (5-6 Y/O)</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">7</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">8</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">9</th>
                <th colSpan={2} className="border border-slate-800 p-0.5 bg-slate-800/60 font-bold text-blue-300">Total (5-9 Y/O)</th>

                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">M</th>
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">F</th>

                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">M</th>
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">F</th>

                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">M</th>
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">F</th>

                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">M</th>
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">F</th>

                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">M</th>
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle">F</th>

                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle bg-slate-800/80 text-blue-300">M</th>
                <th rowSpan={2} className="border border-slate-800 p-0.5 align-middle bg-slate-800/80 text-blue-300">F</th>
              </tr>

              <tr className="text-[8px] text-center font-bold text-slate-400">
                <th className="border border-slate-800 px-1">M</th><th className="border border-slate-800 px-1">F</th>
                <th className="border border-slate-800 px-1">M</th><th className="border border-slate-800 px-1">F</th>
                <th className="border border-slate-800 px-1">M</th><th className="border border-slate-800 px-1">F</th>
                <th className="border border-slate-800 px-1">M</th><th className="border border-slate-800 px-1">F</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">M</th><th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">F</th>

                <th className="border border-slate-800 px-1">M</th><th className="border border-slate-800 px-1">F</th>
                <th className="border border-slate-800 px-1">M</th><th className="border border-slate-800 px-1">F</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">M</th><th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">F</th>
                <th className="border border-slate-800 px-1">M</th><th className="border border-slate-800 px-1">F</th>
                <th className="border border-slate-800 px-1">M</th><th className="border border-slate-800 px-1">F</th>
                <th className="border border-slate-800 px-1">M</th><th className="border border-slate-800 px-1">F</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">M</th><th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">F</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-slate-300 text-center">
              {/* ATTENDANCE & EXAMINATION */}
              <MatrixRow label="NO. OF PERSON ATTENDED" m={counts} />
              <MatrixRow label="NO. OF PERSON EXAMINED" m={examinedCounts} />

              {/* SECTION A: MEDICAL HISTORY */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={43} className="p-1 border border-slate-800 uppercase">A. MEDICAL HISTORY</td>
              </tr>
              <MatrixRow label="1. Total No. with Allergies" m={medHistory.allergies} />
              <MatrixRow label="2. Total No. with Hypertension / CVA" m={medHistory.hypertension} />
              <MatrixRow label="3. Total No. with Diabetes Mellitus" m={medHistory.diabetes} />
              <MatrixRow label="4. Total No. with Blood Disorder" m={medHistory.bloodDisorder} />
              <MatrixRow label="5. Total No. with Cardiovascular / Heart Disease" m={medHistory.cardiovascular} />
              <MatrixRow label="6. Total No. with Thyroid Disorders" m={medHistory.thyroid} />
              <MatrixRow label="7. Total No. with Hepatitis" m={medHistory.hepatitis} />
              <MatrixRow label="8. Total No. with Malignancy" m={medHistory.malignancy} />
              <MatrixRow label="9. Total No. with History of Previous Hospitalization" m={medHistory.hospitalization} />
              <MatrixRow label="10. Total No. with Blood Transfusion" m={medHistory.transfusion} />
              <MatrixRow label="11. Total No. with Tattoo" m={medHistory.tattoo} />

              {/* SECTION B: DIETARY / SOCIAL HISTORY */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={43} className="p-1 border border-slate-800 uppercase">B. DIETARY / SOCIAL HISTORY STATUS</td>
              </tr>
              <MatrixRow label="1. Total No. of Sugar Sweetened Beverage / Food Drinker / Eater" m={dietaryHistory.sweetenedBeverage} />
              <MatrixRow label="2. Total No. of Alcohol Drinker" m={dietaryHistory.alcohol} />
              <MatrixRow label="3. Total No. of Tobacco User" m={dietaryHistory.tobacco} />
              <MatrixRow label="4. Total No. of Betel Nut Chewer" m={dietaryHistory.betelNut} />

              {/* SECTION C: ORAL HEALTH STATUS */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={43} className="p-1 border border-slate-800 uppercase">C. ORAL HEALTH STATUS</td>
              </tr>
              <MatrixRow label="1. Total No. with Dental Caries" m={oralHealth.dentalCaries} />
              <MatrixRow label="2. Total No. with Gingivitis" m={oralHealth.gingivitis} />
              <MatrixRow label="3. Total No. with Periodontal Disease" m={oralHealth.periodontalDisease} />
              <MatrixRow label="4. Total No. with Oral Debris" m={oralHealth.debris} />
              <MatrixRow label="5. Total No. with Calculus" m={oralHealth.calculus} />
              <MatrixRow label="6. Total No. with Dento-Facial Anomalies (cleft lip/palate, etc.)" m={oralHealth.dentoFacialAnomalies} />
              
              <MatrixRow label="7. Total (df) T" m={dmfDfCounts.totalDf} />
              <MatrixRow label="  a. Total decayed (d)" m={dmfDfCounts.tempDecayed} />
              <MatrixRow label="  b. Total filled (f)" m={dmfDfCounts.tempFilled} />

              <MatrixRow label="8. Total (DMF) T" m={dmfDfCounts.totalDmf} />
              <MatrixRow label="  a. Total Decayed (D)" m={dmfDfCounts.permDecayed} />
              <MatrixRow label="  b. Total Missing (M)" m={dmfDfCounts.permMissing} />
              <MatrixRow label="  c. Total Filled (F)" m={dmfDfCounts.permFilled} />

              {/* SECTION D: SERVICES RENDERED */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={43} className="p-1 border border-slate-800 uppercase">D. SERVICES RENDERED</td>
              </tr>
              <MatrixRow label="1. No. Given OP / Scaling" m={servicesRenderedCounts.opScaling} />
              <MatrixRow label="2. No. Given Permanent Fillings" m={servicesRenderedCounts.permFillings} />
              <MatrixRow label="3. No. Given Temporary Fillings" m={servicesRenderedCounts.tempFillings} />
              <MatrixRow label="4. No. Given Extraction" m={servicesRenderedCounts.extraction} />
              <MatrixRow label="5. No. Given Gum Treatment" m={servicesRenderedCounts.gumTreatment} />
              <MatrixRow label="6. No. Given Sealant" m={servicesRenderedCounts.sealant} />
              <MatrixRow label="7. No. Completed Fluoride Therapy" m={servicesRenderedCounts.completedFluoride} />
              <MatrixRow label="8. No. Given Silver Diamine Fluoride" m={servicesRenderedCounts.sdfFluoride} />
              <MatrixRow label="9. No. Given Post-Operative Treatment" m={servicesRenderedCounts.postOpTreatment} />
              <MatrixRow label="10. No. of Patient with Oral Abscess Treated" m={servicesRenderedCounts.abscessTreated} />
              <MatrixRow label="11. No. Given Other Services" m={servicesRenderedCounts.otherServices} />
              <MatrixRow label="12. No. of Referred" m={servicesRenderedCounts.referred} />
              <MatrixRow label="13. No. Given Counselling / Education on Tobacco, Oral Health" m={servicesRenderedCounts.counselling} />
              <MatrixRow label="14. No. Under 5 Children Completed Tooth Brushing Drill" m={servicesRenderedCounts.toothBrushingDrill} />

              {/* SECTION E: OFC STATUS */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={43} className="p-1 border border-slate-800 uppercase">E. ORALLY FIT CHILD (OFC) STATUS</td>
              </tr>
              <MatrixRow label="1. OFC Upon Oral Examination" m={ofcStatus.examTotal} />
              <MatrixRow label="  NHTS" m={ofcStatus.examNhts} />
              <MatrixRow label="  NON-NHTS" m={ofcStatus.examNonNhts} />
              <MatrixRow label="2. OFC Upon Oral Rehabilitation" m={ofcStatus.rehabTotal} />
              <MatrixRow label="  NHTS" m={ofcStatus.rehabNhts} />
              <MatrixRow label="  NON-NHTS" m={ofcStatus.rehabNonNhts} />

              {/* SECTION F: PATIENTS EXAMINED GIVEN BOHC */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={43} className="p-1 border border-slate-800 uppercase">F. NO. OF PATIENTS EXAMINED GIVEN BOHC</td>
              </tr>
              <MatrixRow label="TOTAL PATIENTS GIVEN BOHC" m={bohcStatus.totalBohc} />
              <MatrixRow label="  NHTS" m={bohcStatus.nhts} />
              <MatrixRow label="  NON-NHTS" m={bohcStatus.nonNhts} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}