import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Maximize2, Smartphone } from 'lucide-react';

interface WebcamCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
}

export const WebcamCaptureModal: React.FC<WebcamCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Modular device selection states
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // 1. Fetch all available cameras (built-in, Samsung, iPhone USB streams)
  const getAvailableCameras = async () => {
    try {
      // Trigger a temporary stream request so labels are populated by browser permissions
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = mediaDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      // Default auto-select connected mobile USB video feeds (DroidCam, Camo, iPhone, Samsung)
      const phoneCamera = videoInputs.find((d) =>
        /droidcam|camo|iphone|samsung|android|usb|virtual/i.test(d.label)
      );

      if (phoneCamera) {
        setSelectedDeviceId(phoneCamera.deviceId);
      } else if (videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }

      // Stop temporary initial stream
      initialStream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.error('Error enumerating cameras:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      getAvailableCameras();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !capturedImage && selectedDeviceId) {
      startCamera(selectedDeviceId);
    } else if (!isOpen || capturedImage) {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage, selectedDeviceId]);

  // Request high-res portrait video stream from selected camera device
  const startCamera = async (deviceId: string) => {
    stopCamera();
    setCameraError(null);

    // Detect if device is a virtual phone camera (DroidCam / Camo)
    const isVirtualDriver = /droidcam|camo|virtual/i.test(
      devices.find((d) => d.deviceId === deviceId)?.label || ''
    );

    // Virtual drivers like DroidCam require standard video constraints to avoid green screen output
    const videoConstraints: MediaTrackConstraints = isVirtualDriver
      ? { deviceId: { exact: deviceId } } // Flexible constraints for DroidCam/virtual sources
      : {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 2560 },
          aspectRatio: { ideal: 3 / 4 },
        };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error starting camera stream, trying fallback:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        setCameraError('Failed to start stream from selected device.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const rawWidth = video.videoWidth || 1280;
    const rawHeight = video.videoHeight || 720;

    // Center-crop to 3:4 portrait area
    let cropWidth = Math.round(rawHeight * (3 / 4));
    let cropHeight = rawHeight;
    let startX = Math.round((rawWidth - cropWidth) / 2);
    let startY = 0;

    if (cropWidth > rawWidth) {
      cropWidth = rawWidth;
      cropHeight = Math.round(rawWidth * (4 / 3));
      startY = Math.round((rawHeight - cropHeight) / 2);
      startX = 0;
    }

    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const retake = () => {
    setCapturedImage(null);
    if (selectedDeviceId) startCamera(selectedDeviceId);
  };

  const confirmCapture = () => {
    if (!capturedImage) return;

    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `mobile_usb_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, capturedImage);
        handleClose();
      });
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header & Modular Device Selector Dropdown */}
        <div className="p-4 border-b border-slate-800 flex flex-col gap-3 bg-slate-950">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Camera className="w-5 h-5 text-emerald-400" />
              <span>Scan 8R Intake Form (Mobile USB / Webcam)</span>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Camera Hardware Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-xs">
            <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-400 font-medium">Source:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-transparent text-slate-200 w-full focus:outline-none cursor-pointer font-sans"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId} className="bg-slate-900 text-slate-100">
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PORTRAIT VIEWPORT CONTAINER: 3:4 aspect ratio */}
        <div className="relative aspect-[3/4] bg-black flex items-center justify-center overflow-hidden flex-1">
          {cameraError ? (
            <div className="text-center p-6 text-red-400 text-xs">{cameraError}</div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured scan" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}

          {/* 8R Framing Overlay */}
          {!capturedImage && !cameraError && (
            <div className="absolute inset-6 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <span className="text-emerald-300 font-mono text-[11px] bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                <Maximize2 className="w-3 h-3 text-emerald-400" /> Align 8R Sheet Here
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-950/70 px-2 py-0.5 rounded">
                High-Res OCR Mode
              </span>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={retake}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retake
                </button>
                <button
                  type="button"
                  onClick={confirmCapture}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  <Check className="w-4 h-4" /> Use Captured Scan
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={takeSnapshot}
                disabled={!!cameraError}
                className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-950/50 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" /> Capture Photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamCaptureModal;