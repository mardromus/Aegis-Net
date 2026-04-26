"""Curated medical-infrastructure knowledge corpus used to ground the agents.

In production this would be ingested into Mosaic AI Vector Search from
authoritative PDFs (WHO Surgical Safety Checklist, NABH ICU/OT manuals,
DCGI licensing). For local/offline mode we ship a high-quality summary so
the RAG layer always has something credible to retrieve.
"""
from __future__ import annotations

MEDICAL_CORPUS: list[dict[str, str]] = [
    {
        "id": "who_sssc_v2",
        "title": "WHO Surgical Safety Checklist v2",
        "source": "World Health Organization",
        "text": (
            "Before induction of anaesthesia the team must confirm patient identity, surgical "
            "site, and procedure; verify that the anaesthesia machine and medication check is "
            "complete; and that the pulse oximeter is on the patient and functioning. Before "
            "skin incision the team confirms all members have introduced themselves, antibiotic "
            "prophylaxis has been given within the last 60 minutes, and essential imaging is "
            "displayed. Before the patient leaves the operating room, instrument, sponge and "
            "needle counts are correct, the specimen is labelled, and any equipment problems "
            "are addressed."
        ),
    },
    {
        "id": "nabh_icu_2020",
        "title": "NABH ICU Infrastructure Standards (2020)",
        "source": "National Accreditation Board for Hospitals (India)",
        "text": (
            "An accredited Intensive Care Unit must be located in close proximity to the "
            "Operating Theatre and Emergency Department. Each ICU bed requires a minimum of "
            "100-150 sq.ft of floor area, two oxygen outlets, two air outlets, two suction "
            "outlets and at least six 16A power points connected to UPS. Mandatory equipment "
            "per bed includes a multi-parameter monitor, mechanical ventilator, infusion pumps "
            "and access to a defibrillator and crash cart within 30 seconds. Isolation rooms "
            "with negative pressure are required for infectious cases. ICUs must have a 1:1 "
            "nursing ratio for ventilated patients."
        ),
    },
    {
        "id": "nabh_ot_2022",
        "title": "NABH Operating Theatre Standards (2022)",
        "source": "National Accreditation Board for Hospitals (India)",
        "text": (
            "Operating theatres must have HEPA-filtered laminar airflow, temperature 18-22°C, "
            "humidity 30-60%, positive pressure differential. Mandatory equipment: anaesthesia "
            "workstation with vapouriser and ventilator, multi-parameter monitor, defibrillator, "
            "electrocautery, suction apparatus, surgical lights >100,000 lux, autoclave for "
            "instrument sterilisation and a recovery bay. For orthopaedic/trauma cases a C-arm "
            "image intensifier and tourniquet are mandatory. For neurosurgery an operating "
            "microscope and dedicated neuro-ICU step-down are mandatory."
        ),
    },
    {
        "id": "iscm_dialysis",
        "title": "ISN Dialysis Unit Guidelines",
        "source": "Indian Society of Nephrology",
        "text": (
            "A dialysis unit requires a dedicated reverse-osmosis water treatment plant meeting "
            "AAMI/ISO 13959 standards, dialysis machines with conductivity and temperature "
            "alarms, a hepatitis-positive isolation room, a trained nephrology nurse for every "
            "four stations and immediate access to emergency cardiac care."
        ),
    },
    {
        "id": "who_safe_childbirth",
        "title": "WHO Safe Childbirth Checklist",
        "source": "World Health Organization",
        "text": (
            "Every birthing facility must verify availability of oxytocin, magnesium sulphate, "
            "antibiotics, calcium gluconate; a clean delivery kit with sterile blade, cord ties "
            "and clean cloth; a functional fetal heart monitor; resuscitation equipment "
            "including bag-and-mask for the newborn; and the ability to perform an emergency "
            "caesarean section within 30 minutes either in-house or via a referral pathway."
        ),
    },
    {
        "id": "who_emergency_trauma",
        "title": "WHO Emergency & Trauma Care Standards",
        "source": "World Health Organization",
        "text": (
            "A Level-1 trauma centre provides 24x7 in-house trauma surgery, neurosurgery, "
            "orthopaedic surgery, anaesthesiology and emergency medicine, with immediate "
            "availability of CT, X-ray, ultrasound (FAST), blood bank with massive transfusion "
            "protocol, and an operating theatre that can be activated within 15 minutes."
        ),
    },
    {
        "id": "aerb_imaging",
        "title": "AERB Diagnostic Imaging Safety",
        "source": "Atomic Energy Regulatory Board (India)",
        "text": (
            "Installation of CT and MRI scanners requires AERB / institutional approval, lead "
            "shielding for CT rooms, RF-shielded faraday cage for MRI suites, and a qualified "
            "radiologist or radiology technologist on duty. Pediatric MRI under sedation "
            "requires anaesthesia support and resuscitation equipment in the suite."
        ),
    },
    {
        "id": "icmr_oncology",
        "title": "WHO/ICMR Cancer Control Programme",
        "source": "Indian Council of Medical Research",
        "text": (
            "A comprehensive oncology centre offers screening, diagnosis (pathology and "
            "imaging), surgery, radiotherapy with linear accelerator, chemotherapy day-care, "
            "palliative care, tumour board review and survivorship clinics. Minimum staffing "
            "includes one medical oncologist, one radiation oncologist and one surgical "
            "oncologist with credentialled oncology nurses."
        ),
    },
    {
        "id": "who_air_quality_or",
        "title": "WHO Operating Room Air Quality",
        "source": "World Health Organization",
        "text": (
            "Operating rooms must maintain at least 20 air changes per hour with HEPA "
            "filtration, positive pressure relative to adjacent corridors, and continuous "
            "monitoring of temperature and humidity. Ultraclean (laminar) operating rooms are "
            "recommended for joint replacement and neurosurgery procedures."
        ),
    },
    {
        "id": "iso_blood_bank",
        "title": "DCGI Blood Bank Licensing Conditions",
        "source": "Drugs Controller General of India",
        "text": (
            "A licensed blood bank must operate under a registered medical officer, employ "
            "trained technicians, maintain blood-bag refrigerators with continuous temperature "
            "monitoring (2-6°C), platelet agitator-incubator, plasma freezer at -30°C and "
            "comply with screening for HIV, HBV, HCV, syphilis and malaria for every unit."
        ),
    },
]
