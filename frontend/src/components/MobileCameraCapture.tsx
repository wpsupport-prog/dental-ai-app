import React, { useRef, useState } from 'react';
import { Camera, Smartphone, Check, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface MobileCameraCaptureProps {
  onCapture?: (file: File, previewUrl: string) => void;
  disabled?: boolean;
}

export const MobileCameraCapture: React.FC<MobileCameraCaptureProps> = ({ disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedSuccess, setSyncedSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSyncing(true);
      setSyncedSuccess(false);

      const formData = new FormData();
      formData.append('file', file);

      try {
        // DYNAMICALLY DETECT PC IP (Works whether accessed via IP or localhost)
        const hostIp = window.location.hostname;
        const uploadUrl = `http://${hostIp}:8000/api/v1/sync/upload`;

        // Upload photo to backend sync buffer
        await axios.post(uploadUrl, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setSyncedSuccess(true);
        setTimeout(() => setSyncedSuccess(false), 3000);
      } catch (err) {
        console.error('Failed to sync mobile photo:', err);
        alert('Failed to transmit photo to desktop.');
      } finally {
        setIsSyncing(false);
        if (e.target) e.target.value = '';
      }
    }
  };

  return (
    <label
      className={`cursor-pointer bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-md ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {isSyncing ? (
        <RefreshCw className="w-4 h-4 animate-spin text-white" />
      ) : syncedSuccess ? (
        <Check className="w-4 h-4 text-emerald-200" />
      ) : (
        <Smartphone className="w-4 h-4 text-emerald-200" />
      )}

      <span>{isSyncing ? 'Sending to PC...' : syncedSuccess ? 'Sent to PC!' : 'Snap via Mobile'}</span>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isSyncing}
      />
    </label>
  );
};

export default MobileCameraCapture;