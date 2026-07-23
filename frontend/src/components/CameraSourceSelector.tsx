import React from 'react';
import { Smartphone, RefreshCw } from 'lucide-react';

interface CameraSourceSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onRefresh: () => void;
  isScanning: boolean;
}

export const CameraSourceSelector: React.FC<CameraSourceSelectorProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onRefresh,
  isScanning,
}) => {
  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg p-1.5 text-xs">
      <Smartphone className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
      <span className="text-slate-400 font-medium shrink-0">Camera Source:</span>

      <select
        value={selectedDeviceId}
        onChange={(e) => onSelectDevice(e.target.value)}
        className="bg-transparent text-slate-200 w-full focus:outline-none cursor-pointer font-sans truncate"
      >
        {devices.length === 0 && (
          <option value="" className="bg-slate-900 text-slate-400">
            No camera detected
          </option>
        )}
        {devices.map((device, idx) => (
          <option
            key={device.deviceId || idx}
            value={device.deviceId}
            className="bg-slate-900 text-slate-100"
          >
            {device.label || `Camera Source ${idx + 1}`}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onRefresh}
        title="Rescan connected USB & native cameras"
        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition shrink-0 cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-blue-400' : ''}`} />
      </button>
    </div>
  );
};

export default CameraSourceSelector;