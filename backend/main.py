import os
import time
import base64
import asyncio
import json
import subprocess
import sys
import shutil
import socket
from contextlib import asynccontextmanager
from typing import Optional, List

import httpx
import cv2
import numpy as np
from openai import AsyncOpenAI

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Re-use centralized logger and engine from database module
from database import logger, get_db, async_engine, Base
from models import PatientRecord

def get_recommended_model() -> str:
    """Detects if a GPU is present to decide between 7b and 3b models."""
    try:
        res = subprocess.run(
            ["nvidia-smi"], 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )
        if res.returncode == 0:
            return "qwen2.5vl:7b"
    except Exception:
        pass
        
    return "qwen2.5vl:3b"

def clear_sync_state():
    """Wipes the mobile-to-desktop sync JSON file and resets in-memory buffer."""
    global LATEST_SYNCED_IMAGE
    LATEST_SYNCED_IMAGE = {"url": None, "filename": None, "timestamp": 0}
    if os.path.exists(SYNC_STATE_FILE):
        try:
            os.remove(SYNC_STATE_FILE)
        except Exception as e:
            logger.error(f"Error clearing sync state file: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    clear_sync_state()
    
    # Start Ollama sidecar service on startup
    start_ollama_sidecar()
    
    # 1. ALWAYS CREATE SQLITE DB & TABLES IMMEDIATELY ON BOOT
    try:
        logger.info("Initializing database tables...")
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("SQLite DB Initialized cleanly.")
    except Exception as db_err:
        logger.error(f"CRITICAL: Failed to initialize DB tables: {db_err}")

    # 2. Check and Auto-Pull Ollama Vision Model Weights
    target_model = get_recommended_model() 
    logger.info(f"Detected hardware. Selected target model: {target_model}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            res = await client.get("http://localhost:11434/api/tags")
            if res.status_code == 200:
                installed_models = [m.get("name") for m in res.json().get("models", [])]
                model_exists = any(target_model in m for m in installed_models)
                
                if not model_exists:
                    logger.info(f"Model '{target_model}' not found in Ollama. Downloading...")
                    await client.post(
                        "http://localhost:11434/api/pull",
                        json={"name": target_model, "stream": False},
                        timeout=600.0
                    )
                    logger.info(f"Successfully loaded {target_model} weights into Ollama.")
                else:
                    logger.info(f"Ollama Vision Model '{target_model}' is ready.")
        except Exception as e:
            logger.warning(f"Ollama startup check warning: {e}")

    yield

    clear_sync_state()
    logger.info("Shutting down backend...")

def start_ollama_sidecar():
    try:
        if getattr(sys, 'frozen', False):
            base_dir = os.path.dirname(sys.executable)
            ollama_bin = os.path.join(base_dir, "ollama.exe")
        else:
            ollama_bin = "ollama"

        subprocess.Popen(
            [ollama_bin, "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )
    except Exception as e:
        logger.info(f"Ollama startup note: {e}")

app = FastAPI(
    title="Dental AI API",
    description="Intelligent Intake Form Extraction API for Dental Systems",
    version="1.0.0",
    lifespan=lifespan
)

@app.post("/api/v1/sync/clear")
async def clear_remote_scan():
    clear_sync_state()
    return {"status": "success", "message": "Sync state cleared"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_resource_path(relative_path: str) -> str:
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

def get_user_data_dir() -> str:
    appdata = os.getenv('LOCALAPPDATA') or os.path.expanduser('~')
    data_dir = os.path.join(appdata, "DentalAISuite")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir

APP_DATA_DIR = get_user_data_dir()
UPLOADS_TEMP_DIR = os.path.join(APP_DATA_DIR, "uploads", "temp")
os.makedirs(UPLOADS_TEMP_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=UPLOADS_TEMP_DIR), name="static")

LATEST_SYNCED_IMAGE = {"url": None, "filename": None, "timestamp": 0}
SYNC_STATE_FILE = os.path.join(UPLOADS_TEMP_DIR, "sync_state.json")

openai_client = AsyncOpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

# Pydantic Schemas
class PatientInfo(BaseModel):
    surname: Optional[str] = None
    first_name: Optional[str] = None
    middle_initial: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[str] = None
    sex: Optional[str] = None
    civil_status: Optional[str] = None
    place_of_birth: Optional[str] = None
    address: Optional[str] = None
    occupation: Optional[str] = None
    parent_guardian: Optional[str] = None
    philhealth_no: Optional[str] = None
    yakap_provider: Optional[str] = None
    contact_no: Optional[str] = None
    signed_name: Optional[str] = None

class VitalSigns(BaseModel):
    blood_pressure: Optional[str] = None
    pulse_rate: Optional[str] = None
    temperature: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None

class Memberships(BaseModel):
    nhts_pr: bool = False
    four_ps: bool = False
    indigenous_people: bool = False
    pwds: bool = False

class MedicalHistory(BaseModel):
    allergies_checked: bool = False
    allergies_specified: Optional[str] = None
    hypertension_cva: bool = False
    diabetes_mellitus: bool = False
    blood_disorder: bool = False
    cardiovascular_heart_diseases: bool = False
    thyroid_disorders: bool = False
    hepatitis_checked: bool = False
    hepatitis_specified: Optional[str] = None
    malignancy_checked: bool = False
    malignancy_specified: Optional[str] = None
    medical_hospitalization_checked: bool = False
    medical_hospitalization_specified: Optional[str] = None
    surgical_checked: bool = False
    surgical_specified: Optional[str] = None
    blood_transfusion_checked: bool = False
    blood_transfusion_specified: Optional[str] = None
    tattoo_checked: bool = False
    tattoo_specified: Optional[str] = None
    others_checked: bool = False
    others_specified: Optional[str] = None

class SocialHistory(BaseModel):
    sugar_beverages_checked: bool = False
    sugar_beverages_specified: Optional[str] = None
    use_alcohol_checked: bool = False
    use_alcohol_specified: Optional[str] = None
    use_tobacco_checked: bool = False
    use_tobacco_specified: Optional[str] = None
    betel_nut_checked: bool = False
    betel_nut_specified: Optional[str] = None

class ExtractionResponse(BaseModel):
    document_id: str
    confidence_score: float
    requires_review: bool
    patient_info: PatientInfo
    vital_signs: VitalSigns
    memberships: Memberships
    medical_history: MedicalHistory
    social_history: SocialHistory
    dental_chart: Optional[List[dict]] = []
    # 🔑 ADD THIS FIELD:
    record_of_services_rendered: Optional[List[dict]] = []

def preprocess_mobile_image(image_bytes: bytes) -> bytes:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return image_bytes
        
    h, w = img.shape[:2]
    max_dim = 1600
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl,a,b))
    enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    
    _, encoded_img = cv2.imencode('.jpg', enhanced, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    return encoded_img.tobytes()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        ip_list = socket.gethostbyname_ex(hostname)[2]
        for ip in ip_list:
            if not ip.startswith("127.") and not ip.startswith("169.254."):
                return ip
    except Exception:
        pass

    return "127.0.0.1"

@app.get("/api/v1/system/ip")
async def get_system_ip():
    local_ip = get_local_ip()
    return {
        "ip": local_ip,
        "scan_url": f"http://{local_ip}:8000/scan"
    }

@app.get("/")
def read_root():
    return {"status": "Backend running successfully"}

@app.post("/api/v1/sync/upload")
async def upload_remote_scan(file: UploadFile = File(...)):
    temp_filename = f"scan_{int(time.time())}_{file.filename}"
    temp_path = os.path.join(UPLOADS_TEMP_DIR, temp_filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/static/{temp_filename}"
    sync_data = {
        "url": image_url,
        "filename": file.filename,
        "timestamp": time.time()
    }

    with open(SYNC_STATE_FILE, "w") as f:
        json.dump(sync_data, f)

    return {"status": "success", "data": sync_data}

@app.get("/api/v1/sync/latest")
async def get_latest_remote_scan(request: Request):
    default_response = {"url": None, "filename": None, "timestamp": 0}

    if not os.path.exists(SYNC_STATE_FILE):
        return default_response

    try:
        with open(SYNC_STATE_FILE, "r") as f:
            data = json.load(f)

        url = data.get("url")
        if url and not url.startswith(("http://", "https://")):
            base_url = str(request.base_url).rstrip("/")
            path = url if url.startswith("/") else f"/{url}"
            data["url"] = f"{base_url}{path}"

        return data
    except Exception as e:
        logger.error(f"Error reading sync state: {e}", exc_info=True)
        return default_response

@app.get("/scan", response_class=HTMLResponse)
async def serve_mobile_scanner():
    html_path = get_resource_path("mobile.html")
    if not os.path.exists(html_path):
        return HTMLResponse("<h3>Mobile scanner template (mobile.html) missing.</h3>", status_code=404)
    with open(html_path, "r", encoding="utf-8") as f:
        return f.read()

@app.post("/api/v1/forms/upload", response_model=ExtractionResponse)
async def upload_dental_form(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Invalid file format.")

    file_bytes = await file.read()

    # Preprocess mobile scans AND webcam photos with CLAHE contrast enhancement
    processed_bytes = (
        preprocess_mobile_image(file_bytes) 
        if file.content_type in ["image/jpeg", "image/png"] 
        else file_bytes
    )

    if openai_client:
        try:
            base64_image = base64.b64encode(processed_bytes).decode('utf-8')
            
            prompt = """
You are a high-precision OCR vision AI for medical intake documents. Your primary goal is exact transcription of handwritten text.

STRICT NO-HALLUCINATION & NO-EXAMPLE RULES (CRITICAL):
- DO NOT COPY OR USE EXAMPLE DATA.
- Extract ONLY what is handwritten on the provided document image.
- If a line or field is blank, missing, unreadable, smudged, or absent, ALWAYS return `null` for text fields and `false` for boolean checkboxes.
- NEVER invent, predict, or guess phone numbers, names, addresses, dates, or numbers.

PRECISION TRANSCRIBING RULES:
1. TOP NAME BLOCK & DEMOGRAPHICS:
   - Surname: Exact handwritten text on/above the Surname line. Return `null` if empty.
   - First Name: Exact handwritten text on/above the First Name line. Return `null` if empty.
   - Middle Name: Exact handwritten text on/above Middle Name line. Return `null` if empty.
   - Date of Birth: Exact handwritten text on Date of Birth line. Return `null` if empty.
   - Age: Exact numeric digits handwritten beside "Age:". Return `null` if empty.
   - Sex: Gender code handwritten beside "Sex:" ("M" or "F"). Return `null` if empty.

2. OTHER PERSONAL DETAILS:
   - Place of Birth: Exact handwritten text on Place of Birth line. Return `null` if empty.
   - Address: Exact handwritten text on Address line. Return `null` if empty.
   - Parent/Guardian: Exact handwritten text on Parent/Guardian line. Return `null` if empty.
   - Contact Number (CP NO): Exact handwritten numbers written on CP NO line. Return `null` if empty or unwritten.
   - Signed Patient/Guardian: Exact handwritten signature text. Return `null` if empty.

3. VITAL SIGNS READINGS:
   - Blood Pressure: Exact reading written on "Blood Pressure:" line. Return `null` if empty.
   - Pulse Rate: Exact reading written on "Pulse Rate:" line. Return `null` if empty.
   - Temperature: Exact reading written on "Temperature:" line. Return `null` if empty.
   - Height (HT): Exact reading written next to "HT:". Return `null` if empty.
   - Weight (WT): Exact reading written next to "WT:". Return `null` if empty.

4. CHECKBOXES & MARKS ('✓' and 'X'):
   - Return `true` ONLY if a handwritten mark ('✓', '/', or 'X') is clearly visible in the box.
   - If the box is empty, faint, or unmarked, evaluate STRICTLY as `false`.

RETURN RAW STRICT JSON MATCHING THIS EXACT SCHEMA:
{
  "patient_info": {
    "surname": null,
    "first_name": null,
    "middle_initial": null,
    "dob": null,
    "age": null,
    "sex": null,
    "civil_status": null,
    "place_of_birth": null,
    "address": null,
    "occupation": null,
    "parent_guardian": null,
    "philhealth_no": null,
    "yakap_provider": null,
    "contact_no": null,
    "signed_name": null
  },
  "vital_signs": {
    "blood_pressure": null,
    "pulse_rate": null,
    "temperature": null,
    "height": null,
    "weight": null
  },
  "memberships": {
    "nhts_pr": false,
    "four_ps": false,
    "indigenous_people": false,
    "pwds": false
  },
  "medical_history": {
    "allergies_checked": false,
    "allergies_specified": null,
    "hypertension_cva": false,
    "diabetes_mellitus": false,
    "blood_disorder": false,
    "cardiovascular_heart_diseases": false,
    "thyroid_disorders": false,
    "hepatitis_checked": false,
    "hepatitis_specified": null,
    "malignancy_checked": false,
    "malignancy_specified": null,
    "medical_hospitalization_checked": false,
    "medical_hospitalization_specified": null,
    "surgical_checked": false,
    "surgical_specified": null,
    "blood_transfusion_checked": false,
    "blood_transfusion_specified": null,
    "tattoo_checked": false,
    "tattoo_specified": null,
    "others_checked": false,
    "others_specified": null
  },
  "social_history": {
    "sugar_beverages_checked": false,
    "sugar_beverages_specified": null,
    "use_alcohol_checked": false,
    "use_alcohol_specified": null,
    "use_tobacco_checked": false,
    "use_tobacco_specified": null,
    "betel_nut_checked": false,
    "betel_nut_specified": null
  }
}
"""
            
            # Send enhanced webcam scan image to Ollama Vision Model
            selected_model = get_recommended_model()
            
            response = await openai_client.chat.completions.create(
                model=selected_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                            }
                        ]
                    }
                ],
                temperature=0.0,
                response_format={"type": "json_object"},
                extra_body={"options": {"num_ctx": 8192}},
                timeout=180.0
            )

            content = response.choices[0].message.content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]

            data = json.loads(content.strip())

            patient_dict = data.get("patient_info", {}) if isinstance(data.get("patient_info"), dict) else {}
            vitals_dict = data.get("vital_signs", {}) if isinstance(data.get("vital_signs"), dict) else {}
            mems_dict = data.get("memberships", {}) if isinstance(data.get("memberships"), dict) else {}
            med_dict = data.get("medical_history", {}) if isinstance(data.get("medical_history"), dict) else {}
            social_dict = data.get("social_history", {}) if isinstance(data.get("social_history"), dict) else {}

            # Convert numerical values safely into strings
            for k, v in patient_dict.items():
                if v is not None and not isinstance(v, str):
                    patient_dict[k] = str(v)

            for k, v in vitals_dict.items():
                if v is not None and not isinstance(v, str):
                    vitals_dict[k] = str(v)

            return ExtractionResponse(
                document_id=f"doc_{int(time.time())}",
                confidence_score=0.98,
                requires_review=False,
                patient_info=PatientInfo(**patient_dict),
                vital_signs=VitalSigns(**vitals_dict),
                memberships=Memberships(**mems_dict),
                medical_history=MedicalHistory(**med_dict),
                social_history=SocialHistory(**social_dict)
            )

        except Exception as e:
            logger.error("AI Extraction Failed", exc_info=True)

    # Fallback response for unreadable / blank scans
    await asyncio.sleep(0.5)
    return ExtractionResponse(
        document_id=f"doc_{int(time.time())}",
        confidence_score=0.0,
        requires_review=True,
        patient_info=PatientInfo(),
        vital_signs=VitalSigns(),
        memberships=Memberships(),
        medical_history=MedicalHistory(),
        social_history=SocialHistory()
    )

