import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Maximize2 } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage]);

  // Request High-Resolution Portrait Stream (3:4 aspect ratio matching 8R paper format)
  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 2560 }, // Enforces high-res Portrait mode
          aspectRatio: { ideal: 3 / 4 }, // Standard 8R paper aspect ratio (8" x 10")
          facingMode: 'environment',
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      // Fallback constraint if ultra high-res isn't supported by hardware
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1080 }, height: { ideal: 1440 }, aspectRatio: { ideal: 3 / 4 } },
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        setCameraError('Unable to access webcam. Please verify camera permissions.');
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
    const canvas = document.createElement('canvas');
    
    // Capture full high-resolution raw pixel matrix from sensor
    canvas.width = video.videoWidth || 1440;
    canvas.height = video.videoHeight || 1920;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.98); // High JPEG quality for vision AI
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmCapture = () => {
    if (!capturedImage) return;

    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `portrait_webcam_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
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
      {/* Expanded Modal Size: max-w-xl with vertical max-h */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>Scan 8R Intake Form (Portrait Capture)</span>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PORTRAIT VIEWPORT CONTAINER: aspect-[3/4] matching 8R format */}
        <div className="relative aspect-[3/4] bg-black flex items-center justify-center overflow-hidden flex-1">
          {cameraError ? (
            <div className="text-center p-6 text-red-400 text-xs">{cameraError}</div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured 8R scan" className="w-full h-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {/* 8R Document Framing Overlay Guide */}
          {!capturedImage && !cameraError && (
            <div className="absolute inset-6 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <span className="text-emerald-300 font-mono text-[11px] bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                <Maximize2 className="w-3 h-3 text-emerald-400" /> Align 8R / Portrait Sheet Here
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-950/70 px-2 py-0.5 rounded">
                High-Resolution OCR Mode
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