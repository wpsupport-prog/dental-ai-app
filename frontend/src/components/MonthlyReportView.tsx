import React, { useState, useEffect } from 'react';
import { BarChart3, Printer, RefreshCw } from 'lucide-react';
import axios from 'axios';

const rawHost = window.location.hostname;
const hostName = (rawHost === 'tauri.localhost' || !rawHost) ? '127.0.0.1' : rawHost;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${hostName}:8000`;

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
  
  // 🎯 State to store computed values and force re-render
  const [counts, setCounts] = useState({
    infantMale: 0,
    infantFemale: 0,
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
  
  // Aggregation logic for "NO. OF PERSON ATTENDED" -> Infant (0-11 mos)
  const calculateCounts = (records: any[]) => {
    let maleCount = 0;
    let femaleCount = 0;

    records.forEach((record: any, index: number) => {
      // 1. Unpack Patient Information
      const patientInfo = typeof record.patient_info === 'string'
        ? parseJsonObject(record.patient_info) || {}
        : (record.patient_info || {});

      // 2. Extract Dental Chart Logs & Services Monitoring Logs
      const dentalChartRaw = parseJsonObject(record.dental_chart);
      const servicesMonRaw = parseJsonObject(record.services_monitoring);

      let dentalVisitsCount = 0;
      if (Array.isArray(dentalChartRaw)) {
        dentalVisitsCount = dentalChartRaw.length;
      } else if (dentalChartRaw && typeof dentalChartRaw === 'object') {
        dentalVisitsCount = 1;
      }

      let servicesVisitsCount = 0;
      if (Array.isArray(servicesMonRaw)) {
        servicesVisitsCount = servicesMonRaw.length;
      } else if (servicesMonRaw && typeof servicesMonRaw === 'object' && Object.keys(servicesMonRaw).length > 0) {
        servicesVisitsCount = 1;
      }

      // FIRST-TIME ATTENDED FILTER:
      // Accepts baseline intake records (0 or 1 visit entry; excludes multi-visit return logs like Visit 2, Visit 3)
      const isFirstTimeAttended = dentalVisitsCount <= 1 && servicesVisitsCount <= 1;

      // 3. Extract Age & Sex
      const ageVal = patientInfo.age || record.age || '';
      const sexVal = (patientInfo.sex || record.sex || '').toString().trim().toLowerCase();

      const isInfant = isInfantAge(ageVal);
      const isMale = sexVal === 'm' || sexVal === 'male';
      const isFemale = sexVal === 'f' || sexVal === 'female';

      // 🔍 DETAILED CONSOLE LOG PER RECORD
      console.log(`Record #${index + 1} (${patientInfo.surname || 'No Surname'}):`, {
        ageVal,
        isInfant,
        sexVal,
        dentalVisitsCount,
        servicesVisitsCount,
        isFirstTimeAttended,
        MATCHED: isFirstTimeAttended && isInfant && (isMale || isFemale)
      });

      if (!isFirstTimeAttended) return;
      if (!isInfant) return;

      if (isMale) {
        maleCount++;
      } else if (isFemale) {
        femaleCount++;
      }
    });

    console.log('=== FINAL COMPUTED INFANT COUNTS ===', { maleCount, femaleCount });

    setCounts({
      infantMale: maleCount,
      infantFemale: femaleCount,
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
          <table className="w-full text-left border-collapse border border-slate-800 text-[11px] font-mono">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th rowSpan={3} className="border border-slate-800 p-2 min-w-[220px]">INDICATORS</th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center bg-slate-950">Pregnant Women</th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center">Infant 0-11 mos.</th>
                <th colSpan={8} className="border border-slate-800 p-1 text-center bg-slate-950">School Age Children</th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center">Adolescents 10-14 yrs</th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center bg-slate-950">Adolescents 15-19 yrs</th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center">Adults 20-59 yrs</th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center bg-slate-950">Older Persons 60+ yrs</th>
                <th colSpan={2} className="border border-slate-800 p-1 text-center">TOTAL ALL AGES</th>
                <th rowSpan={3} className="border border-slate-800 p-1 text-center font-bold bg-blue-950/40 text-blue-300">GRAND TOTAL</th>
              </tr>
              <tr className="text-[10px] text-center">
                <th className="border border-slate-800 p-1">10-14</th>
                <th className="border border-slate-800 p-1">15-49</th>
                <th className="border border-slate-800 p-1">M</th>
                <th className="border border-slate-800 p-1">F</th>
                <th colSpan={2} className="border border-slate-800 p-1">TOTAL</th>
                <th colSpan={2} className="border border-slate-800 p-1">1-4 yrs</th>
                <th colSpan={2} className="border border-slate-800 p-1">5-9 yrs</th>
                <th colSpan={2} className="border border-slate-800 p-1">10-14 yrs</th>
                <th className="border border-slate-800 p-1">M</th>
                <th className="border border-slate-800 p-1">F</th>
                <th className="border border-slate-800 p-1">M</th>
                <th className="border border-slate-800 p-1">F</th>
                <th className="border border-slate-800 p-1">M</th>
                <th className="border border-slate-800 p-1">F</th>
                <th className="border border-slate-800 p-1">M</th>
                <th className="border border-slate-800 p-1">F</th>
                <th className="border border-slate-800 p-1">M</th>
                <th className="border border-slate-800 p-1">F</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {/* SECTION 1: ATTENDANCE */}
              <tr className="bg-slate-900/50 font-semibold">
                <td className="p-1.5 border border-slate-800">NO. OF PERSON ATTENDED</td>
                <td className="p-1 border border-slate-800 text-center">1</td>
                <td className="p-1 border border-slate-800 text-center">15</td>
				{/* 🎯 INFANT 0-11 MOS. (DYNAMIC COUNT) */}
				  <td className="p-1 border border-slate-800 text-center font-bold text-blue-400">
					{counts.infantMale}
				  </td>
				  <td className="p-1 border border-slate-800 text-center font-bold text-blue-400">
					{counts.infantFemale}
				  </td>
  
                <td className="p-1 border border-slate-800 text-center" colSpan={2}>12</td>
                <td className="p-1 border border-slate-800 text-center" colSpan={2}>8</td>
                <td className="p-1 border border-slate-800 text-center" colSpan={2}>15</td>
                <td className="p-1 border border-slate-800 text-center" colSpan={2}>11</td>
                <td className="p-1 border border-slate-800 text-center">11</td>
                <td className="p-1 border border-slate-800 text-center">4</td>
                <td className="p-1 border border-slate-800 text-center">8</td>
                <td className="p-1 border border-slate-800 text-center">2</td>
                <td className="p-1 border border-slate-800 text-center">32</td>
                <td className="p-1 border border-slate-800 text-center">22</td>
                <td className="p-1 border border-slate-800 text-center">9</td>
                <td className="p-1 border border-slate-800 text-center">13</td>
                <td className="p-1 border border-slate-800 text-center">141</td>
                <td className="p-1 border border-slate-800 text-center">219</td>
                <td className="p-1 border border-slate-800 text-center font-bold text-emerald-400">360</td>
              </tr>
              <tr className="bg-slate-900/50 font-semibold">
                <td className="p-1.5 border border-slate-800">NO. OF PERSON EXAMINED</td>
                <td className="p-1 border border-slate-800 text-center">1</td>
                <td className="p-1 border border-slate-800 text-center">15</td>
                <td className="p-1 border border-slate-800 text-center">20</td>
                <td className="p-1 border border-slate-800 text-center">50</td>
                <td className="p-1 border border-slate-800 text-center" colSpan={2}>12</td>
                <td className="p-1 border border-slate-800 text-center" colSpan={2}>8</td>
                <td className="p-1 border border-slate-800 text-center" colSpan={2}>15</td>
                <td className="p-1 border border-slate-800 text-center" colSpan={2}>11</td>
                <td className="p-1 border border-slate-800 text-center">11</td>
                <td className="p-1 border border-slate-800 text-center">4</td>
                <td className="p-1 border border-slate-800 text-center">8</td>
                <td className="p-1 border border-slate-800 text-center">2</td>
                <td className="p-1 border border-slate-800 text-center">32</td>
                <td className="p-1 border border-slate-800 text-center">22</td>
                <td className="p-1 border border-slate-800 text-center">9</td>
                <td className="p-1 border border-slate-800 text-center">13</td>
                <td className="p-1 border border-slate-800 text-center">131</td>
                <td className="p-1 border border-slate-800 text-center">225</td>
                <td className="p-1 border border-slate-800 text-center font-bold text-emerald-400">356</td>
              </tr>

              {/* SECTION 2: MEDICAL HISTORY */}
              <tr className="bg-slate-950 font-bold text-blue-400"><td colSpan={22} className="p-1 border border-slate-800">A. MEDICAL HISTORY</td></tr>
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
                "10. Total No. with Blood Transfusion"
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="p-1 border border-slate-800">{item}</td>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                  ))}
                  <td className="p-1 border border-slate-800 text-center font-bold text-blue-400">0</td>
                </tr>
              ))}

              {/* SECTION 3: DIETARY / SOCIAL HISTORY */}
              <tr className="bg-slate-950 font-bold text-blue-400"><td colSpan={22} className="p-1 border border-slate-800">B. DIETARY / SOCIAL HISTORY STATUS</td></tr>
              {[
                "1. Total No. of Sugar Sweetened Beverage / Food Drinker / Eater",
                "2. Total No. of Alcohol Drinker",
                "3. Total No. of Tobacco User",
                "4. Total No. of Betel Nut Chewer"
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="p-1 border border-slate-800">{item}</td>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                  ))}
                  <td className="p-1 border border-slate-800 text-center font-bold text-blue-400">0</td>
                </tr>
              ))}

              {/* SECTION 4: ORAL HEALTH STATUS */}
              <tr className="bg-slate-950 font-bold text-blue-400"><td colSpan={22} className="p-1 border border-slate-800">C. ORAL HEALTH STATUS</td></tr>
              {[
                "1. Total No. with Dental Caries",
                "2. Total No. with Gingivitis",
                "3. Total No. with Periodontal Disease",
                "4. Total No. with Oral Debris",
                "5. Total No. with Calculus",
                "6. Total No. with Dento-Facial Anomalies (cleft lip/palate, etc.)",
                "a. Total (df) T",
                "a. Total Decayed (d)",
                "b. Total Filled (f)",
                "a. Total (DMF) T",
                "a. Total Decayed (D)",
                "b. Total Missing (M)",
                "c. Total Filled (F)"
              ].map((item, idx) => (
                <tr key={idx} className={`hover:bg-slate-900/40 ${item.includes('Total') ? 'font-semibold bg-slate-900/30' : ''}`}>
                  <td className="p-1 border border-slate-800">{item}</td>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                  ))}
                  <td className="p-1 border border-slate-800 text-center font-bold text-blue-400">0</td>
                </tr>
              ))}
			  
              {/* SECTION D: SERVICES RENDERED */}
              <tr className="bg-slate-950 font-bold text-blue-400">
                <td colSpan={22} className="p-1 border border-slate-800">D. SERVICES RENDERED</td>
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
                "13. No. of Given Counselling / Education on Tobacco, Oral Health",
                "14. No. Under 5 Children Completed Tooth Brushing Drill"
              ].map((item, idx) => (
                <tr key={`sec-d-${idx}`} className="hover:bg-slate-900/40">
                  <td className="p-1 border border-slate-800">{item}</td>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                  ))}
                  <td className="p-1 border border-slate-800 text-center font-bold text-blue-400">0</td>
                </tr>
              ))}

              {/* SECTION E: OFC STATUS */}
              <tr className="bg-slate-950 font-bold text-blue-400">
                <td colSpan={22} className="p-1 border border-slate-800">E. ORALLY FIT CHILD (OFC) STATUS</td>
              </tr>
              <tr className="hover:bg-slate-900/40 font-semibold">
                <td className="p-1 border border-slate-800">1. OFC Upon Oral Examination</td>
                {Array.from({ length: 20 }).map((_, i) => (
                  <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                ))}
                <td className="p-1 border border-slate-800 text-center font-bold text-emerald-400">0</td>
              </tr>
              <tr className="hover:bg-slate-900/40 text-slate-400">
                <td className="p-1 border border-slate-800 pl-4">NHTS</td>
                {Array.from({ length: 20 }).map((_, i) => (
                  <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                ))}
                <td className="p-1 border border-slate-800 text-center font-bold">0</td>
              </tr>
              <tr className="hover:bg-slate-900/40 text-slate-400">
                <td className="p-1 border border-slate-800 pl-4">4PS</td>
                {Array.from({ length: 20 }).map((_, i) => (
                  <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                ))}
                <td className="p-1 border border-slate-800 text-center font-bold">0</td>
              </tr>

              <tr className="hover:bg-slate-900/40 font-semibold">
                <td className="p-1 border border-slate-800">2. OFC Upon Oral Rehabilitation</td>
                {Array.from({ length: 20 }).map((_, i) => (
                  <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                ))}
                <td className="p-1 border border-slate-800 text-center font-bold text-emerald-400">0</td>
              </tr>
              <tr className="hover:bg-slate-900/40 text-slate-400">
                <td className="p-1 border border-slate-800 pl-4">NHTS</td>
                {Array.from({ length: 20 }).map((_, i) => (
                  <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                ))}
                <td className="p-1 border border-slate-800 text-center font-bold">0</td>
              </tr>
              <tr className="hover:bg-slate-900/40 text-slate-400">
                <td className="p-1 border border-slate-800 pl-4">4PS</td>
                {Array.from({ length: 20 }).map((_, i) => (
                  <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                ))}
                <td className="p-1 border border-slate-800 text-center font-bold">0</td>
              </tr>

              {/* SECTION F: PATIENTS EXAMINED GIVEN BOHC */}
              <tr className="bg-slate-950 font-bold text-blue-400">
                <td colSpan={22} className="p-1 border border-slate-800">F. NO. OF PATIENTS EXAMINED GIVEN BOHC</td>
              </tr>
              <tr className="hover:bg-slate-900/40 font-semibold">
                <td className="p-1 border border-slate-800">TOTAL PATIENTS GIVEN BOHC</td>
                {Array.from({ length: 20 }).map((_, i) => (
                  <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                ))}
                <td className="p-1 border border-slate-800 text-center font-bold text-emerald-400">0</td>
              </tr>
              <tr className="hover:bg-slate-900/40 text-slate-400">
                <td className="p-1 border border-slate-800 pl-4">NHTS</td>
                {Array.from({ length: 20 }).map((_, i) => (
                  <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                ))}
                <td className="p-1 border border-slate-800 text-center font-bold">0</td>
              </tr>
              <tr className="hover:bg-slate-900/40 text-slate-400">
                <td className="p-1 border border-slate-800 pl-4">4PS</td>
                {Array.from({ length: 20 }).map((_, i) => (
                  <td key={i} className="p-1 border border-slate-800 text-center font-mono">0</td>
                ))}
                <td className="p-1 border border-slate-800 text-center font-bold">0</td>
              </tr>
			  
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}