@app.post("/api/v1/forms/save")
async def save_patient_record(payload: dict, db: AsyncSession = Depends(get_db)):
    try:
        info = payload.get("patient_info", {})
        vitals = payload.get("vital_signs", {})
        mems = payload.get("memberships", {})
        med = payload.get("medical_history", {})
        social = payload.get("social_history", {})
        dental_chart = payload.get("dental_chart", [])
        
        oh_summary = payload.get("oral_health_summary", {})
        oh_section_a = oh_summary.get("section_a", {})
        oh_section_b = oh_summary.get("section_b", {})
        services_monitoring = payload.get("services_monitoring", [])
        
        # 🔑 1. EXTRACT RECORD OF SERVICES RENDERED FROM PAYLOAD
        record_of_services_rendered = payload.get("record_of_services_rendered", [])
        
        db_record = PatientRecord(
            document_id=payload.get("document_id", f"doc_{int(time.time())}"),
            surname=info.get("surname"),
            first_name=info.get("first_name"),
            middle_initial=info.get("middle_initial"),
            dob=info.get("dob"),
            age=info.get("age"),
            sex=info.get("sex"),
            civil_status=info.get("civil_status"),
            place_of_birth=info.get("place_of_birth"),
            address=info.get("address"),
            occupation=info.get("occupation"),
            parent_guardian=info.get("parent_guardian"),
            philhealth_no=info.get("philhealth_no"),
            yakap_provider=info.get("yakap_provider"),
            contact_no=info.get("contact_no"),
            signed_name=info.get("signed_name"),
            
            blood_pressure=vitals.get("blood_pressure"),
            pulse_rate=vitals.get("pulse_rate"),
            temperature=vitals.get("temperature"),
            height=vitals.get("height"),
            weight=vitals.get("weight"),
            
            nhts_pr=mems.get("nhts_pr", False),
            four_ps=mems.get("four_ps", False),
            indigenous_people=mems.get("indigenous_people", False),
            pwds=mems.get("pwds", False),
            
            allergies_checked=med.get("allergies_checked", False),
            allergies_specified=med.get("allergies_specified"),
            hypertension_cva=med.get("hypertension_cva", False),
            diabetes_mellitus=med.get("diabetes_mellitus", False),
            blood_disorder=med.get("blood_disorder", False),
            cardiovascular_heart_diseases=med.get("cardiovascular_heart_diseases", False),
            thyroid_disorders=med.get("thyroid_disorders", False),
            hepatitis_checked=med.get("hepatitis_checked", False),
            hepatitis_specified=med.get("hepatitis_specified"),
            malignancy_checked=med.get("malignancy_checked", False),
            malignancy_specified=med.get("malignancy_specified"),

            medical_hospitalization_checked=med.get("medical_hospitalization_checked", False),
            medical_hospitalization_specified=med.get("medical_hospitalization_specified"),
            surgical_checked=med.get("surgical_checked", False),
            surgical_specified=med.get("surgical_specified"),
            blood_transfusion_checked=med.get("blood_transfusion_checked", False),
            blood_transfusion_specified=med.get("blood_transfusion_specified"),
            tattoo_checked=med.get("tattoo_checked", False),
            tattoo_specified=med.get("tattoo_specified"),
            others_checked=med.get("others_checked", False),
            others_specified=med.get("others_specified"),

            sugar_beverages_checked=social.get("sugar_beverages_checked", False),
            sugar_beverages_specified=social.get("sugar_beverages_specified"),
            use_alcohol_checked=social.get("use_alcohol_checked", False),
            use_alcohol_specified=social.get("use_alcohol_specified"),
            use_tobacco_checked=social.get("use_tobacco_checked", False),
            use_tobacco_specified=social.get("use_tobacco_specified"),
            betel_nut_checked=social.get("betel_nut_checked", False),
            betel_nut_specified=social.get("betel_nut_specified"),
            
            oh_orally_fit_child=oh_section_a.get("orallyFitChild"),
            oh_dental_caries=oh_section_a.get("dentalCaries"),
            oh_gingivitis=oh_section_a.get("gingivitis"),
            oh_periodontal_disease=oh_section_a.get("periodontalDisease"),
            oh_debris=oh_section_a.get("debris"),
            oh_calculus=oh_section_a.get("calculus"),
            oh_abnormal_growth=oh_section_a.get("abnormalGrowth"),
            oh_cleft_lip_palate=oh_section_a.get("cleftLipPalate"),
            oh_others=oh_section_a.get("others"),

            oh_perm_present=oh_section_b.get("permPresent"),
            oh_perm_sound=oh_section_b.get("permSound"),
            oh_perm_decayed=oh_section_b.get("permDecayed"),
            oh_perm_missing=oh_section_b.get("permMissing"),
            oh_perm_filled=oh_section_b.get("permFilled"),
            oh_total_dmf=oh_section_b.get("totalDMF"),
            oh_temp_present=oh_section_b.get("tempPresent"),
            oh_temp_sound=oh_section_b.get("tempSound"),
            oh_temp_decayed=oh_section_b.get("tempDecayed"),
            oh_temp_filled=oh_section_b.get("tempFilled"),
            oh_total_teeth=oh_section_b.get("totalTeeth"),

            dental_chart=dental_chart,
            services_monitoring=services_monitoring,
            # 🔑 2. SAVE TO SQLITE DATABASE RECORD
            record_of_services_rendered=record_of_services_rendered,
        )

        db.add(db_record)
        await db.commit()
        await db.refresh(db_record)

        return {"status": "success", "db_id": db_record.id, "document_id": db_record.document_id}

    except Exception as e:
        logger.error("CRITICAL SAVE ERROR", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"DB Error: {type(e).__name__} - {str(e)}"
        )

