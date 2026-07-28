import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Trash2, Calendar } from 'lucide-react';

export interface ServiceRenderedRow {
  id: string;
  date: string;
  oralProphylaxis: boolean;
  fluorideVarnishGel: boolean;
  pitAndFissureSealant: string;
  permanentFilling: string;
  temporaryFilling: string;
  extraction: string;
  consultation: boolean;
  remarks: string;
}

interface RecordOfServicesRenderedProps {
  rows?: ServiceRenderedRow[];
  onChange?: (rows: ServiceRenderedRow[]) => void;
  isEditable?: boolean;
}

// Helper to get local date string in MM/DD/YYYY format
const getLocalDateOnly = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
};

export const RecordOfServicesRendered: React.FC<RecordOfServicesRenderedProps> = ({
  rows = [],
  onChange,
  isEditable = true,
}) => {
  // Guarantee initial row if empty
  const initialRows: ServiceRenderedRow[] = rows.length > 0 ? rows : [
    {
      id: `service-row-${Date.now()}`,
      date: getLocalDateOnly(),
      oralProphylaxis: false,
      fluorideVarnishGel: false,
      pitAndFissureSealant: '',
      permanentFilling: '',
      temporaryFilling: '',
      extraction: '',
      consultation: false,
      remarks: '',
    }
  ];

  const [serviceRows, setServiceRows] = useState<ServiceRenderedRow[]>(initialRows);
  
  // 🔑 ADD THIS EFFECT: Sync internal state whenever parent `rows` prop updates (e.g. on form reset)
  useEffect(() => {
    if (rows && rows.length > 0) {
      setServiceRows(rows);
    } else {
      setServiceRows([
        {
          id: `service-row-${Date.now()}`,
          date: getLocalDateOnly(),
          oralProphylaxis: false,
          fluorideVarnishGel: false,
          pitAndFissureSealant: '',
          permanentFilling: '',
          temporaryFilling: '',
          extraction: '',
          consultation: false,
          remarks: '',
        },
      ]);
    }
  }, [rows]);

  const updateRows = (newRows: ServiceRenderedRow[]) => {
    setServiceRows(newRows);
    if (onChange) onChange(newRows);
  };

  const handleAddRow = () => {
    const newRow: ServiceRenderedRow = {
      id: `service-row-${Date.now()}`,
      date: getLocalDateOnly(),
      oralProphylaxis: false,
      fluorideVarnishGel: false,
      pitAndFissureSealant: '',
      permanentFilling: '',
      temporaryFilling: '',
      extraction: '',
      consultation: false,
      remarks: '',
    };
    updateRows([...serviceRows, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    if (serviceRows.length <= 1) {
      alert('At least one record entry row must remain.');
      return;
    }
    updateRows(serviceRows.filter((r) => r.id !== id));
  };

  const handleFieldChange = (id: string, field: keyof ServiceRenderedRow, value: any) => {
    const updated = serviceRows.map((r) => (r.id === id ? { ...r, [field]: value } : r));
    updateRows(updated);
  };

  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 my-4 space-y-4 text-slate-100 font-sans">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-blue-400 uppercase tracking-wider">
            <ClipboardList className="w-4 h-4" /> Record of Services Rendered
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Individual Patient Treatment Log
          </p>
        </div>

        {isEditable && (
          <button
            type="button"
            onClick={handleAddRow}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Add Service Entry Log
          </button>
        )}
      </div>

      {/* Instructions Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg text-[11px] text-slate-300 space-y-0.5">
        <p>• <strong>For Oral Prophylaxis, Fluoride Varnish/Gel & Consultation:</strong> Check (✓) if rendered</p>
        <p>• <strong>For Permanent & Temporary Filling, Pit and Fissure Sealant & Extraction:</strong> Indicate Number / Tooth Code</p>
      </div>

      {/* 2-Column Key-Value Form Group List */}
      <div className="space-y-4">
        {serviceRows.map((row, index) => (
          <div
            key={row.id}
            className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3 relative"
          >
            {/* Entry Subheader */}
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Service Log Entry #{index + 1}
              </span>

              {isEditable && serviceRows.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteRow(row.id)}
                  className="text-slate-500 hover:text-rose-400 flex items-center gap-1 text-xs transition"
                  title="Delete Entry"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            {/* 2-Column Grid Layout: Label on Left, Field on Right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              
              {/* Date */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <label className="font-semibold text-slate-400">Date Rendered:</label>
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded w-44">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <input
                    type="text"
                    readOnly={!isEditable}
                    value={row.date}
                    onChange={(e) => handleFieldChange(row.id, 'date', e.target.value)}
                    className="bg-transparent text-slate-100 font-mono text-xs w-full focus:outline-none"
                    placeholder="MM/DD/YYYY"
                  />
                </div>
              </div>

              {/* Oral Prophylaxis */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <label className="font-semibold text-slate-400 cursor-pointer" onClick={() => isEditable && handleFieldChange(row.id, 'oralProphylaxis', !row.oralProphylaxis)}>
                  Oral Prophylaxis:
                </label>
                <input
                  type="checkbox"
                  disabled={!isEditable}
                  checked={row.oralProphylaxis}
                  onChange={(e) => handleFieldChange(row.id, 'oralProphylaxis', e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Fluoride Varnish / Gel */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <label className="font-semibold text-slate-400 cursor-pointer" onClick={() => isEditable && handleFieldChange(row.id, 'fluorideVarnishGel', !row.fluorideVarnishGel)}>
                  Fluoride Varnish / Fluoride Gel:
                </label>
                <input
                  type="checkbox"
                  disabled={!isEditable}
                  checked={row.fluorideVarnishGel}
                  onChange={(e) => handleFieldChange(row.id, 'fluorideVarnishGel', e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Pit and Fissure Sealant */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <label className="font-semibold text-slate-400">Pit and Fissure Sealant:</label>
                <input
                  type="text"
                  readOnly={!isEditable}
                  value={row.pitAndFissureSealant}
                  onChange={(e) => handleFieldChange(row.id, 'pitAndFissureSealant', e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono text-xs w-44 focus:outline-none focus:border-blue-500"
                  placeholder="Number / Code"
                />
              </div>

              {/* Permanent Filling */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <label className="font-semibold text-slate-400">Permanent Filling:</label>
                <input
                  type="text"
                  readOnly={!isEditable}
                  value={row.permanentFilling}
                  onChange={(e) => handleFieldChange(row.id, 'permanentFilling', e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono text-xs w-44 focus:outline-none focus:border-blue-500"
                  placeholder="Number / Code"
                />
              </div>

              {/* Temporary Filling */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <label className="font-semibold text-slate-400">Temporary Filling:</label>
                <input
                  type="text"
                  readOnly={!isEditable}
                  value={row.temporaryFilling}
                  onChange={(e) => handleFieldChange(row.id, 'temporaryFilling', e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono text-xs w-44 focus:outline-none focus:border-blue-500"
                  placeholder="Number / Code"
                />
              </div>

              {/* Extraction */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <label className="font-semibold text-slate-400">Extraction:</label>
                <input
                  type="text"
                  readOnly={!isEditable}
                  value={row.extraction}
                  onChange={(e) => handleFieldChange(row.id, 'extraction', e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono text-xs w-44 focus:outline-none focus:border-blue-500"
                  placeholder="Number / Tooth Code"
                />
              </div>

              {/* Consultation */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <label className="font-semibold text-slate-400 cursor-pointer" onClick={() => isEditable && handleFieldChange(row.id, 'consultation', !row.consultation)}>
                  Consultation:
                </label>
                <input
                  type="checkbox"
                  disabled={!isEditable}
                  checked={row.consultation}
                  onChange={(e) => handleFieldChange(row.id, 'consultation', e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Remarks / Details (Full Width across the 2 columns) */}
              <div className="col-span-1 md:col-span-2 flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <label className="font-semibold text-slate-400 whitespace-nowrap">Remarks / Details:</label>
                <input
                  type="text"
                  readOnly={!isEditable}
                  value={row.remarks}
                  onChange={(e) => handleFieldChange(row.id, 'remarks', e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 text-xs w-full focus:outline-none focus:border-blue-500"
                  placeholder="Notes, procedure details, or additional remarks..."
                />
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecordOfServicesRendered;