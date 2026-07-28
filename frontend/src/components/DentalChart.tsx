import React, { useState } from 'react';
import { Stethoscope, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { ToothBox } from './ToothBox';
import { LegendsPalette, DENTAL_LEGENDS } from './LegendsPalette';

export interface DentalVisitRecord {
  id: string;
  visitLabel: string;   // Keeps the tab title static (e.g., "Visit 1")
  entryDate?: string;   // Stores the specific date typed (e.g., "06/12/2024")
  visitDate: string;    // Timestamp (e.g., "07/28/2026, 07:41:09 AM")
  chartData: Record<string, string>;
}

interface DentalChartProps {
  visits: DentalVisitRecord[];
  setVisits: React.Dispatch<React.SetStateAction<DentalVisitRecord[]>>;
}

// Helper to get local date string in MM/DD/YYYY format
export const getLocalDateOnly = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
};

export const getLocalPCDateTime = () => {
  const now = new Date();
  return now.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

// Sanitizes legacy labels like "Year I" to empty string if needed
const sanitizeLabel = (label: string): string => {
  if (label === 'Year I') return '';
  return label ?? '';
};

const TEMP_UPPER = ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'];
const PERM_UPPER = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const PERM_LOWER = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];
const TEMP_LOWER = ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'];

export default function DentalChart({ visits, setVisits }: DentalChartProps) {
  const [selectedLegend, setSelectedLegend] = useState<string>('✓');
  const [activeVisitId, setActiveVisitId] = useState<string>(visits[0]?.id || 'visit-1');

  const activeVisit = visits.find((v) => v.id === activeVisitId) || visits[0];

  // Add Patient Return Visit Chart Handler (Generates: Visit 2, Visit 3, etc.)
  const handleAddVisit = () => {
    const nextVisitNumber = visits.length + 1;
    const newVisit: DentalVisitRecord = {
      id: `visit-${Date.now()}`,
      visitLabel: `Visit ${nextVisitNumber}`,
      entryDate: '',
      visitDate: getLocalPCDateTime(),
      chartData: {},
    };

    setVisits((prev) => [...prev, newVisit]);
    setActiveVisitId(newVisit.id);
  };

  const handleDeleteVisit = (idToDelete: string) => {
    if (visits.length <= 1) {
      alert('At least one oral health record chart must remain.');
      return;
    }

    if (confirm('Are you sure you want to delete this visit chart log?')) {
      const filtered = visits.filter((v) => v.id !== idToDelete);
      setVisits(filtered);
      if (activeVisitId === idToDelete) {
        setActiveVisitId(filtered[filtered.length - 1].id);
      }
    }
  };

  // Strictly enforce legend category matching tooth type (Perm vs Temp)
  const handleToothClick = (toothNo: string, isTemporary: boolean) => {
    // 1. Eraser mode is always allowed
    if (selectedLegend === '') {
      setVisits((prevVisits) =>
        prevVisits.map((v) => {
          if (v.id !== activeVisitId) return v;
          const updatedChart = { ...v.chartData };
          delete updatedChart[toothNo];
          return { ...v, chartData: updatedChart };
        })
      );
      return;
    }

    // 2. Validate Legend Category
    const isPermSymbol = DENTAL_LEGENDS.some((item) => item.perm === selectedLegend);
    const isTempSymbol = DENTAL_LEGENDS.some((item) => item.temp === selectedLegend);

    if (isTemporary && !isTempSymbol) {
      alert('⚠️ Invalid Selection: Only blue (Temp) legends can be applied to temporary teeth.');
      return;
    }

    if (!isTemporary && !isPermSymbol) {
      alert('⚠️ Invalid Selection: Only green (Perm) legends can be applied to permanent teeth.');
      return;
    }

    // 3. Apply or toggle mark
    setVisits((prevVisits) =>
      prevVisits.map((v) => {
        if (v.id !== activeVisitId) return v;

        const updatedChart = { ...v.chartData };
        if (updatedChart[toothNo] === selectedLegend) {
          delete updatedChart[toothNo];
        } else {
          updatedChart[toothNo] = selectedLegend;
        }

        return { ...v, chartData: updatedChart };
      })
    );
  };

  const handleEntryDateChange = (newEntryDate: string) => {
    setVisits((prevVisits) =>
      prevVisits.map((v) => (v.id === activeVisitId ? { ...v, entryDate: newEntryDate } : v))
    );
  };

  const handleDateChange = (newDate: string) => {
    setVisits((prevVisits) =>
      prevVisits.map((v) => (v.id === activeVisitId ? { ...v, visitDate: newDate } : v))
    );
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 text-slate-100 font-sans">
      
      {/* Header section with Visit Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-slate-100">Oral Health Condition Chart Log</h3>
        </div>

        <button
          type="button"
          onClick={handleAddVisit}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-blue-950"
        >
          <Plus className="w-4 h-4" /> Add Patient Return Visit Chart
        </button>
      </div>

      {/* Patient Visit Log Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {visits.map((visit, index) => {
          const isActive = visit.id === activeVisitId;
          const markCount = Object.keys(visit.chartData).length;

          return (
            <div
              key={visit.id}
              onClick={() => setActiveVisitId(visit.id)}
              className={`cursor-pointer border rounded-lg px-3 py-2 text-xs flex items-center gap-2 transition min-w-[170px] ${
                isActive
                  ? 'bg-blue-950/80 border-blue-500 text-blue-200 font-bold shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    value={sanitizeLabel(visit.visitLabel) || `Visit ${index + 1}`}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      setVisits((prev) =>
                        prev.map((v) => (v.id === visit.id ? { ...v, visitLabel: newLabel } : v))
                      );
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent font-bold text-xs text-blue-100 focus:outline-none focus:border-b focus:border-blue-400 w-24"
                    placeholder={`Visit ${index + 1}`}
                  />
                  {markCount > 0 && (
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded-full font-mono">
                      {markCount}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {visit.visitDate || getLocalPCDateTime()}
                </div>
              </div>

              {visits.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVisit(visit.id);
                  }}
                  className="text-slate-500 hover:text-rose-400 p-0.5"
                  title="Delete Visit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Visit Info Sub-Bar */}
      {activeVisit && (
        <div className="flex justify-between items-center bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-lg text-xs">
          {/* Left: Independent Record Entry Date Input */}
          <div className="flex items-center gap-2 text-slate-300">
            <Calendar className="w-4 h-4 text-blue-400" />
            <input
              type="text"
              value={activeVisit.entryDate || ''}
              onChange={(e) => handleEntryDateChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-blue-300 font-bold px-2 py-1 rounded text-xs w-28 text-center focus:outline-none focus:border-blue-500"
              placeholder="MM/DD/YYYY"
            />
            <span className="font-bold text-blue-300">Record Entry</span>
          </div>

          {/* Right: Editable Visit Date & Time Input with Default Fallback */}
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Visit Date & Time:</span>
            <input
              type="text"
              value={activeVisit.visitDate || getLocalPCDateTime()}
              onChange={(e) => handleDateChange(e.target.value)}
              onBlur={(e) => {
                if (!e.target.value.trim()) {
                  handleDateChange(getLocalPCDateTime());
                }
              }}
              className="bg-slate-950 border border-slate-700 text-emerald-400 font-mono px-2 py-1 rounded text-xs w-48 text-center focus:outline-none focus:border-emerald-500"
              placeholder="MM/DD/YYYY, hh:mm:ss AM"
            />
          </div>
        </div>
      )}

      {/* Grid Container */}
      <div className="flex flex-col items-center justify-center space-y-2 overflow-x-auto p-4 bg-slate-900/80 rounded-xl border border-slate-800/80">
        
        {/* 1. Temporary Upper (55 - 65) - Blue */}
        <div className="flex flex-col items-center">
          <div className="flex gap-1">
            {TEMP_UPPER.map((tooth) => (
              <div key={`num-${tooth}`} className="w-9 text-center text-[10px] font-mono font-bold text-blue-400">
                {tooth}
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {TEMP_UPPER.map((tooth) => (
              <ToothBox
                key={tooth}
                number={tooth}
                value={activeVisit?.chartData[tooth]}
                onClick={(num) => handleToothClick(num, true)}
                isTemporary
              />
            ))}
          </div>
        </div>

        {/* 2. Permanent Upper (18 - 28) - Green */}
        <div className="flex flex-col items-center pt-1">
          <div className="flex gap-1">
            {PERM_UPPER.map((tooth) => (
              <ToothBox
                key={tooth}
                number={tooth}
                value={activeVisit?.chartData[tooth]}
                onClick={(num) => handleToothClick(num, false)}
              />
            ))}
          </div>
          <div className="flex gap-1 pt-1">
            {PERM_UPPER.map((tooth) => (
              <div key={`num-${tooth}`} className="w-9 text-center text-[10px] font-mono font-bold text-emerald-400">
                {tooth}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full border-b border-slate-700/60 my-2"></div>

        {/* 3. Permanent Lower (48 - 38) - Green */}
        <div className="flex flex-col items-center">
          <div className="flex gap-1 pb-1">
            {PERM_LOWER.map((tooth) => (
              <div key={`num-${tooth}`} className="w-9 text-center text-[10px] font-mono font-bold text-emerald-400">
                {tooth}
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {PERM_LOWER.map((tooth) => (
              <ToothBox
                key={tooth}
                number={tooth}
                value={activeVisit?.chartData[tooth]}
                onClick={(num) => handleToothClick(num, false)}
              />
            ))}
          </div>
        </div>

        {/* 4. Temporary Lower (85 - 75) - Blue */}
        <div className="flex flex-col items-center pt-1">
          <div className="flex gap-1">
            {TEMP_LOWER.map((tooth) => (
              <ToothBox
                key={tooth}
                number={tooth}
                value={activeVisit?.chartData[tooth]}
                onClick={(num) => handleToothClick(num, true)}
                isTemporary
              />
            ))}
          </div>
          <div className="flex gap-1 pt-1">
            {TEMP_LOWER.map((tooth) => (
              <div key={`num-${tooth}`} className="w-9 text-center text-[10px] font-mono font-bold text-blue-400">
                {tooth}
              </div>
            ))}
          </div>
        </div>
      </div>

      <LegendsPalette
        selectedLegend={selectedLegend}
        onSelectLegend={setSelectedLegend}
      />
    </div>
  );
}