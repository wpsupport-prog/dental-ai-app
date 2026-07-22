import React from 'react';

interface ToothBoxProps {
  number: string;
  value?: string;
  onClick: (number: string) => void;
  isTemporary?: boolean;
}

export const ToothBox: React.FC<ToothBoxProps> = ({
  number,
  value,
  onClick,
  isTemporary = false,
}) => {
  // Use green for permanent teeth and blue for temporary teeth
  const activeStyles = isTemporary
    ? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-sm shadow-blue-500/20'
    : 'bg-emerald-600/30 border-emerald-500 text-emerald-200 shadow-sm shadow-emerald-500/20';

  return (
    <button
      type="button"
      onClick={() => onClick(number)}
      className={`w-9 h-10 border rounded flex items-center justify-center font-mono font-bold text-sm transition-all ${
        value
          ? activeStyles
          : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-emerald-400 hover:bg-slate-800'
      }`}
    >
      {value || ''}
    </button>
  );
};