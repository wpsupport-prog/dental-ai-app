import React from 'react';
import { Eraser } from 'lucide-react';

export interface LegendItem {
  perm: string;
  temp: string;
  label: string;
}

export const DENTAL_LEGENDS: LegendItem[] = [
  { perm: '✓', label: 'Sound / Sealed', temp: '✓' },
  { perm: 'D', label: 'Decayed', temp: 'd' },
  { perm: 'F', label: 'Filled', temp: 'f' },
  { perm: 'M', label: 'Missing', temp: 'e' },
  { perm: 'X', label: 'Indicated for Extraction', temp: 'x' },
  { perm: 'Un', label: 'Unerupted', temp: 'un' },
  { perm: 'S', label: 'Supernumerary', temp: 's' },
  { perm: 'JC', label: 'Jacket Crown', temp: 'jc' },
  { perm: 'P', label: 'Pontic', temp: 'p' },
];

interface LegendsPaletteProps {
  selectedLegend: string;
  onSelectLegend: (legend: string) => void;
}

export const LegendsPalette: React.FC<LegendsPaletteProps> = ({
  selectedLegend,
  onSelectLegend,
}) => {
  return (
    <div className="space-y-2 font-sans">
      <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase">
        <span>Dental Legends Palette</span>
        <span className="text-slate-300">
          Selected Symbol:{' '}
          <strong className="text-white bg-blue-600 px-2 py-0.5 rounded font-mono text-sm">
            {selectedLegend || 'Eraser'}
          </strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-900 p-3 rounded-lg border border-slate-800">
        <button
          type="button"
          onClick={() => onSelectLegend('')}
          className={`col-span-2 flex items-center justify-center gap-2 p-2 rounded border transition ${
            selectedLegend === ''
              ? 'bg-rose-950/60 border-rose-600 text-rose-300 font-bold'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Eraser className="w-4 h-4" /> Clear Tooth (Eraser Mode)
        </button>

        {DENTAL_LEGENDS.map((item) => (
          <div key={item.label} className="flex gap-1">
            {/* Block 1: Permanent Legend Button (Green) */}
            <button
              type="button"
              onClick={() => onSelectLegend(item.perm)}
              className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded border transition ${
                selectedLegend === item.perm
                  ? 'bg-emerald-600 border-emerald-400 text-white font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-700'
              }`}
            >
              <span className="text-slate-400 text-[11px]">{item.label} (Perm)</span>
              <span className="font-mono font-bold text-sm text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded">
                {item.perm}
              </span>
            </button>

            {/* Block 3: Temporary Legend Button (Blue) */}
            <button
              type="button"
              onClick={() => onSelectLegend(item.temp)}
              className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded border transition ${
                selectedLegend === item.temp
                  ? 'bg-blue-600 border-blue-400 text-white font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-700'
              }`}
            >
              <span className="text-slate-400 text-[11px]">(Temp)</span>
              <span className="font-mono font-bold text-sm text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded">
                {item.temp}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};