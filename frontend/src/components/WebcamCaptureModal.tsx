import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Maximize2 } from 'lucide-react';
import CameraSourceSelector from './CameraSourceSelector';

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

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const refreshCameraDevices = async () => {
    setIsScanning(true);
    setCameraError(null);
    try {
      // Temporary stream to acquire system labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      tempStream.getTracks().forEach((track) => track.stop());

      if (videoInputs.length > 0 && !selectedDeviceId) {
        // Auto-select USB / Samsung / Android devices if found
        const nativePhone = videoInputs.find((d) =>
          /android|samsung|usb|camera/i.test(d.label)
        );
        setSelectedDeviceId(nativePhone ? nativePhone.deviceId : videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Camera permissions error:', err);
      setCameraError('Camera access denied or no video input detected.');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) refreshCameraDevices();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !capturedImage && selectedDeviceId) {
      startCamera(selectedDeviceId);
    } else if (!isOpen || capturedImage) {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, capturedImage, selectedDeviceId]);

  const startCamera = async (deviceId: string) => {
    stopCamera();
    setCameraError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setCameraError('Unable to stream from selected camera source.');
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
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.98));
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
        const file = new File([blob], `native_usb_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
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
        <div className="p-4 border-b border-slate-800 flex flex-col gap-3 bg-slate-950">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Camera className="w-5 h-5 text-emerald-400" />
              <span>Scan Intake Form (Native Android USB / Camera)</span>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modular Source Selector */}
          <CameraSourceSelector
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            onRefresh={refreshCameraDevices}
            isScanning={isScanning}
          />
        </div>

        {/* Viewport */}
        <div className="relative aspect-[3/4] bg-black flex items-center justify-center overflow-hidden flex-1">
          {cameraError ? (
            <div className="text-center p-6 text-red-400 text-xs">{cameraError}</div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured scan" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}

          {!capturedImage && !cameraError && (
            <div className="absolute inset-6 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <span className="text-emerald-300 font-mono text-[11px] bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                <Maximize2 className="w-3 h-3 text-emerald-400" /> Align 8R Sheet Here
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <button onClick={handleClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800">
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {capturedImage ? (
              <>
                <button onClick={retake} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 flex items-center gap-1.5 border border-slate-700">
                  <RefreshCw className="w-3.5 h-3.5" /> Retake
                </button>
                <button onClick={confirmCapture} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-lg">
                  <Check className="w-4 h-4" /> Use Captured Scan
                </button>
              </>
            ) : (
              <button onClick={takeSnapshot} disabled={!!cameraError} className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-2 shadow-lg disabled:opacity-50">
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