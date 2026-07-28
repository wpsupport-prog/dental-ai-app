import React, { useState } from 'react';
import { 
  CheckCircle, 
  FileText, 
  Upload, 
  RefreshCw, 
  Check, 
  HeartPulse, 
  User, 
  ShieldCheck, 
  Stethoscope, 
  Activity, 
  Utensils, 
  Camera,
	QrCode // <-- ADD THIS ICON
} from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react'; // <-- ADD THIS IMPORT

import axios from 'axios';

import DentalChart from './components/DentalChart';
import { TabNavigation } from './components/TabNavigation';
import { RecordsRetrievalTab } from './components/RecordsRetrievalTab';
import OralHealthConditionSummary from './components/OralHealthConditionSummary';
import ServicesMonitoringChart, { type ServiceVisitRecord, type ServiceToothData } from './components/ServicesMonitoringChart';
import WebcamCaptureModal from './components/WebcamCaptureModal';
import MobileCameraCapture from './components/MobileCameraCapture'; // <-- ADD THIS LINE

import RecordOfServicesRendered, { type ServiceRenderedRow } from './components/RecordOfServicesRendered';

export type ActiveTab = 'intake' | 'records';

import { useEffect, useRef } from 'react';

// Define visit record type locally to prevent Vite runtime export errors
export interface DentalVisitRecord {
  id: string;
  visitLabel: string;
  visitDate: string;
  chartData: Record<string, string>;
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

// Helper to get local date string in MM/DD/YYYY format
const getLocalDateOnly = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
};

