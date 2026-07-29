import React, { useState, useEffect } from 'react';
import { BarChart3, Printer, RefreshCw } from 'lucide-react';
import axios from 'axios';

import { createEmptyMatrix } from '../utils/reportTypes';
import type { DemographicMatrix } from '../utils/reportTypes';

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
  const [month, setMonth] = useState<string>('JULY');
  const [quarter, setQuarter] = useState<string>('3RD');
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

    if (!Array.isArray(records) || records.length === 0) {
      setCounts(attended);
      setExaminedCounts(examined);
      setMedHistory(med);
      setDietaryHistory(diet);
      return;
    }

    const isTrue = (val: any) => {
      if (val === undefined || val === null) return false;
      if (typeof val === 'boolean') return val;
      const s = val.toString().trim().toLowerCase();
      return s === 'true' || s === 'yes' || s === '1' || s === 'checked';
    };

    // Universal multi-key lookup helper
    const hasCondition = (rawObj: any, flatRecord: any, ...keys: string[]) => {
      for (const key of keys) {
        if (rawObj && isTrue(rawObj[key])) return true;
        if (flatRecord && isTrue(flatRecord[key])) return true;
      }
      return false;
    };

    records.forEach((record: any) => {
      try {
        const patientInfo = typeof record.patient_info === 'string'
          ? parseJsonObject(record.patient_info) || {}
          : (record.patient_info || {});

        const dentalChartRaw = parseJsonObject(record.dental_chart);
        const servicesMonRaw = parseJsonObject(record.services_monitoring);

        const medHistoryRaw = typeof record.medical_history === 'string'
          ? parseJsonObject(record.medical_history) || {}
          : (record.medical_history || {});

        const socialHistoryRaw = typeof record.social_history === 'string'
          ? parseJsonObject(record.social_history) || {}
          : (record.social_history || {});

        let dentalVisitsCount = 0;
        let visit1Date = '';

        if (Array.isArray(dentalChartRaw)) {
          dentalVisitsCount = dentalChartRaw.length;
          if (dentalChartRaw.length > 0) {
            visit1Date = dentalChartRaw[0].visitDate || dentalChartRaw[0].date || '';
          }
        } else if (dentalChartRaw && typeof dentalChartRaw === 'object') {
          dentalVisitsCount = 1;
          visit1Date = dentalChartRaw.visitDate || dentalChartRaw.date || '';
        }

        let servicesVisitsCount = 0;
        let serviceDate = '';

        if (Array.isArray(servicesMonRaw)) {
          servicesVisitsCount = servicesMonRaw.length;
          if (servicesMonRaw.length > 0) {
            const lastEntry = servicesMonRaw[servicesMonRaw.length - 1];
            serviceDate = lastEntry?.date || lastEntry?.visitDate || servicesMonRaw[0]?.date || servicesMonRaw[0]?.visitDate || '';
          }
        } else if (servicesMonRaw && typeof servicesMonRaw === 'object' && Object.keys(servicesMonRaw).length > 0) {
          servicesVisitsCount = 1;
          serviceDate = servicesMonRaw.date || servicesMonRaw.visitDate || '';
        }

        const ageVal = patientInfo.age || record.age || '';
        const sexVal = (patientInfo.sex || record.sex || '').toString().trim().toLowerCase();
        const isMale = sexVal === 'm' || sexVal === 'male';
        const isFemale = sexVal === 'f' || sexVal === 'female';
        const isPregnant = Boolean(patientInfo.is_pregnant || record.is_pregnant || patientInfo.pregnant || record.pregnant);
        const numAgeInYears = parseAgeToYearsNum(ageVal);

        const recordDate = record.created_at || record.createdAt || record.date || visit1Date || serviceDate || '';

        // 1. ATTENDED LOGIC
        const isFirstTimeAttended = dentalVisitsCount <= 1 && servicesVisitsCount <= 1;
        const dateToVerifyAttended = visit1Date || recordDate;

        if (isFirstTimeAttended && matchesSelectedMonthAndYear(dateToVerifyAttended, month, year)) {
          incrementMatrix(attended, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
        }

        // 2. EXAMINED LOGIC
        const hasServicesExamined = servicesVisitsCount >= 1 || dentalVisitsCount >= 1;
        const dateToVerifyExamined = serviceDate || dateToVerifyAttended;

        if (hasServicesExamined && matchesSelectedMonthAndYear(dateToVerifyExamined, month, year)) {
          incrementMatrix(examined, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
        }

        // 3. MEDICAL & DIETARY HISTORY
        if (matchesSelectedMonthAndYear(recordDate, month, year)) {
          console.log('Processing Record for Report:', { age: ageVal, sex: sexVal, medHistoryRaw, socialHistoryRaw });

          // 🎯 1. Allergies
          if (hasCondition(medHistoryRaw, record, 'allergies_checked', 'allergiesChecked', 'allergies', 'allergies_specified')) {
            incrementMatrix(med.allergies, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 2. Hypertension / CVA
          if (hasCondition(medHistoryRaw, record, 'hypertension_cva', 'hypertensionCva', 'hypertension', 'cva')) {
            incrementMatrix(med.hypertension, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 3. Diabetes Mellitus
          if (hasCondition(medHistoryRaw, record, 'diabetes_mellitus', 'diabetesMellitus', 'diabetes')) {
            incrementMatrix(med.diabetes, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 4. Blood Disorder
          if (hasCondition(medHistoryRaw, record, 'blood_disorder', 'bloodDisorder', 'blood_disorders', 'bloodDisorders')) {
            incrementMatrix(med.bloodDisorder, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 5. Cardiovascular / Heart Disease
          if (hasCondition(medHistoryRaw, record, 'cardiovascular_heart_diseases', 'cardiovascularHeartDiseases', 'cardiovascular', 'heart_disease')) {
            incrementMatrix(med.cardiovascular, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 6. Thyroid Disorders
          if (hasCondition(medHistoryRaw, record, 'thyroid_disorders', 'thyroidDisorders', 'thyroid')) {
            incrementMatrix(med.thyroid, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 7. Hepatitis
          if (hasCondition(medHistoryRaw, record, 'hepatitis_checked', 'hepatitisChecked', 'hepatitis', 'hepatitis_specified')) {
            incrementMatrix(med.hepatitis, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 8. Malignancy
          if (hasCondition(medHistoryRaw, record, 'malignancy_checked', 'malignancyChecked', 'malignancy', 'malignancy_specified')) {
            incrementMatrix(med.malignancy, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 9. History of Hospitalization
          if (hasCondition(medHistoryRaw, record, 'medical_hospitalization_checked', 'medicalHospitalizationChecked', 'medical_hospitalization_specified', 'surgical_checked', 'surgicalChecked', 'last_admission')) {
            incrementMatrix(med.hospitalization, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 10. Blood Transfusion
          if (hasCondition(medHistoryRaw, record, 'blood_transfusion_checked', 'bloodTransfusionChecked', 'blood_transfusion_specified', 'blood_transfusion')) {
            incrementMatrix(med.transfusion, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 11. Tattoo
          if (hasCondition(medHistoryRaw, record, 'tattoo_checked', 'tattooChecked', 'tattoo_specified', 'tattoo')) {
            incrementMatrix(med.tattoo, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 🎯 SECTION B: DIETARY & SOCIAL HISTORY
          // 1. Sugar Sweetened Beverage / Food
          if (
            hasCondition(
              socialHistoryRaw,
              record,
              'sugar_beverages_checked',
              'sugarBeveragesChecked',
              'sugar_beverages_specified',
              'sugarBeveragesSpecified',
              'sugar_beverage',
              'sugarBeverage'
            )
          ) {
            incrementMatrix(diet.sweetenedBeverage, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 2. Alcohol Drinker
          if (
            hasCondition(
              socialHistoryRaw,
              record,
              'use_alcohol_checked',
              'useAlcoholChecked',
              'use_alcohol_specified',
              'useAlcoholSpecified',
              'alcohol'
            )
          ) {
            incrementMatrix(diet.alcohol, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 3. Tobacco User
          if (
            hasCondition(
              socialHistoryRaw,
              record,
              'use_tobacco_checked',
              'useTobaccoChecked',
              'use_tobacco_specified',
              'useTobaccoSpecified',
              'tobacco'
            )
          ) {
            incrementMatrix(diet.tobacco, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
          }

          // 4. Betel Nut Chewer
          if (
            hasCondition(
              socialHistoryRaw,
              record,
              'betel_nut_checked',
              'betelNutChecked',
              'betel_nut_specified',
              'betelNutSpecified',
              'betel_nut',
              'betelNut'
            )
          ) {
            incrementMatrix(diet.betelNut, numAgeInYears, ageVal, isMale, isFemale, isPregnant);
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

    setCounts(attended);
    setExaminedCounts(examined);
    setMedHistory(med);
    setDietaryHistory(diet);
  };
  
  useEffect(() => {
    fetchReportData();
  }, [month, quarter, year]);

  const handlePrint = () => {
    window.print();
  };
	
  return (
    <div className="space-y-6">
      {/* Top Action & Filter Toolbar */}
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

        {/* Filters */}
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
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> Print / Export PDF
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

        {/* Reporting Sheet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-800 text-[9px] font-mono whitespace-nowrap">
            <thead className="bg-slate-900 text-slate-300">
              {/* ROW 1: TOP-LEVEL GROUPS */}
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

              {/* ROW 2: AGE & SUB-GROUPS */}
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

              {/* ROW 3: M/F GENDER BREAKDOWN FOR SCHOOL AGE ONLY */}
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
              {/* SECTION 1: ATTENDANCE & EXAMINATION */}
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

              {/* SECTION B: DIETARY / SOCIAL HISTORY STATUS */}
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
              {[
                "1. Total No. with Dental Caries",
                "2. Total No. with Gingivitis",
                "3. Total No. with Periodontal Disease",
                "4. Total No. with Oral Debris",
                "5. Total No. with Calculus",
                "6. Total No. with Dento-Facial Anomalies (cleft lip/palate, etc.)",
                "7. Total (df) T",
                "  a. Total decayed (d)",
                "  b. Total filled (f)",
                "8. Total (DMF) T",
                "  a. Total Decayed (D)",
                "  b. Total Missing (M)",
                "  c. Total Filled (F)"
              ].map((item, idx) => (
                <tr key={`oral-${idx}`} className={`hover:bg-slate-900/40 ${item.includes('Total (') ? 'font-semibold bg-slate-900/30' : ''}`}>
                  <td className="p-1 border border-slate-800 text-left sticky left-0 bg-slate-950 z-10">{item}</td>
                  {Array.from({ length: 42 }).map((_, i) => (
                    <td key={`oral-val-${idx}-${i}`} className="p-1 border border-slate-800 font-mono">0</td>
                  ))}
                </tr>
              ))}

              {/* SECTION D: SERVICES RENDERED */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={43} className="p-1 border border-slate-800 uppercase">D. SERVICES RENDERED</td>
              </tr>
              {[
                "1. No. Given OP / Scaling",
                "2. No. Given Permanent Fillings",
                "3. No. Given Temporary Fillings",
                "4. No. Given Extraction",
                "5. No. Given Gum Treatment",
                "6. No. Given Sealant",
                "7. No. Completed Fluoride Therapy",
                "8. No. Given Silver Diamine Fluoride",
                "9. No. Given Post-Operative Treatment",
                "10. No. of Patient with Oral Abscess Treated",
                "11. No. Given Other Services",
                "12. No. of Referred",
                "13. No. Given Counselling / Education on Tobacco, Oral Health",
                "14. No. Under 5 Children Completed Tooth Brushing Drill"
              ].map((item, idx) => (
                <tr key={`serv-${idx}`} className="hover:bg-slate-900/40">
                  <td className="p-1 border border-slate-800 text-left sticky left-0 bg-slate-950 z-10">{item}</td>
                  {Array.from({ length: 42 }).map((_, i) => (
                    <td key={`serv-val-${idx}-${i}`} className="p-1 border border-slate-800 font-mono">0</td>
                  ))}
                </tr>
              ))}

              {/* SECTION E: OFC STATUS */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={43} className="p-1 border border-slate-800 uppercase">E. ORALLY FIT CHILD (OFC) STATUS</td>
              </tr>
              {["1. OFC Upon Oral Examination", "  NHTS", "  4PS", "2. OFC Upon Oral Rehabilitation", "  NHTS", "  4PS"].map((item, idx) => (
                <tr key={`ofc-${idx}`} className={`hover:bg-slate-900/40 ${item.startsWith('1.') || item.startsWith('2.') ? 'font-semibold' : 'text-slate-400'}`}>
                  <td className="p-1 border border-slate-800 text-left sticky left-0 bg-slate-950 z-10">{item}</td>
                  {Array.from({ length: 42 }).map((_, i) => (
                    <td key={`ofc-val-${idx}-${i}`} className="p-1 border border-slate-800 font-mono">0</td>
                  ))}
                </tr>
              ))}

              {/* SECTION F: PATIENTS EXAMINED GIVEN BOHC */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={43} className="p-1 border border-slate-800 uppercase">F. NO. OF PATIENTS EXAMINED GIVEN BOHC</td>
              </tr>
              {["TOTAL PATIENTS GIVEN BOHC", "  NHTS", "  4PS"].map((item, idx) => (
                <tr key={`bohc-${idx}`} className={`hover:bg-slate-900/40 ${idx === 0 ? 'font-semibold' : 'text-slate-400'}`}>
                  <td className="p-1 border border-slate-800 text-left sticky left-0 bg-slate-950 z-10">{item}</td>
                  {Array.from({ length: 42 }).map((_, i) => (
                    <td key={`bohc-val-${idx}-${i}`} className="p-1 border border-slate-800 font-mono">0</td>
                  ))}
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}