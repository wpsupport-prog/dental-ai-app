from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from database import Base

class PatientRecord(Base):
    __tablename__ = "patient_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Demographics
    surname = Column(String, index=True, nullable=True)
    first_name = Column(String, index=True, nullable=True)
    middle_initial = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    age = Column(String, nullable=True)
    sex = Column(String, nullable=True)
    civil_status = Column(String, nullable=True)
    place_of_birth = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    occupation = Column(String, nullable=True)
    parent_guardian = Column(String, nullable=True)
    philhealth_no = Column(String, nullable=True)
    yakap_provider = Column(String, nullable=True)
    contact_no = Column(String, nullable=True)
    signed_name = Column(String, nullable=True)

    # Vital Signs
    blood_pressure = Column(String, nullable=True)
    pulse_rate = Column(String, nullable=True)
    temperature = Column(String, nullable=True)
    height = Column(String, nullable=True)
    weight = Column(String, nullable=True)

    # Memberships
    nhts_pr = Column(Boolean, default=False)
    four_ps = Column(Boolean, default=False)
    indigenous_people = Column(Boolean, default=False)
    pwds = Column(Boolean, default=False)

    # Medical History Details
    allergies_checked = Column(Boolean, default=False)
    allergies_specified = Column(Text, nullable=True)
    hypertension_cva = Column(Boolean, default=False)
    diabetes_mellitus = Column(Boolean, default=False)
    blood_disorder = Column(Boolean, default=False)
    cardiovascular_heart_diseases = Column(Boolean, default=False)
    thyroid_disorders = Column(Boolean, default=False)
    hepatitis_checked = Column(Boolean, default=False)
    hepatitis_specified = Column(Text, nullable=True)
    malignancy_checked = Column(Boolean, default=False)
    malignancy_specified = Column(Text, nullable=True)

    # Hospitalization Details
    medical_hospitalization_checked = Column(Boolean, default=False)
    medical_hospitalization_specified = Column(Text, nullable=True)
    surgical_checked = Column(Boolean, default=False)
    surgical_specified = Column(Text, nullable=True)
    blood_transfusion_checked = Column(Boolean, default=False)
    blood_transfusion_specified = Column(Text, nullable=True)
    tattoo_checked = Column(Boolean, default=False)
    tattoo_specified = Column(Text, nullable=True)
    others_checked = Column(Boolean, default=False)
    others_specified = Column(Text, nullable=True)

    # Dietary Habits / Social History
    sugar_beverages_checked = Column(Boolean, default=False)
    sugar_beverages_specified = Column(Text, nullable=True)
    use_alcohol_checked = Column(Boolean, default=False)
    use_alcohol_specified = Column(Text, nullable=True)
    use_tobacco_checked = Column(Boolean, default=False)
    use_tobacco_specified = Column(Text, nullable=True)
    betel_nut_checked = Column(Boolean, default=False)
    betel_nut_specified = Column(Text, nullable=True)

    # Oral Health Condition Chart Logs (Group of Visits & Tooth Markings)
    dental_chart = Column(JSON, nullable=True)
    
    # Services Monitoring Chart Data Dictionary
    services_monitoring = Column(JSON, nullable=True)
    
    # Record of Services Rendered (Individual Patient Treatment Log Rows)
    record_of_services_rendered = Column(JSON, nullable=True, default=[])

    # Section A - Oral Health Conditions
    oh_orally_fit_child = Column(String, nullable=True)
    oh_dental_caries = Column(String, nullable=True)
    oh_gingivitis = Column(String, nullable=True)
    oh_periodontal_disease = Column(String, nullable=True)
    oh_debris = Column(String, nullable=True)
    oh_calculus = Column(String, nullable=True)
    oh_abnormal_growth = Column(String, nullable=True)
    oh_cleft_lip_palate = Column(String, nullable=True)
    oh_others = Column(String, nullable=True)

    # Section B - Indicate Numbers (Tooth Counts)
    oh_perm_present = Column(Integer, nullable=True)
    oh_perm_sound = Column(Integer, nullable=True)
    oh_perm_decayed = Column(Integer, nullable=True)
    oh_perm_missing = Column(Integer, nullable=True)
    oh_perm_filled = Column(Integer, nullable=True)
    oh_total_dmf = Column(Integer, nullable=True)
    oh_temp_present = Column(Integer, nullable=True)
    oh_temp_sound = Column(Integer, nullable=True)
    oh_temp_decayed = Column(Integer, nullable=True)
    oh_temp_filled = Column(Integer, nullable=True)
    oh_total_teeth = Column(Integer, nullable=True)