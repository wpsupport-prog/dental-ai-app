import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { calculateDentalCounts } from '../utils/dentalChartCalculator';

interface ToothMarkings {
  [toothNumber: string]: string;
}

interface VisitLog {
  id: string;
  visitLabel: string;
  visitDate: string;
  recordEntryDate?: string;
  chartData: ToothMarkings;
}

export interface SectionAConditions {
  orallyFitChild?: string;
  dentalCaries?: string;
  gingivitis?: string;
  periodontalDisease?: string;
  debris?: string;
  calculus?: string;
  abnormalGrowth?: string;
  cleftLipPalate?: string;
  others?: string;
}

interface OralHealthConditionSummaryProps {
  visits: VisitLog[];
  isEditable?: boolean;
  sectionAData?: SectionAConditions;
  onSectionAChange?: (updated: SectionAConditions) => void;
}

export const OralHealthConditionSummary: React.FC<OralHealthConditionSummaryProps> = ({
  visits = [],
  isEditable = true,
  sectionAData,
  onSectionAChange,
}) => {
  // Grab the primary active visit log
  const activeVisit = visits && visits.length > 0 ? visits[0] : null;
  const chartData = activeVisit?.chartData || {};

  // Calculate dental counts
  const counts = calculateDentalCounts(chartData);

  // Live Date Extraction: Prioritizes typed manual record entry date over system timestamps
  const getLiveExamDate = (): string => {
    if (!activeVisit) return 'N/A';

    const candidates = [
      (activeVisit as any).recordEntryDate,
      (activeVisit as any).record_entry_date,
      (activeVisit as any).entryDate,
      activeVisit.visitDate,
    ];

    for (const cand of candidates) {
      if (cand && typeof cand === 'string' && cand.trim() !== '') {
        // Strip out trailing time if present (e.g. "01/20/2026, 11:11:29 AM" -> "01/20/2026")
        return cand.trim().split(',')[0].split('T')[0];
      }
    }

    return 'N/A';
  };

  const examDate = getLiveExamDate();

  const defaultAbsentState: SectionAConditions = {
    orallyFitChild: '*',
    dentalCaries: '*',
    gingivitis: '*',
    periodontalDisease: '*',
    debris: '*',
    calculus: '*',
    abnormalGrowth: '*',
    cleftLipPalate: '*',
    others: '',
  };

  const [internalSectionA, setInternalSectionA] = useState<SectionAConditions>(() => {
    if (sectionAData && Object.keys(sectionAData).length > 0) {
      return { ...defaultAbsentState, ...sectionAData };
    }
    return defaultAbsentState;
  });

  useEffect(() => {
    if (sectionAData && Object.keys(sectionAData).length > 0) {
      setInternalSectionA({ ...defaultAbsentState, ...sectionAData });
    }
  }, [sectionAData]);

  const handleConditionChange = (field: keyof SectionAConditions, value: string) => {
    const updated = {
      ...internalSectionA,
      [field]: value,
    };

    setInternalSectionA(updated);

    if (onSectionAChange) {
      onSectionAChange(updated);
    }
  };

  const renderConditionInput = (field: keyof SectionAConditions) => {
    const currentVal = internalSectionA[field] || '*';

    if (!isEditable) {
      return (
        <input
          type="text"
          readOnly
          value={currentVal}
          className={`w-10 bg-slate-950 border border-slate-700 rounded text-center font-bold py-0.5 ${
            currentVal === '✓' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        />
      );
    }

    return (
      <select
        value={currentVal}
        onChange={(e) => handleConditionChange(field, e.target.value)}
        className={`bg-slate-950 border border-slate-700 rounded text-center font-bold text-xs py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer ${
          currentVal === '✓' ? 'text-emerald-400' : 'text-slate-400'
        }`}
      >
        <option value="*">* (Absent)</option>
        <option value="✓">✓ (Present)</option>
      </select>
    );
  };

  return (
    <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 my-4">
      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800 pb-2">
        <Activity className="w-4 h-4" /> Oral Health Condition Summary
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        {/* EDITABLE COLUMN 1: Section A */}
        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-2">
          <div className="flex justify-between items-center border-b border-slate-700/80 pb-1">
            <h4 className="font-bold text-slate-200 text-[11px] uppercase tracking-wide">
              A. Check (✓) if Present / (*) if Absent
            </h4>
            {isEditable && <span className="text-[10px] text-emerald-400 font-sans">Editable</span>}
          </div>

          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span className="text-slate-400">Date of Oral Exam:</span>
              <span className="font-bold text-blue-300">{examDate}</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span>Orally Fit Child (OFC):</span>
              {renderConditionInput('orallyFitChild')}
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span>Dental Caries:</span>
              {renderConditionInput('dentalCaries')}
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span>Gingivitis:</span>
              {renderConditionInput('gingivitis')}
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span>Periodontal Disease:</span>
              {renderConditionInput('periodontalDisease')}
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span>Debris:</span>
              {renderConditionInput('debris')}
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span>Calculus:</span>
              {renderConditionInput('calculus')}
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span>Abnormal Growth:</span>
              {renderConditionInput('abnormalGrowth')}
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span>Cleft Lip / Palate:</span>
              {renderConditionInput('cleftLipPalate')}
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span>Others (Supernumerary, etc.):</span>
              {isEditable ? (
                <input
                  type="text"
                  placeholder="Specify..."
                  value={internalSectionA.others || ''}
                  onChange={(e) => handleConditionChange('others', e.target.value)}
                  className="w-28 bg-slate-950 border border-slate-700 rounded text-center text-slate-100 py-0.5 text-[10px]"
                />
              ) : (
                <span className="text-slate-400 font-bold">{internalSectionA.others || 'None'}</span>
              )}
            </div>
          </div>
        </div>

        {/* READ-ONLY COLUMN 2: Section B */}
        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-2">
          <h4 className="font-bold text-slate-200 border-b border-slate-700/80 pb-1 text-[11px] uppercase tracking-wide">
            B. Indicate Number
          </h4>

          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
              <span className="text-slate-400">Date of Oral Examination:</span>
              <span className="font-bold text-blue-300">{examDate}</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span>No. of Perm. Teeth Present:</span>
              <input type="text" readOnly value={counts.permPresent} className="w-12 bg-slate-950 border border-slate-700 rounded text-center text-slate-100 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span>No. of Perm. Sound Teeth:</span>
              <input type="text" readOnly value={counts.permSound} className="w-12 bg-slate-950 border border-slate-700 rounded text-center text-emerald-400 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span>No. of Decayed Teeth (D):</span>
              <input type="text" readOnly value={counts.permDecayed} className="w-12 bg-slate-950 border border-slate-700 rounded text-center text-amber-400 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span>No. of Missing Teeth (M):</span>
              <input type="text" readOnly value={counts.permMissing} className="w-12 bg-slate-950 border border-slate-700 rounded text-center text-rose-400 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span>No. of Filled Teeth (F):</span>
              <input type="text" readOnly value={counts.permFilled} className="w-12 bg-slate-950 border border-slate-700 rounded text-center text-cyan-400 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5 bg-slate-950/60 px-2 rounded border border-slate-800">
              <span className="font-bold text-blue-300">Total DMF Teeth:</span>
              <input type="text" readOnly value={counts.totalDMF} className="w-12 bg-slate-900 border border-slate-700 rounded text-center text-blue-400 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5 pt-1">
              <span>No. of Temp. Teeth Present:</span>
              <input type="text" readOnly value={counts.tempPresent} className="w-12 bg-slate-950 border border-slate-700 rounded text-center text-slate-100 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span>No. of Temp. Sound Teeth:</span>
              <input type="text" readOnly value={counts.tempSound} className="w-12 bg-slate-950 border border-slate-700 rounded text-center text-emerald-400 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span>No. of Decayed Teeth (d):</span>
              <input type="text" readOnly value={counts.tempDecayed} className="w-12 bg-slate-950 border border-slate-700 rounded text-center text-amber-400 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span>No. of Filled Teeth (f):</span>
              <input type="text" readOnly value={counts.tempFilled} className="w-12 bg-slate-950 border border-slate-700 rounded text-center text-cyan-400 font-bold py-0.5" />
            </div>

            <div className="flex justify-between items-center py-0.5 bg-slate-950/60 px-2 rounded border border-slate-800 mt-1">
              <span className="font-bold text-blue-300">Total df Teeth:</span>
              <input type="text" readOnly value={counts.totalDF} className="w-12 bg-slate-900 border border-slate-700 rounded text-center text-blue-400 font-bold py-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OralHealthConditionSummary;