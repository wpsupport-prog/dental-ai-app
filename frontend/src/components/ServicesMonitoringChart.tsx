import React, { useState } from 'react';
import { Activity, Info, Eraser, Check, Plus, Calendar, Trash2 } from 'lucide-react';

export interface ServiceVisitRecord {
  id: string;
  visitLabel: string;
  visitDate: string;
  fluorideStatus?: '1st' | 'completed' | '';
  chartData: Record<string, string>;
}

export interface ServiceToothData {
  [toothNumber: string]: string;
}

interface ServicesMonitoringChartProps {
  data?: ServiceToothData | ServiceVisitRecord[] | any;
  onChange?: (updated: any) => void;
  isEditable?: boolean;
}

// Local PC system date & time helper
const getLocalPCDateTime = () => {
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

// Sanitizes legacy default labels like "Initial Entry" to an empty string ""
const sanitizeServiceLabel = (label?: string): string => {
  if (!label || label === 'Initial Entry') return '';
  return label;
};

// Layout definitions matching FDI numbering scheme
const TEMP_TOP_TEETH = ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'];
const TEMP_BOTTOM_TEETH = ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'];
const PERM_TOP_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const PERM_BOTTOM_TEETH = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

// Services Legend Definitions
const SERVICE_LEGENDS = [
  { code: 'TFV/TFG', label: 'Topical Fluoride Varnish/Gel' },
  { code: 'SDF', label: 'Silver Diamine Fluoride' },
  { code: 'PFS', label: 'Pits & Fissure Sealant' },
  { code: 'PF', label: 'Permanent Filling' },
  { code: 'TF', label: 'Temporary Filling' },
  { code: 'X', label: 'Extraction' },
  { code: 'O', label: 'Others' },
];

export const ServicesMonitoringChart: React.FC<ServicesMonitoringChartProps> = ({
  data = {},
  onChange,
  isEditable = true,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>('TFV/TFG');

  // Helper fallback visit item
  const defaultInitialVisit: ServiceVisitRecord = {
    id: 'service-visit-1',
    visitLabel: '',
    visitDate: getLocalPCDateTime(),
    fluorideStatus: '',
    chartData: {},
  };

  // Normalize and sort visits sequentially
  const normalizeVisits = (): { isMultiVisit: boolean; visitsList: ServiceVisitRecord[] } => {
    let list: ServiceVisitRecord[] = [];

    if (Array.isArray(data)) {
      list = data.length === 0 ? [defaultInitialVisit] : (data as ServiceVisitRecord[]);
    } else if (data && typeof data === 'object') {
      list = [
        {
          id: 'service-visit-1',
          visitLabel: '',
          visitDate: getLocalPCDateTime(),
          fluorideStatus: '',
          chartData: (data as Record<string, string>) || {},
        },
      ];
    } else {
      list = [defaultInitialVisit];
    }

    const sortedList = [...list].sort((a, b) => {
      const numA = parseInt(a.visitLabel.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.visitLabel.replace(/\D/g, '')) || 0;

      if (numA !== 0 && numB !== 0) {
        return numA - numB;
      }

      return new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime();
    });

    return { isMultiVisit: Array.isArray(data), visitsList: sortedList };
  };

  const { visitsList: visits } = normalizeVisits();

  const [activeVisitId, setActiveVisitId] = useState<string>(visits[0]?.id || 'service-visit-1');

  // Guarantee activeVisit is NEVER undefined
  const activeVisit: ServiceVisitRecord =
    visits.find((v) => v.id === activeVisitId) || visits[0] || defaultInitialVisit;

  const activeChartData = activeVisit.chartData || {};

  // Add a new service monitoring visit log stamped with current local date/time
  const handleAddServiceVisit = () => {
    if (!isEditable || !onChange) return;

    const newVisitIndex = visits.length + 1;
    const newVisit: ServiceVisitRecord = {
      id: `service-visit-${Date.now()}`,
      visitLabel: `Visit ${newVisitIndex}`,
      visitDate: getLocalPCDateTime(),
      fluorideStatus: '',
      chartData: {},
    };

    const updatedVisits = [...visits, newVisit];
    setActiveVisitId(newVisit.id);
    onChange(updatedVisits);
  };

  // Delete current active service monitoring visit log
  const handleDeleteServiceVisit = () => {
    if (!isEditable || !onChange) return;

    if (visits.length <= 1) {
      alert('Cannot delete the initial visit record.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this return visit record?')) {
      const updatedVisits = visits.filter((v) => v.id !== activeVisit.id);
      
      const remainingIndex = Math.max(
        0,
        visits.findIndex((v) => v.id === activeVisit.id) - 1
      );
      
      setActiveVisitId(updatedVisits[remainingIndex]?.id || updatedVisits[0].id);
      onChange(updatedVisits);
    }
  };

  // Update logLabel
  const handleServiceLabelChange = (newLabel: string) => {
    if (!isEditable || !onChange) return;
    const updatedVisits = visits.map((v) =>
      v.id === activeVisit.id ? { ...v, visitLabel: newLabel } : v
    );
    onChange(updatedVisits);
  };

  // Update visitDate with local date/time fallback
  const handleServiceDateChange = (newDate: string) => {
    if (!isEditable || !onChange) return;
    const updatedVisits = visits.map((v) =>
      v.id === activeVisit.id ? { ...v, visitDate: newDate } : v
    );
    onChange(updatedVisits);
  };

  // Toggle / update Fluoride Status radio buttons
  const handleFluorideStatusChange = (status: '1st' | 'completed') => {
    if (!isEditable || !onChange) return;
    const updatedVisits = visits.map((v) => {
      if (v.id === activeVisit.id) {
        const newStatus = v.fluorideStatus === status ? '' : status;
        return { ...v, fluorideStatus: newStatus as '1st' | 'completed' | '' };
      }
      return v;
    });
    onChange(updatedVisits);
  };

  // Stamp tooth code using selected palette symbol
  const handleToothClick = (toothNum: string) => {
    if (!isEditable || !onChange) return;

    const updatedChartData = { ...activeChartData };

    if (selectedSymbol === null) {
      delete updatedChartData[toothNum];
    } else {
      updatedChartData[toothNum] = selectedSymbol;
    }

    const updatedVisits = visits.map((v) =>
      v.id === activeVisit.id ? { ...v, chartData: updatedChartData } : v
    );

    onChange(updatedVisits);
  };

  // Helper to render single interactive input box per tooth
  const renderToothCell = (toothNum: string, isTemp: boolean = false) => {
    const value = activeChartData[toothNum] || '';

    const filledBorderBg = isTemp
      ? 'border-blue-500 bg-blue-950/60 ring-1 ring-blue-500/50'
      : 'border-emerald-500 bg-emerald-950/60 ring-1 ring-emerald-500/50';

    const hoverBorder = isTemp ? 'hover:border-blue-400' : 'hover:border-emerald-400';
    const textColor = isTemp ? 'text-blue-400' : 'text-emerald-400';

    return (
      <div key={toothNum} className="flex flex-col items-center">
        <span className={`text-[10px] font-mono mb-0.5 select-none ${textColor}`}>
          {toothNum}
        </span>

        <div
          onClick={() => handleToothClick(toothNum)}
          className={`border rounded overflow-hidden cursor-pointer transition flex items-center justify-center select-none ${
            value ? filledBorderBg : `border-slate-700 bg-slate-950 ${hoverBorder}`
          }`}
        >
          <input
            type="text"
            readOnly={!isEditable}
            maxLength={7}
            value={value}
            className={`w-10 h-7 bg-transparent text-center font-bold text-[10px] ${textColor} focus:outline-none tracking-tighter uppercase cursor-pointer pointer-events-none`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 my-4 space-y-4">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-slate-800 mb-4">
        <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
          <Activity className="w-4 h-4" />
          <span>SERVICES MONITORING CHART</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono">
            Active Palette Code: <strong className="text-blue-400">{selectedSymbol || 'NONE'}</strong>
          </span>

          {/* Add Return Visit Log Button */}
          {isEditable && (
            <button
              type="button"
              onClick={handleAddServiceVisit}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Return Visit Log</span>
            </button>
          )}

          {/* Delete Active Visit Button */}
          {isEditable && visits.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteServiceVisit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Delete active return visit log"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Active Visit</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Visit Selector Tabs */}
      {visits.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-800/60">
          {visits.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveVisitId(v.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition border cursor-pointer ${
                v.id === activeVisit.id
                  ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{v.visitLabel}</span>
              <span className="text-[10px] opacity-80 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {v.visitDate}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Active Visit Info Subheader */}
      <div className="flex flex-wrap justify-between items-start text-xs text-slate-400 px-1 gap-4">
        {/* Left Side: Active Log & Fluoride Status (Stacked Vertically) */}
        <div className="flex flex-col gap-2">
          {/* Active Log Date Input */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Active Log:</span>
            <input
              type="text"
              readOnly={!isEditable}
              value={sanitizeServiceLabel(activeVisit?.visitLabel)}
              onChange={(e) => handleServiceLabelChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs px-2.5 py-1 rounded w-36 focus:outline-none focus:border-blue-500"
              placeholder="mm/dd/yyyy"
            />
          </div>

          {/* FLUORIDE STATUS RADIO BUTTONS */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs w-fit">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Fluoride Status:
            </span>
            
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white transition">
              <input
                type="radio"
                disabled={!isEditable}
                name={`fluoride-status-${activeVisit?.id}`}
                value="1st"
                checked={activeVisit?.fluorideStatus === '1st'}
                onChange={() => handleFluorideStatusChange('1st')}
                className="text-blue-600 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer"
              />
              <span className="font-medium text-slate-200">1st Fluoride</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white transition">
              <input
                type="radio"
                disabled={!isEditable}
                name={`fluoride-status-${activeVisit?.id}`}
                value="completed"
                checked={activeVisit?.fluorideStatus === 'completed'}
                onChange={() => handleFluorideStatusChange('completed')}
                className="text-emerald-500 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer"
              />
              <span className="font-medium text-slate-200">Completed</span>
            </label>
          </div>
        </div>

        {/* Right Side: Editable Date/Time with Local Timestamp Fallback */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-blue-400 font-mono text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400 text-xs">Date/Time:</span>
          <input
            type="text"
            readOnly={!isEditable}
            value={activeVisit?.visitDate || getLocalPCDateTime()}
            onChange={(e) => handleServiceDateChange(e.target.value)}
            onBlur={(e) => {
              if (!e.target.value.trim()) {
                handleServiceDateChange(getLocalPCDateTime());
              }
            }}
            className="bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-xs px-2 py-0.5 rounded w-48 text-center focus:outline-none focus:border-emerald-500"
            placeholder="MM/DD/YYYY, hh:mm:ss AM"
          />
        </div>
      </div>

      {/* Tooth Boxes Canvas Container */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col items-center space-y-4 overflow-x-auto">
        {/* Temporary Teeth Section */}
        <div className="flex flex-col gap-2 pb-2">
          <div className="flex gap-1.5 justify-center">
            {TEMP_TOP_TEETH.map((t) => renderToothCell(t, true))}
          </div>
          <div className="flex gap-1.5 justify-center">
            {TEMP_BOTTOM_TEETH.map((t) => renderToothCell(t, true))}
          </div>
        </div>

        {/* Permanent Teeth Section */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80 px-4">
          <div className="flex gap-1.5 justify-center">
            {PERM_TOP_TEETH.map((t) => renderToothCell(t, false))}
          </div>
          <div className="flex gap-1.5 justify-center">
            {PERM_BOTTOM_TEETH.map((t) => renderToothCell(t, false))}
          </div>
        </div>
      </div>

      {/* INTERACTIVE SERVICES LEGEND PALETTE */}
      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80 space-y-2">
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-300 border-b border-slate-800/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>SERVICES MONITORING LEGENDS PALETTE (CLICK TO SELECT)</span>
          </div>

          {isEditable && (
            <button
              type="button"
              onClick={() => setSelectedSymbol(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold transition border cursor-pointer ${
                selectedSymbol === null
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Eraser className="w-3 h-3" /> Clear Tooth Code (Eraser)
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          {SERVICE_LEGENDS.map((item) => {
            const isSelected = selectedSymbol === item.code;

            return (
              <button
                key={item.code}
                type="button"
                disabled={!isEditable}
                onClick={() => setSelectedSymbol(item.code)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-900/40 border-blue-500 text-white ring-1 ring-blue-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <span
                  className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                  }`}
                >
                  {item.code}
                </span>
                <span className="text-slate-200 truncate flex-1">{item.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ServicesMonitoringChart;