@app.get("/api/v1/forms/records")
async def get_patient_records(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PatientRecord).order_by(PatientRecord.id.desc()).limit(50))
    return result.scalars().all()

@app.put("/api/v1/forms/records/{record_id}")
async def update_patient_record(record_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(PatientRecord).where(PatientRecord.id == record_id))
        db_record = result.scalars().first()

        if not db_record:
            raise HTTPException(status_code=404, detail="Patient record not found")

        ignored_keys = {"id", "document_id", "created_at", "updated_at"}
        for key, value in payload.items():
            if key not in ignored_keys and hasattr(db_record, key):
                setattr(db_record, key, value)

        await db.commit()
        await db.refresh(db_record)

        return {"status": "success", "message": "Record updated successfully"}

    except Exception as e:
        logger.error(f"Error updating record {record_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")

@app.delete("/api/v1/forms/records/{record_id}")
async def delete_patient_record(record_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(PatientRecord).where(PatientRecord.id == record_id))
        db_record = result.scalars().first()

        if not db_record:
            raise HTTPException(status_code=404, detail="Patient record not found")

        await db.delete(db_record)
        await db.commit()

        return {"status": "success", "message": f"Record {record_id} deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting record {record_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database deletion failed: {str(e)}")

if __name__ == "__main__" or getattr(sys, 'frozen', False):
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info", use_colors=False)