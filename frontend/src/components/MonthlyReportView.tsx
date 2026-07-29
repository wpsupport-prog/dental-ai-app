import React, { useState, useEffect } from 'react';
import { BarChart3, Printer, RefreshCw } from 'lucide-react';
import axios from 'axios';

const rawHost = window.location.hostname;
const hostName = (rawHost === 'tauri.localhost' || !rawHost) ? '127.0.0.1' : rawHost;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${hostName}:8000`;

// Helper to parse age string into numeric years safely
const parseAgeToYearsNum = (rawAge: any): number | null => {
  if (rawAge === undefined || rawAge === null || rawAge === '') return null;

  const ageStr = rawAge.toString().toLowerCase().trim();

  // If age contains "mo" or "month" (e.g., "10 months" -> 0.83 years)
  if (ageStr.includes('mo') || ageStr.includes('month')) {
    const matches = ageStr.match(/\d+/g);
    if (matches && matches.length > 0) {
      const monthVal = parseInt(matches[0], 10);
      return monthVal / 12;
    }
  }

  // Parse direct numeric ages (e.g. "3", "3 yrs", "7 years old")
  const matches = ageStr.match(/\d+/g);
  if (matches && matches.length > 0) {
    return parseInt(matches[0], 10);
  }

  const parsed = parseFloat(ageStr);
  return isNaN(parsed) ? null : parsed;
};


// 1. Helper to strictly determine if age is 0-11 months (under 1 year old)
const isInfantAge = (rawAge: any): boolean => {
  if (rawAge === undefined || rawAge === null || rawAge === '') return false;

  const ageStr = rawAge.toString().toLowerCase().trim();

  // Match month keywords ("10 months", "10 mos", "11 mos", "0-11 mos", "6 months")
  if (ageStr.includes('mo') || ageStr.includes('month')) {
    const matches = ageStr.match(/\d+/g);
    if (matches && matches.length > 0) {
      const monthVal = parseInt(matches[0], 10);
      return monthVal >= 0 && monthVal <= 11;
    }
  }

  // Match numeric values (e.g. 0, "0", or decimals less than 1.0 year)
  const numAge = parseFloat(ageStr);
  if (!isNaN(numAge)) {
    return numAge >= 0 && numAge < 1.0;
  }

  return false;
};

// Helper to check if a date string matches the selected Month and Year
const matchesSelectedMonthAndYear = (rawDateStr: any, targetMonth: string, targetYear: string): boolean => {
  if (!rawDateStr) return false;

  const dateStr = rawDateStr.toString().toLowerCase().trim();
  const selectedMonth = targetMonth.toLowerCase().trim(); // e.g., "july"
  const selectedYear = targetYear.toString().trim();      // e.g., "2026"

  // 1. Check if the string directly contains month name and year (e.g. "07/28/2026" or "July 28, 2026")
  const monthsMap: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const monthIndex = monthsMap[selectedMonth];
  if (monthIndex === undefined) return false;

  // Try parsing as standard JS Date
  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    const isSameMonth = parsedDate.getMonth() === monthIndex;
    const isSameYear = parsedDate.getFullYear().toString() === selectedYear;
    if (isSameMonth && isSameYear) return true;
  }

  // Fallback for MM/DD/YYYY strings (e.g. "07/28/2026")
  const mmddyyyyParts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mmddyyyyParts) {
    const m = parseInt(mmddyyyyParts[1], 10) - 1;
    const y = mmddyyyyParts[3];
    return m === monthIndex && y === selectedYear;
  }

  return false;
};

// 2. Helper to safely parse stringified JSON objects from SQLite DB
const parseJsonObject = (data: any) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return data;
};

export function MonthlyReportView() {
  const [month, setMonth] = useState<string>('JULY');
  const [quarter, setQuarter] = useState<string>('3RD');
  const [year, setYear] = useState<string>('2026');
  const [facility, setFacility] = useState<string>('RURAL HEALTH UNIT II');
  const [municipality, setMunicipality] = useState<string>('SAN JOSE CITY / NUEVA ECIJA');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  
  // State for dynamic indicators
  const [counts, setCounts] = useState({
    preg10to14: 0,
    preg15to19: 0,
    preg20to49: 0,
    pregnantTotal: 0,
    infantMale: 0, infantFemale: 0,
    // School Age 1-4
    age1Male: 0, age1Female: 0,
    age2Male: 0, age2Female: 0,
    age3Male: 0, age3Female: 0,
    age4Male: 0, age4Female: 0,
    school1to4Male: 0, school1to4Female: 0,
    // School Age 5-9
    age5Male: 0, age5Female: 0,
    age6Male: 0, age6Female: 0,
    school5to6Male: 0, school5to6Female: 0,
    age7Male: 0, age7Female: 0,
    age8Male: 0, age8Female: 0,
    age9Male: 0, age9Female: 0,
    school5to9Male: 0, school5to9Female: 0,
    // Adolescents & Adults
    adolescentExcept12Male: 0, adolescentExcept12Female: 0,
    adolescent12Male: 0, adolescent12Female: 0,
    adolescent15to19Male: 0, adolescent15to19Female: 0,
    adult20to59Male: 0, adult20to59Female: 0,
    older60PlusMale: 0, older60PlusFemale: 0,
    // Totals
    totalAllAgesMale: 0,
    totalAllAgesFemale: 0,
    grandTotal: 0,
  });

  // Fetch all saved patient records from EHR database
  const fetchReportData = async () => {
    setIsLoading(true);
    
    // Candidate backend endpoints commonly used in FastAPI patient registries
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
          break; // Stop loop as soon as a working GET endpoint responds 200 OK
        }
      } catch (err) {
        // Silently try next endpoint
      }
    }

    if (!resData) {
      console.warn('❌ Could not locate GET endpoint for forms list. Please check backend main.py routes.');
      setIsLoading(false);
      setAllRecords([]);
	  calculateCounts([]); // Resets all UI indicators to 0
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

    console.log('=== UNPACKED RECORDS COUNT ===', recordsList.length);

    setAllRecords(recordsList);
    calculateCounts(recordsList);
    setIsLoading(false);
  };
  
  const calculateCounts = (records: any[]) => {
    let preg10to14 = 0;
    let preg15to19 = 0;
    let preg20to49 = 0;

    let infantMale = 0, infantFemale = 0;

    let age1Male = 0, age1Female = 0;
    let age2Male = 0, age2Female = 0;
    let age3Male = 0, age3Female = 0;
    let age4Male = 0, age4Female = 0;

    let age5Male = 0, age5Female = 0;
    let age6Male = 0, age6Female = 0;
    let age7Male = 0, age7Female = 0;
    let age8Male = 0, age8Female = 0;
    let age9Male = 0, age9Female = 0;

    let adolescentExcept12Male = 0, adolescentExcept12Female = 0;
    let adolescent12Male = 0, adolescent12Female = 0;
    let adolescent15to19Male = 0, adolescent15to19Female = 0;
    let adult20to59Male = 0, adult20to59Female = 0;
    let older60PlusMale = 0, older60PlusFemale = 0;

    // Reset to 0 if no records
    if (!Array.isArray(records) || records.length === 0) {
      setCounts({
        preg10to14: 0, preg15to19: 0, preg20to49: 0, pregnantTotal: 0,
        infantMale: 0, infantFemale: 0,
        age1Male: 0, age1Female: 0,
        age2Male: 0, age2Female: 0,
        age3Male: 0, age3Female: 0,
        age4Male: 0, age4Female: 0,
        school1to4Male: 0, school1to4Female: 0,
        age5Male: 0, age5Female: 0,
        age6Male: 0, age6Female: 0,
        school5to6Male: 0, school5to6Female: 0,
        age7Male: 0, age7Female: 0,
        age8Male: 0, age8Female: 0,
        age9Male: 0, age9Female: 0,
        school5to9Male: 0, school5to9Female: 0,
        adolescentExcept12Male: 0, adolescentExcept12Female: 0,
        adolescent12Male: 0, adolescent12Female: 0,
        adolescent15to19Male: 0, adolescent15to19Female: 0,
        adult20to59Male: 0, adult20to59Female: 0,
        older60PlusMale: 0, older60PlusFemale: 0,
        totalAllAgesMale: 0, totalAllAgesFemale: 0, grandTotal: 0,
      });
      return;
    }

    records.forEach((record: any) => {
      const patientInfo = typeof record.patient_info === 'string'
        ? parseJsonObject(record.patient_info) || {}
        : (record.patient_info || {});

      const dentalChartRaw = parseJsonObject(record.dental_chart);
      const servicesMonRaw = parseJsonObject(record.services_monitoring);

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
      if (Array.isArray(servicesMonRaw)) {
        servicesVisitsCount = servicesMonRaw.length;
      } else if (servicesMonRaw && typeof servicesMonRaw === 'object' && Object.keys(servicesMonRaw).length > 0) {
        servicesVisitsCount = 1;
      }

      // CONDITION 1: VISIT COUNT (Baseline Intake)
      const isFirstTimeAttended = dentalVisitsCount <= 1 && servicesVisitsCount <= 1;
      if (!isFirstTimeAttended) return;

      // CONDITION 2: VISIT DATE MATCH
      const dateToVerify = visit1Date || record.created_at || record.createdAt || '';
      const isDateMatching = matchesSelectedMonthAndYear(dateToVerify, month, year);
      if (!isDateMatching) return;

      // CONDITION 3: AGE, GENDER & PREGNANCY PARSING
      const ageVal = patientInfo.age || record.age || '';
      const sexVal = (patientInfo.sex || record.sex || '').toString().trim().toLowerCase();
      const isMale = sexVal === 'm' || sexVal === 'male';
      const isFemale = sexVal === 'f' || sexVal === 'female';
      const isPregnant = Boolean(patientInfo.is_pregnant || record.is_pregnant || patientInfo.pregnant || record.pregnant);
      const numAgeInYears = parseAgeToYearsNum(ageVal);

      // --- PREGNANT WOMEN ---
      if (isFemale && isPregnant && numAgeInYears !== null) {
        const pAge = Math.floor(numAgeInYears);
        if (pAge >= 10 && pAge <= 14) preg10to14++;
        else if (pAge >= 15 && pAge <= 19) preg15to19++;
        else if (pAge >= 20 && pAge <= 49) preg20to49++;
        return; // Exclude from non-pregnant female columns
      }

      // --- INFANT 0-11 MOS ---
      if (isInfantAge(ageVal)) {
        if (isMale) infantMale++;
        else if (isFemale) infantFemale++;
        return;
      }

      // --- GENERAL AGE EVALUATION ---
      if (numAgeInYears !== null) {
        const roundedAge = Math.floor(numAgeInYears);

        // Individual Ages 1 to 4
        if (roundedAge === 1) {
          if (isMale) age1Male++; else if (isFemale) age1Female++;
        } else if (roundedAge === 2) {
          if (isMale) age2Male++; else if (isFemale) age2Female++;
        } else if (roundedAge === 3) {
          if (isMale) age3Male++; else if (isFemale) age3Female++;
        } else if (roundedAge === 4) {
          if (isMale) age4Male++; else if (isFemale) age4Female++;
        } 
        
        // Individual Ages 5 to 9
        else if (roundedAge === 5) {
          if (isMale) age5Male++; else if (isFemale) age5Female++;
        } else if (roundedAge === 6) {
          if (isMale) age6Male++; else if (isFemale) age6Female++;
        } else if (roundedAge === 7) {
          if (isMale) age7Male++; else if (isFemale) age7Female++;
        } else if (roundedAge === 8) {
          if (isMale) age8Male++; else if (isFemale) age8Female++;
        } else if (roundedAge === 9) {
          if (isMale) age9Male++; else if (isFemale) age9Female++;
        } 
        
        // Adolescents 10-14 except 12
        else if (roundedAge === 10 || roundedAge === 11 || roundedAge === 13 || roundedAge === 14) {
          if (isMale) adolescentExcept12Male++; else if (isFemale) adolescentExcept12Female++;
        }

        // Adolescents 12 Y/O
        else if (roundedAge === 12) {
          if (isMale) adolescent12Male++; else if (isFemale) adolescent12Female++;
        }

        // Adolescents 15-19 Y/O
        else if (roundedAge >= 15 && roundedAge <= 19) {
          if (isMale) adolescent15to19Male++; else if (isFemale) adolescent15to19Female++;
        }

        // Adults 20-59 Y/O
        else if (roundedAge >= 20 && roundedAge <= 59) {
          if (isMale) adult20to59Male++; else if (isFemale) adult20to59Female++;
        }

        // Older Persons 60+ Y/O
        else if (roundedAge >= 60) {
          if (isMale) older60PlusMale++; else if (isFemale) older60PlusFemale++;
        }
      }
    });

    // Sub-totals for School Age
    const school1to4Male = age1Male + age2Male + age3Male + age4Male;
    const school1to4Female = age1Female + age2Female + age3Female + age4Female;

    const school5to6Male = age5Male + age6Male;
    const school5to6Female = age5Female + age6Female;

    const school5to9Male = age5Male + age6Male + age7Male + age8Male + age9Male;
    const school5to9Female = age5Female + age6Female + age7Female + age8Female + age9Female;

    // Total Pregnant Women
    const pregnantTotal = preg10to14 + preg15to19 + preg20to49;

    // TOTAL ALL AGES MALE
    const totalAllAgesMale = 
      infantMale + 
      school1to4Male + 
      school5to9Male + 
      adolescentExcept12Male + 
      adolescent12Male + 
      adolescent15to19Male + 
      adult20to59Male + 
      older60PlusMale;

    // TOTAL ALL AGES FEMALE (Includes Pregnant Women in Total Female)
    const totalAllAgesFemale = 
      pregnantTotal + 
      infantFemale + 
      school1to4Female + 
      school5to9Female + 
      adolescentExcept12Female + 
      adolescent12Female + 
      adolescent15to19Female + 
      adult20to59Female + 
      older60PlusFemale;

    // GRAND TOTAL
    const grandTotal = totalAllAgesMale + totalAllAgesFemale;

    setCounts({
      preg10to14, preg15to19, preg20to49, pregnantTotal,
      infantMale, infantFemale,
      age1Male, age1Female,
      age2Male, age2Female,
      age3Male, age3Female,
      age4Male, age4Female,
      school1to4Male, school1to4Female,
      age5Male, age5Female,
      age6Male, age6Female,
      school5to6Male, school5to6Female,
      age7Male, age7Female,
      age8Male, age8Female,
      age9Male, age9Female,
      school5to9Male, school5to9Female,
      adolescentExcept12Male, adolescentExcept12Female,
      adolescent12Male, adolescent12Female,
      adolescent15to19Male, adolescent15to19Female,
      adult20to59Male, adult20to59Female,
      older60PlusMale, older60PlusFemale,
      totalAllAgesMale,
      totalAllAgesFemale,
      grandTotal,
    });
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
          
          {/* Editable Month / Quarter / Year */}
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

          {/* Editable Health Facility */}
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

          {/* Editable Municipality / City / Province */}
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
                {/* Pregnant Women */}
                <th className="border border-slate-800 p-0.5">10-14 Y/O</th>
                <th className="border border-slate-800 p-0.5">15-19 Y/O</th>
                <th className="border border-slate-800 p-0.5">20-49 Y/O</th>

                {/* Infant 0-11 mos. */}
                <th className="border border-slate-800 p-0.5">M</th>
                <th className="border border-slate-800 p-0.5">F</th>

                {/* School Age Children (1-4 Y/O + Total) */}
                <th colSpan={2} className="border border-slate-800 p-0.5">1</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">2</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">3</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">4</th>
                <th colSpan={2} className="border border-slate-800 p-0.5 bg-slate-800/60 font-bold text-blue-300">Total (1-4 Y/O)</th>

                {/* School Age Children (5, 6, Total 5-6 Y/O, 7, 8, 9, Total 5-9 Y/O) */}
                <th colSpan={2} className="border border-slate-800 p-0.5">5</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">6</th>
                <th colSpan={2} className="border border-slate-800 p-0.5 bg-slate-800/60 font-bold text-blue-300">Total (5-6 Y/O)</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">7</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">8</th>
                <th colSpan={2} className="border border-slate-800 p-0.5">9</th>
                <th colSpan={2} className="border border-slate-800 p-0.5 bg-slate-800/60 font-bold text-blue-300">Total (5-9 Y/O)</th>

                {/* Adolescents 10-14 except 12 */}
                <th className="border border-slate-800 p-0.5">M</th>
                <th className="border border-slate-800 p-0.5">F</th>

                {/* Adolescents 12 Y/O */}
                <th className="border border-slate-800 p-0.5">M</th>
                <th className="border border-slate-800 p-0.5">F</th>

                {/* Adolescents 15-19 except 12 */}
                <th className="border border-slate-800 p-0.5">M</th>
                <th className="border border-slate-800 p-0.5">F</th>

                {/* Adults 20-59 */}
                <th className="border border-slate-800 p-0.5">M</th>
                <th className="border border-slate-800 p-0.5">F</th>

                {/* Older Persons 60+ */}
                <th className="border border-slate-800 p-0.5">M</th>
                <th className="border border-slate-800 p-0.5">F</th>

                {/* TOTAL ALL AGES */}
                <th className="border border-slate-800 p-0.5">M</th>
                <th className="border border-slate-800 p-0.5">F</th>
              </tr>

              {/* ROW 3: M/F GENDER BREAKDOWN */}
              <tr className="text-[8px] text-center font-bold text-slate-400">
                {/* School Age Children 1-4 M/F */}
                <th className="border border-slate-800 px-1">&nbsp;</th><th className="border border-slate-800 px-1">&nbsp;</th>
                <th className="border border-slate-800 px-1">&nbsp;</th><th className="border border-slate-800 px-1">&nbsp;</th>
                <th className="border border-slate-800 px-1">&nbsp;</th><th className="border border-slate-800 px-1">M</th>
                <th className="border border-slate-800 px-1">F</th><th className="border border-slate-800 px-1">M</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">F</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">M</th>

                {/* School Age Children 5, 6, Total 5-6, 7, 8, 9, Total 5-9 */}
                <th className="border border-slate-800 px-1">F</th><th className="border border-slate-800 px-1">M</th>
                <th className="border border-slate-800 px-1">F</th><th className="border border-slate-800 px-1">M</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">F</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">M</th>
                <th className="border border-slate-800 px-1">F</th><th className="border border-slate-800 px-1">M</th>
                <th className="border border-slate-800 px-1">F</th><th className="border border-slate-800 px-1">M</th>
                <th className="border border-slate-800 px-1">F</th><th className="border border-slate-800 px-1">M</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">F</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">M</th>
				<th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">F</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">M</th>
				<th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">F</th>
                <th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">M</th>
				<th className="border border-slate-800 px-1 bg-slate-800/80 text-blue-300">F</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-slate-300 text-center">
              {/* ------------------------------------------------------------- */}
              {/* SECTION 1: ATTENDANCE & EXAMINATION */}
              {/* ------------------------------------------------------------- */}
              <tr className="bg-slate-900/60 font-semibold">
                <td className="p-1 border border-slate-800 text-left font-bold text-slate-100 sticky left-0 bg-slate-900 z-10">NO. OF PERSON ATTENDED</td>
                
                {/* Pregnant Women */}
                <td className="p-1 border border-slate-800">{counts.preg10to14 || 0}</td>
                <td className="p-1 border border-slate-800">{counts.preg15to19 || 0}</td>
                <td className="p-1 border border-slate-800">{counts.preg20to49 || 0}</td>
                
                {/* DYNAMIC INFANT COUNTS (0-11 mos: M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-blue-950/30">{counts.infantMale || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-blue-950/30">{counts.infantFemale || 0}</td>

                {/* School Age 1-4 (Ages 1, 2, 3, 4: M, F) */}
                {/* 🎯 SCHOOL AGE 1 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age1Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age1Female || 0}</td>

                {/* 🎯 SCHOOL AGE 2 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age2Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age2Female || 0}</td>

                {/* 🎯 SCHOOL AGE 3 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age3Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age3Female || 0}</td>

                {/* 🎯 SCHOOL AGE 4 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age4Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age4Female || 0}</td>

                {/* 🎯 TOTAL 1-4 Y/O (M, F SUM) */}
                <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{counts.school1to4Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{counts.school1to4Female || 0}</td>
                
                {/* 🎯 SCHOOL AGE 5 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age5Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age5Female || 0}</td>

                {/* 🎯 SCHOOL AGE 6 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age6Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age6Female || 0}</td>

                {/* 🎯 TOTAL 5-6 Y/O (M, F SUM) */}
                <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{counts.school5to6Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{counts.school5to6Female || 0}</td>

                {/* 🎯 SCHOOL AGE 7 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age7Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age7Female || 0}</td>

                {/* 🎯 SCHOOL AGE 8 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age8Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age8Female || 0}</td>

                {/* 🎯 SCHOOL AGE 9 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age9Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.age9Female || 0}</td>

                {/* 🎯 TOTAL 5-9 Y/O (M, F SUM) */}
                <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{counts.school5to9Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/30">{counts.school5to9Female || 0}</td>

                {/* 🎯 ADOLESCENTS 10-14 EXCEPT 12 (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">
                  {counts.adolescentExcept12Male || 0}
                </td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">
                  {counts.adolescentExcept12Female || 0}
                </td>
                
                {/* 🎯 Adolescents 12 Y/O (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.adolescent12Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.adolescent12Female || 0}</td>
                
                {/* 🎯 Adolescents 15-19 Y/O (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.adolescent15to19Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.adolescent15to19Female || 0}</td>
                
                {/* 🎯 Adults 20-59 Y/O (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.adult20to59Male || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.adult20to59Female || 0}</td>
                
                {/* 🎯 Older Persons 60+ Y/O (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.older60PlusMale || 0}</td>
                <td className="p-1 border border-slate-800 font-bold text-blue-400 bg-slate-900">{counts.older60PlusFemale || 0}</td>
                
                {/* 🎯 TOTAL ALL AGES (M, F) */}
                <td className="p-1 border border-slate-800 font-bold text-blue-300 bg-slate-900">
                  {counts.totalAllAgesMale || 0}
                </td>
                <td className="p-1 border border-slate-800 font-bold text-blue-300 bg-slate-900">
                  {counts.totalAllAgesFemale || 0}
                </td>
                
                {/* 🎯 GRAND TOTAL (M + F + Pregnant Women) */}
                <td className="p-1 border border-slate-800 font-bold text-emerald-400 bg-emerald-950/40">
                  {counts.grandTotal || 0}
                </td>
				
              </tr>

              <tr className="bg-slate-900/60 font-semibold">
                <td className="p-1 border border-slate-800 text-left font-bold text-slate-100 sticky left-0 bg-slate-900 z-10">NO. OF PERSON EXAMINED</td>
                {Array.from({ length: 42 }).map((_, i) => (
                  <td key={`exam-${i}`} className="p-1 border border-slate-800 font-mono">0</td>
                ))}
                
              </tr>

              {/* ------------------------------------------------------------- */}
              {/* SECTION A: MEDICAL HISTORY */}
              {/* ------------------------------------------------------------- */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={44} className="p-1 border border-slate-800 uppercase">A. MEDICAL HISTORY</td>
              </tr>
              {[
                "1. Total No. with Allergies",
                "2. Total No. with Hypertension / CVA",
                "3. Total No. with Diabetes Mellitus",
                "4. Total No. with Blood Disorder",
                "5. Total No. with Cardiovascular / Heart Disease",
                "6. Total No. with Thyroid Disorders",
                "7. Total No. with Hepatitis",
                "8. Total No. with Malignancy",
                "9. Total No. with History of Previous Hospitalization",
                "10. Total No. with Blood Transfusion",
                "11. Total No. with Tattoo"
              ].map((item, idx) => (
                <tr key={`med-${idx}`} className="hover:bg-slate-900/40">
                  <td className="p-1 border border-slate-800 text-left sticky left-0 bg-slate-950 z-10">{item}</td>
                  {Array.from({ length: 42 }).map((_, i) => (
                    <td key={`med-val-${idx}-${i}`} className="p-1 border border-slate-800 font-mono">0</td>
                  ))}
                 
                </tr>
              ))}

              {/* ------------------------------------------------------------- */}
              {/* SECTION B: DIETARY / SOCIAL HISTORY STATUS */}
              {/* ------------------------------------------------------------- */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={44} className="p-1 border border-slate-800 uppercase">B. DIETARY / SOCIAL HISTORY STATUS</td>
              </tr>
              {[
                "1. Total No. of Sugar Sweetened Beverage / Food Drinker / Eater",
                "2. Total No. of Alcohol Drinker",
                "3. Total No. of Tobacco User",
                "4. Total No. of Betel Nut Chewer"
              ].map((item, idx) => (
                <tr key={`diet-${idx}`} className="hover:bg-slate-900/40">
                  <td className="p-1 border border-slate-800 text-left sticky left-0 bg-slate-950 z-10">{item}</td>
                  {Array.from({ length: 42 }).map((_, i) => (
                    <td key={`diet-val-${idx}-${i}`} className="p-1 border border-slate-800 font-mono">0</td>
                  ))}
                  
                </tr>
              ))}

              {/* ------------------------------------------------------------- */}
              {/* SECTION C: ORAL HEALTH STATUS */}
              {/* ------------------------------------------------------------- */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={44} className="p-1 border border-slate-800 uppercase">C. ORAL HEALTH STATUS</td>
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

              {/* ------------------------------------------------------------- */}
              {/* SECTION D: SERVICES RENDERED */}
              {/* ------------------------------------------------------------- */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={44} className="p-1 border border-slate-800 uppercase">D. SERVICES RENDERED</td>
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

              {/* ------------------------------------------------------------- */}
              {/* SECTION E: OFC STATUS */}
              {/* ------------------------------------------------------------- */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={44} className="p-1 border border-slate-800 uppercase">E. ORALLY FIT CHILD (OFC) STATUS</td>
              </tr>
              {["1. OFC Upon Oral Examination", "  NHTS", "  4PS", "2. OFC Upon Oral Rehabilitation", "  NHTS", "  4PS"].map((item, idx) => (
                <tr key={`ofc-${idx}`} className={`hover:bg-slate-900/40 ${item.startsWith('1.') || item.startsWith('2.') ? 'font-semibold' : 'text-slate-400'}`}>
                  <td className="p-1 border border-slate-800 text-left sticky left-0 bg-slate-950 z-10">{item}</td>
                  {Array.from({ length: 42 }).map((_, i) => (
                    <td key={`ofc-val-${idx}-${i}`} className="p-1 border border-slate-800 font-mono">0</td>
                  ))}
                  
                </tr>
              ))}

              {/* ------------------------------------------------------------- */}
              {/* SECTION F: PATIENTS EXAMINED GIVEN BOHC */}
              {/* ------------------------------------------------------------- */}
              <tr className="bg-slate-950 font-bold text-blue-400 text-left">
                <td colSpan={44} className="p-1 border border-slate-800 uppercase">F. NO. OF PATIENTS EXAMINED GIVEN BOHC</td>
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