// Define dynamic API Base URL safely handling WebView2 / Tauri production schemes
const rawHost = window.location.hostname;
const hostName = (rawHost === 'tauri.localhost' || !rawHost) ? '127.0.0.1' : rawHost;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${hostName}:8000`;

function MobileConnectModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  // Default fallback uses explicit loopback 127.0.0.1 (never tauri.localhost)
  const [mobileUrl, setMobileUrl] = useState<string>("http://127.0.0.1:8000/scan");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch true LAN IP from FastAPI sidecar every time modal opens
	useEffect(() => {
	  if (isOpen) {
		setIsLoading(true);
		// Use API_BASE_URL so it proxies or connects directly
		axios.get(`${API_BASE_URL}/api/v1/system/ip`)
		  .then((res) => {
			if (res.data && res.data.scan_url) {
			  setMobileUrl(res.data.scan_url);
			}
		  })
		  .catch((err) => {
			console.error("Error fetching system IP:", err);
		  })
		  .finally(() => {
			setIsLoading(false);
		  });
	  }
	}, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-2">
          📱 Scan to Connect Mobile Camera
        </h3>
        <p className="text-xs text-slate-400">
          Point your smartphone camera at this QR code to open the mobile intake form scanner:
        </p>
        
        <div className="bg-white p-4 rounded-lg inline-block my-2">
          {isLoading ? (
            <div className="w-[180px] h-[180px] flex items-center justify-center text-slate-800 text-xs font-semibold">
              Detecting Local Network...
            </div>
          ) : (
            <QRCodeSVG value={mobileUrl} size={180} includeMargin={true} />
          )}
        </div>
        
        <p className="text-xs font-mono text-blue-400 break-all">{mobileUrl}</p>

        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg text-sm font-semibold transition border border-slate-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Define initial blank form state at top-level
const INITIAL_FORM_STATE = {
  surname: '', firstName: '', middleInitial: '', dob: '', age: '',
  sex: '', civilStatus: '', placeOfBirth: '', address: '', occupation: '',
  parentGuardian: '', philhealthNo: '', yakapProvider: '', contactNo: '', signedName: '',
  bloodPressure: '', pulseRate: '', temperature: '', height: '', weight: '',
  nhtsPr: false, fourPs: false, indigenousPeople: false, pwds: false,
  allergiesChecked: false, allergiesSpecified: '', hypertensionCva: false,
  diabetesMellitus: false, bloodDisorder: false, cardiovascularHeartDiseases: false,
  thyroidDisorders: false, hepatitisChecked: false, hepatitisSpecified: '',
  malignancyChecked: false, malignancySpecified: '',
  medicalHospitalizationChecked: false, medicalHospitalizationSpecified: '',
  surgicalChecked: false, surgicalSpecified: '', bloodTransfusionChecked: false,
  bloodTransfusionSpecified: '', tattooChecked: false, tattooSpecified: '',
  othersChecked: false, othersSpecified: '',
  sugarBeveragesChecked: false, sugarBeveragesSpecified: '',
  useAlcoholChecked: false, useAlcoholSpecified: '',
  useTobaccoChecked: false, useTobaccoSpecified: '',
  betelNutChecked: false, betelNutSpecified: ''
};

export default function App() {
	
	// Inside your main App() component:
	const lastSyncedTimestamp = useRef<number>(0);

useEffect(() => {
  const syncInterval = setInterval(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/sync/latest`);
      const data = response.data;

      if (data && data.url && data.timestamp > lastSyncedTimestamp.current) {
        lastSyncedTimestamp.current = data.timestamp;

        // Guarantee full absolute URL pointing to FastAPI port 8000
        const targetUrl = data.url.startsWith('http') 
          ? data.url 
          : `${API_BASE_URL}${data.url.startsWith('/') ? '' : '/'}${data.url}`;

        const imageBlob = await fetch(targetUrl).then((r) => r.blob());
        const syncedFile = new File([imageBlob], data.filename || 'mobile_scan.jpg', {
          type: imageBlob.type || 'image/jpeg',
        });

        setFile(syncedFile);
        setImagePreview(targetUrl);
        setSavedSuccess(false);
      }
    } catch (err) {
      // Ignore background sync errors
    }
  }, 2000);

  return () => clearInterval(syncInterval);
}, []);
	
  // Clear any residual form data / mobile scan buffers on fresh app load
  useEffect(() => {
    resetAllFormState();
  }, []);
	
  const [activeTab, setActiveTab] = useState<ActiveTab>('intake');
  
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);

  const [formData, setFormData] = useState({
    // Patient Info
    surname: '',
    firstName: '',
    middleInitial: '',
    dob: '',
    age: '',
    sex: '',
    civilStatus: '',
    placeOfBirth: '',
    address: '',
    occupation: '',
    parentGuardian: '',
    philhealthNo: '',
    yakapProvider: '',
    contactNo: '',
    signedName: '',

    // Vital Signs
    bloodPressure: '',
    pulseRate: '',
    temperature: '',
	height: '', // <-- Added
    weight: '', // <-- Added

    // Memberships
    nhtsPr: false,
    fourPs: false,
    indigenousPeople: false,
    pwds: false,

    // Medical History
    allergiesChecked: false,
    allergiesSpecified: '',
    hypertensionCva: false,
    diabetesMellitus: false,
    bloodDisorder: false,
    cardiovascularHeartDiseases: false,
    thyroidDisorders: false,
    hepatitisChecked: false,
    hepatitisSpecified: '',
    malignancyChecked: false,
    malignancySpecified: '',

    // History of Hospitalization
    medicalHospitalizationChecked: false,
    medicalHospitalizationSpecified: '',
    surgicalChecked: false,
    surgicalSpecified: '',
    bloodTransfusionChecked: false,
    bloodTransfusionSpecified: '',
    tattooChecked: false,
    tattooSpecified: '',
    othersChecked: false,
    othersSpecified: '',

    // Dietary Habits / Social History
    sugarBeveragesChecked: false,
    sugarBeveragesSpecified: '',
    useAlcoholChecked: false,
    useAlcoholSpecified: '',
    useTobaccoChecked: false,
    useTobaccoSpecified: '',
    betelNutChecked: false,
    betelNutSpecified: '',
  });

  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // 2. DEFINE THE RESET HELPER FUNCTION
  const resetAllFormState = async () => {
    setFormData(INITIAL_FORM_STATE);
    setFile(null);
    setImagePreview(null);
    setConfidence(0.98);
    setSavedSuccess(false);

    setVisits([
      {
        id: 'visit-1',
        visitLabel: 'Visit 1',
        visitDate: getLocalPCDateTime(),
        chartData: {},
      },
    ]);
    setServicesData([]);
	setRenderedServices([]); // 👈 ADD THIS LINE HERE

    try {
      await axios.post(`${API_BASE_URL}/api/v1/sync/clear`);
    } catch (err) {
      console.warn("Backend sync buffer clear note:", err);
    }
  };
  
  const [isUploading, setIsUploading] = useState(false);
  const [confidence, setConfidence] = useState<number>(0.98);
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  const [renderedServices, setRenderedServices] = useState<ServiceRenderedRow[]>([]);
  
  // State to track multi-visit oral health chart logs initialized with PC local date/time
  const [visits, setVisits] = useState<DentalVisitRecord[]>([
    {
      id: 'visit-1',
      visitLabel: 'Visit 1',
      visitDate: getLocalPCDateTime(),
      chartData: {},
    },
  ]);
  
	// State to track multi-visit Services Monitoring Chart logs
	const [servicesData, setServicesData] = useState<ServiceVisitRecord[] | ServiceToothData>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setSavedSuccess(false);
    }
  };
  
  // <-- ADD THIS NEW HANDLER FOR MOBILE CAMERA CAPTURE
  const handleMobileCapture = (capturedFile: File, previewUrl: string) => {
    setFile(capturedFile);
    setImagePreview(previewUrl);
    setSavedSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setSavedSuccess(false);

    const bodyFormData = new FormData();
    bodyFormData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/forms/upload`, bodyFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const info = response.data.patient_info || {};
      const vitals = response.data.vital_signs || {};
      const mems = response.data.memberships || {};
      const med = response.data.medical_history || {};
      const social = response.data.social_history || {};

      setFormData((prev) => {
        // Handle raw AI extraction for age & sex cleanly
        let rawAge = (info.age || '').toString().trim();
        let rawSex = (info.sex || '').toString().trim().toUpperCase();

        // If vision AI returned a combined string like "46 / M" in either field, clean it up:
        if (rawAge.includes('/')) {
          const parts = rawAge.split('/');
          rawAge = parts[0].trim();
          if (!rawSex) rawSex = parts[1]?.trim().toUpperCase() || '';
        }

        // Normalize Sex to 'M', 'F', or fallback
        if (rawSex.startsWith('M')) rawSex = 'M';
        else if (rawSex.startsWith('F')) rawSex = 'F';

        return {
          ...prev,
          // Demographics
          surname: info.surname || prev.surname,
          firstName: info.first_name || prev.firstName,
          middleInitial: info.middle_initial || prev.middleInitial,
          dob: info.dob || prev.dob,

          // Mapped Independent Age & Sex
          age: rawAge || prev.age,
          sex: rawSex || prev.sex,

          civilStatus: info.civil_status || prev.civilStatus,
          placeOfBirth: info.place_of_birth || prev.placeOfBirth,
          address: info.address || prev.address,
          occupation: info.occupation || prev.occupation,
          parentGuardian: info.parent_guardian || prev.parentGuardian,
          philhealthNo: info.philhealth_no || prev.philhealthNo,
          yakapProvider: info.yakap_provider || prev.yakapProvider,
          contactNo: info.contact_no || prev.contactNo,
          signedName: info.signed_name || prev.signedName,

          // Vitals
          bloodPressure: vitals.blood_pressure || prev.bloodPressure,
          pulseRate: vitals.pulse_rate || prev.pulseRate,
          temperature: vitals.temperature || prev.temperature,
          height: vitals.height || prev.height,
          weight: vitals.weight || prev.weight,

          // Memberships
          nhtsPr: mems.nhts_pr ? true : prev.nhtsPr,
          fourPs: mems.four_ps ? true : prev.fourPs,
          indigenousPeople: mems.indigenous_people ? true : prev.indigenousPeople,
          pwds: mems.pwds ? true : prev.pwds,

          // Medical History
          allergiesChecked: med.allergies_checked || !!med.allergies_specified || prev.allergiesChecked,
          allergiesSpecified: med.allergies_specified || prev.allergiesSpecified,
          hypertensionCva: med.hypertension_cva ? true : prev.hypertensionCva,
          diabetesMellitus: med.diabetes_mellitus ? true : prev.diabetesMellitus,
          bloodDisorder: med.blood_disorder ? true : prev.bloodDisorder,
          cardiovascularHeartDiseases: med.cardiovascular_heart_diseases ? true : prev.cardiovascularHeartDiseases,
          thyroidDisorders: med.thyroid_disorders ? true : prev.thyroidDisorders,
          hepatitisChecked: med.hepatitis_checked || !!med.hepatitis_specified || prev.hepatitisChecked,
          hepatitisSpecified: med.hepatitis_specified || prev.hepatitisSpecified,
          malignancyChecked: med.malignancy_checked || !!med.malignancy_specified || prev.malignancyChecked,
          malignancySpecified: med.malignancy_specified || prev.malignancySpecified,

          // Hospitalization
          medicalHospitalizationChecked: med.medical_hospitalization_checked || !!med.medical_hospitalization_specified || prev.medicalHospitalizationChecked,
          medicalHospitalizationSpecified: med.medical_hospitalization_specified || prev.medicalHospitalizationSpecified,
          surgicalChecked: med.surgical_checked || !!med.surgical_specified || prev.surgicalChecked,
          surgicalSpecified: med.surgical_specified || prev.surgicalSpecified,
          bloodTransfusionChecked: med.blood_transfusion_checked || !!med.blood_transfusion_specified || prev.bloodTransfusionChecked,
          bloodTransfusionSpecified: med.blood_transfusion_specified || prev.bloodTransfusionSpecified,
          tattooChecked: med.tattoo_checked || !!med.tattoo_specified || prev.tattooChecked,
          tattooSpecified: med.tattoo_specified || prev.tattooSpecified,
          othersChecked: med.others_checked || !!med.others_specified || prev.othersChecked,
          othersSpecified: med.others_specified || prev.othersSpecified,

          // Dietary Habits / Social History
          sugarBeveragesChecked: social.sugar_beverages_checked,
          sugarBeveragesSpecified: social.sugar_beverages_specified || '',
          useAlcoholChecked: social.use_alcohol_checked,
          useAlcoholSpecified: social.use_alcohol_specified || '',
          useTobaccoChecked: social.use_tobacco_checked,
          useTobaccoSpecified: social.use_tobacco_specified || '',
          betelNutChecked: social.betel_nut_checked,
          betelNutSpecified: social.betel_nut_specified || '',
        };
      });

      setConfidence(response.data.confidence_score);
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Failed to execute AI extraction.');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Save full record including multi-visit dental chart entries
  const handleSaveDatabase = async () => {
    try {
      // 1. Sanitize Oral Health Chart Visits payload
      const sanitizedDentalVisits = visits.map((v) => {
        const rawLabel = v.visitLabel ? v.visitLabel.trim() : '';
        const rawDate = v.visitDate ? v.visitDate.trim() : '';

        return {
          ...v,
          // If custom date was entered, save it. Otherwise fallback to current local PC date (MM/DD/YYYY)
          visitLabel: rawLabel !== '' && rawLabel !== 'Year I' ? rawLabel : getLocalDateOnly(),
          visitDate: rawDate !== '' ? rawDate : getLocalPCDateTime(),
        };
      });

      // 2. Sanitize Services Monitoring payload if structured as an array of visits
      const sanitizedServicesData = Array.isArray(servicesData)
        ? servicesData.map((s) => {
            const rawLabel = s.visitLabel ? s.visitLabel.trim() : '';
            const rawDate = s.visitDate ? s.visitDate.trim() : '';
            return {
              ...s,
              visitLabel: rawLabel !== '' && rawLabel !== 'Initial Entry' ? rawLabel : getLocalDateOnly(),
              visitDate: rawDate !== '' ? rawDate : getLocalPCDateTime(),
            };
          })
        : servicesData;

      await axios.post(`${API_BASE_URL}/api/v1/forms/save`, {
        document_id: `doc_${Date.now()}`,
        confidence_score: confidence,
        requires_review: false,
        patient_info: {
          surname: formData.surname,
          first_name: formData.firstName,
          middle_initial: formData.middleInitial,
          dob: formData.dob,
          age: formData.age,
          sex: formData.sex,
          civil_status: formData.civilStatus,
          place_of_birth: formData.placeOfBirth,
          address: formData.address,
          occupation: formData.occupation,
          parent_guardian: formData.parentGuardian,
          philhealth_no: formData.philhealthNo,
          yakap_provider: formData.yakapProvider,
          contact_no: formData.contactNo,
          signed_name: formData.signedName,
        },
        vital_signs: {
          blood_pressure: formData.bloodPressure,
          pulse_rate: formData.pulseRate,
          temperature: formData.temperature,
          height: formData.height,
          weight: formData.weight,
        },
        memberships: {
          nhts_pr: formData.nhtsPr,
          four_ps: formData.fourPs,
          indigenous_people: formData.indigenousPeople,
          pwds: formData.pwds,
        },
        medical_history: {
          allergies_checked: formData.allergiesChecked,
          allergies_specified: formData.allergiesSpecified,
          hypertension_cva: formData.hypertensionCva,
          diabetes_mellitus: formData.diabetesMellitus,
          blood_disorder: formData.bloodDisorder,
          cardiovascular_heart_diseases: formData.cardiovascularHeartDiseases,
          thyroid_disorders: formData.thyroidDisorders,
          hepatitis_checked: formData.hepatitisChecked,
          hepatitis_specified: formData.hepatitisSpecified,
          malignancy_checked: formData.malignancyChecked,
          malignancy_specified: formData.malignancySpecified,
          medical_hospitalization_checked: formData.medicalHospitalizationChecked,
          medical_hospitalization_specified: formData.medicalHospitalizationSpecified,
          surgical_checked: formData.surgicalChecked,
          surgical_specified: formData.surgicalSpecified,
          blood_transfusion_checked: formData.bloodTransfusionChecked,
          blood_transfusion_specified: formData.bloodTransfusionSpecified,
          tattoo_checked: formData.tattooChecked,
          tattoo_specified: formData.tattooSpecified,
          others_checked: formData.othersChecked,
          others_specified: formData.othersSpecified,
        },
        social_history: {
          sugar_beverages_checked: formData.sugarBeveragesChecked,
          sugar_beverages_specified: formData.sugarBeveragesSpecified,
          use_alcohol_checked: formData.useAlcoholChecked,
          use_alcohol_specified: formData.useAlcoholSpecified,
          use_tobacco_checked: formData.useTobaccoChecked,
          use_tobacco_specified: formData.useTobaccoSpecified,
          betel_nut_checked: formData.betelNutChecked,
          betel_nut_specified: formData.betelNutSpecified,
        },
        dental_chart: sanitizedDentalVisits,
        services_monitoring: sanitizedServicesData,
		record_of_services_rendered: renderedServices, // 👈 ADD THIS FIELD TO YOUR DATABASE SAVE PAYLOAD
      });

      setSavedSuccess(true);
      
      // CLEAR ALL FORM FIELDS, IMAGE PREVIEW & MOBILE BUFFER INSTANTLY
      await resetAllFormState();
	  
    } catch (error: any) {
      console.error('Error saving to database:', error.response?.data || error.message);
      alert(`Failed to save record to database: ${error.response?.data?.detail || 'Server error'}`);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-12">
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white"/>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">Dental AI Intake Suite</h1>
              <p className="text-xs text-slate-400">City Health Office Treatment Record AI Reader</p>
            </div>
          </div>

          {/* Toggle Menu Right beside Header Logo */}
          <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {activeTab === 'intake' && (
  <div className="flex items-center gap-3">
    {/* ------------------------------------------------------------- */}
    {/* 1. MOBILE DEVICE ONLY BUTTON (Hidden on Desktop)             */}
    {/* ------------------------------------------------------------- */}
    <div className="block md:hidden">
      <MobileCameraCapture onCapture={handleMobileCapture} />
    </div>

    {/* ------------------------------------------------------------- */}
    {/* 2. DESKTOP ONLY BUTTONS (Hidden on Mobile)                   */}
    {/* ------------------------------------------------------------- */}
    <div className="hidden md:flex items-center gap-3">
      {/* File Upload Selector */}
      <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-lg text-sm flex items-center gap-2 transition border border-slate-700">
        <Upload className="w-4 h-4 text-blue-400"/>
        <span>{file ? file.name : "Select Form Scan"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </label>

		{/* Mobile QR Connect Button */}
	  <button
		type="button"
		onClick={() => setIsQrOpen(true)}
		className="bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-lg text-sm flex items-center gap-2 transition border border-slate-700 text-slate-200 cursor-pointer"
	  >
		<QrCode className="w-4 h-4 text-sky-400" />
		<span>Mobile Camera QR</span>
	  </button>
  
      {/* Webcam / USB Capture */}
      <button
        type="button"
        onClick={() => setIsWebcamOpen(true)}
        className="bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-lg text-sm flex items-center gap-2 transition border border-slate-700 text-slate-200 cursor-pointer"
      >
        <Camera className="w-4 h-4 text-emerald-400" />
        <span>Capture via Webcam</span>
      </button>

      {/* Process AI Button */}
      <button 
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
      >
        {isUploading ? <RefreshCw className="w-4 h-4 animate-spin"/> : "Process with AI"}
      </button>
    </div>
  </div>
)}
		
      </header>

      <main className="flex-1 p-6">
        {activeTab === 'intake' ? (
          <div className="flex gap-6">
            {/* Left Column: Preview */}
			<section className="w-5/12 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sticky top-24 h-[calc(100vh-8rem)]">
			  <div className="flex justify-between items-center mb-3">
				<span className="text-sm font-semibold text-slate-300">Scanned Document Preview</span>
				{file && <span className="text-xs text-blue-400 bg-blue-950/60 px-2 py-1 rounded border border-blue-800">{file.name}</span>}
			  </div>
			  <div className="flex-1 bg-slate-900 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-500 text-sm overflow-hidden p-2">
				{imagePreview ? (
				  <img src={imagePreview} alt="Scanned Form" className="max-h-full max-w-full object-contain rounded" />
				) : (
				  <p>Upload a form scan to preview</p>
				)}
			  </div>
			</section>

            {/* Right Column: Interactive Form & Chart */}
            <section className="w-7/12 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-100">Extracted Patient Details</h2>
                  <span className="text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <Check className="w-3.5 h-3.5"/> {Math.round(confidence * 100)}% Confidence
                  </span>
                </div>

                {/* Demographics */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                    <User className="w-4 h-4"/> Personal Information
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Surname</label>
                      <input type="text" value={formData.surname} onChange={(e) => setFormData({ ...formData, surname: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">First Name</label>
                      <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Middle Name</label>
                      <input type="text" value={formData.middleInitial} onChange={(e) => setFormData({ ...formData, middleInitial: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                    </div>

					<div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Date of Birth</label>
                      <input 
                        type="text" 
                        value={formData.dob} 
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" 
                      />
                    </div>

                    {/* SEPARATED AGE INPUT */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Age</label>
                      <input 
                        type="text" 
                        value={formData.age} 
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" 
                        placeholder="e.g. 46"
                      />
                    </div>

                    {/* SEPARATED SEX DROPDOWN */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Sex</label>
                      <select 
                        value={formData.sex} 
                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm cursor-pointer"
                      >
                        <option value="">Select...</option>
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
					
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Civil Status</label>
                      <input type="text" value={formData.civilStatus} onChange={(e) => setFormData({ ...formData, civilStatus: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Address</label>
                      <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Occupation</label>
                      <input type="text" value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">PhilHealth No.</label>
                      <input type="text" value={formData.philhealthNo} onChange={(e) => setFormData({ ...formData, philhealthNo: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Yakap Provider</label>
                      <input type="text" value={formData.yakapProvider} onChange={(e) => setFormData({ ...formData, yakapProvider: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">CP NO. (Contact)</label>
                      <input type="text" value={formData.contactNo} onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono text-blue-400" />
                    </div>

                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Signed Patient / Guardian</label>
                      <input type="text" value={formData.signedName} onChange={(e) => setFormData({ ...formData, signedName: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-semibold" />
                    </div>
                  </div>
                </div>

                {/* Memberships */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                    <ShieldCheck className="w-4 h-4"/> Other Patient Information (Membership)
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.nhtsPr} onChange={(e) => setFormData({ ...formData, nhtsPr: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                      NHTS
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.fourPs} onChange={(e) => setFormData({ ...formData, fourPs: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                      4PS
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.indigenousPeople} onChange={(e) => setFormData({ ...formData, indigenousPeople: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                      IP
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.pwds} onChange={(e) => setFormData({ ...formData, pwds: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                      PWDs
                    </label>
                  </div>
                </div>

                {/* Vital Signs */}
				<div className="space-y-3">
				  <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
					<HeartPulse className="w-4 h-4"/> Vital Signs
				  </div>
				  <div className="grid grid-cols-5 gap-3">
					<div>
					  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Blood Pressure</label>
					  <input type="text" value={formData.bloodPressure} onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono" />
					</div>
					<div>
					  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Pulse Rate</label>
					  <input type="text" value={formData.pulseRate} onChange={(e) => setFormData({ ...formData, pulseRate: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono" />
					</div>
					<div>
					  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Temp (°C)</label>
					  <input type="text" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono" />
					</div>
					<div>
					  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">HT (Height)</label>
					  <input type="text" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono" placeholder="cm / ft" />
					</div>
					<div>
					  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">WT (Weight)</label>
					  <input type="text" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-sm font-mono" placeholder="kg / lbs" />
					</div>
				  </div>
				</div>

                {/* Medical History */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                    <Stethoscope className="w-4 h-4"/> Medical History
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <div className="col-span-2 grid grid-cols-3 items-center gap-2 pb-1 border-b border-slate-800/50">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.allergiesChecked} onChange={(e) => setFormData({ ...formData, allergiesChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Allergies:
                      </label>
                      <input type="text" placeholder="Specified details..." value={formData.allergiesSpecified} onChange={(e) => setFormData({ ...formData, allergiesSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.hypertensionCva} onChange={(e) => setFormData({ ...formData, hypertensionCva: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                      Hypertension / CVA
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.diabetesMellitus} onChange={(e) => setFormData({ ...formData, diabetesMellitus: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                      Diabetes Mellitus
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.bloodDisorder} onChange={(e) => setFormData({ ...formData, bloodDisorder: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                      Blood Disorders
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.cardiovascularHeartDiseases} onChange={(e) => setFormData({ ...formData, cardiovascularHeartDiseases: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                      Cardiovascular / Heart
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.thyroidDisorders} onChange={(e) => setFormData({ ...formData, thyroidDisorders: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                      Thyroid Disorders
                    </label>

                    <div className="col-span-2 grid grid-cols-3 items-center gap-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.hepatitisChecked} onChange={(e) => setFormData({ ...formData, hepatitisChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Hepatitis:
                      </label>
                      <input type="text" placeholder="Type specified..." value={formData.hepatitisSpecified} onChange={(e) => setFormData({ ...formData, hepatitisSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>

                    <div className="col-span-2 grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.malignancyChecked} onChange={(e) => setFormData({ ...formData, malignancyChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Malignancy:
                      </label>
                      <input type="text" placeholder="Details specified..." value={formData.malignancySpecified} onChange={(e) => setFormData({ ...formData, malignancySpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* History of Previous Hospitalization */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                    <Activity className="w-4 h-4"/> History of Previous Hospitalization
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.medicalHospitalizationChecked} onChange={(e) => setFormData({ ...formData, medicalHospitalizationChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Medical (Last Admission & Cause):
                      </label>
                      <input type="text" placeholder="Details..." value={formData.medicalHospitalizationSpecified} onChange={(e) => setFormData({ ...formData, medicalHospitalizationSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.surgicalChecked} onChange={(e) => setFormData({ ...formData, surgicalChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Surgical (Post-Operative):
                      </label>
                      <input type="text" placeholder="Details..." value={formData.surgicalSpecified} onChange={(e) => setFormData({ ...formData, surgicalSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.bloodTransfusionChecked} onChange={(e) => setFormData({ ...formData, bloodTransfusionChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Blood Transfusion (Month & Year):
                      </label>
                      <input type="text" placeholder="Details..." value={formData.bloodTransfusionSpecified} onChange={(e) => setFormData({ ...formData, bloodTransfusionSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.tattooChecked} onChange={(e) => setFormData({ ...formData, tattooChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Tattoo:
                      </label>
                      <input type="text" placeholder="Details..." value={formData.tattooSpecified} onChange={(e) => setFormData({ ...formData, tattooSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.othersChecked} onChange={(e) => setFormData({ ...formData, othersChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Others (Please specify):
                      </label>
                      <input type="text" placeholder="Details..." value={formData.othersSpecified} onChange={(e) => setFormData({ ...formData, othersSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Dietary Habits / Social History */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 border-b border-slate-800/80 pb-1">
                    <Utensils className="w-4 h-4"/> Dietary Habits / Social History
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.sugarBeveragesChecked} onChange={(e) => setFormData({ ...formData, sugarBeveragesChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Sugar Beverages/Food:
                      </label>
                      <input type="text" placeholder="Amount, Frequency & Duration..." value={formData.sugarBeveragesSpecified} onChange={(e) => setFormData({ ...formData, sugarBeveragesSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.useAlcoholChecked} onChange={(e) => setFormData({ ...formData, useAlcoholChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Use of Alcohol:
                      </label>
                      <input type="text" placeholder="Amount, Frequency & Duration..." value={formData.useAlcoholSpecified} onChange={(e) => setFormData({ ...formData, useAlcoholSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.useTobaccoChecked} onChange={(e) => setFormData({ ...formData, useTobaccoChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Use of Tobacco:
                      </label>
                      <input type="text" placeholder="Amount, Frequency & Duration..." value={formData.useTobaccoSpecified} onChange={(e) => setFormData({ ...formData, useTobaccoSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.betelNutChecked} onChange={(e) => setFormData({ ...formData, betelNutChecked: e.target.checked })} className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
                        Betel Nut Chewing:
                      </label>
                      <input type="text" placeholder="Amount, Frequency & Duration..." value={formData.betelNutSpecified} onChange={(e) => setFormData({ ...formData, betelNutSpecified: e.target.value })} className="col-span-2 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-slate-100 text-xs font-mono text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Interactive Multi-Visit Oral Health Condition Chart */}
                <DentalChart visits={visits} setVisits={setVisits} />
				
				{/* Interactive 2-Column Summary Block (Section A & B) */}
				<OralHealthConditionSummary
				  visits={visits}
				  isEditable={true}
				/>
				
				{/* Services Monitoring Chart (Paired Stacked Tooth Boxes) */}
				<ServicesMonitoringChart
				  data={servicesData}
				  onChange={setServicesData}
				  isEditable={true}
				/>
				
				{/* 👈 PLACE THE NEW COMPONENT HERE */}
				<RecordOfServicesRendered
				  rows={renderedServices}
				  onChange={setRenderedServices}
				  isEditable={true}
				/>
				
              </div>

              <div className="pt-4 border-t border-slate-800">
                {savedSuccess && (
                  <p className="text-xs text-emerald-400 text-center mb-2 font-medium">
                    ✓ Record successfully committed to Dental EHR Database!
                  </p>
                )}
                
                <button 
                  onClick={handleSaveDatabase}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50"
                >
                  <CheckCircle className="w-5 h-5"/> Confirm & Push Record to Database
                </button>
              </div>
            </section>
          </div>
        ) : (
          /* Records Registry View Tab */
          <RecordsRetrievalTab />
        )}
      </main>
	  
	  {/* Mobile QR Code Modal */}
      <MobileConnectModal 
        isOpen={isQrOpen} 
        onClose={() => setIsQrOpen(false)} 
      />
	  
	  {/* Webcam Modal Component */}
      <WebcamCaptureModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={(capturedFile, previewUrl) => {
          setFile(capturedFile);
          setImagePreview(previewUrl);
          setSavedSuccess(false);
        }}
      />
    </div>
  );
}