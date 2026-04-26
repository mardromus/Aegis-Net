from aegis_net.trust.trust_scorer import TrustScorer


def test_trust_flags_advanced_surgery_without_anesthesiologist():
    scorer = TrustScorer()
    facility = {
        "facility_id": "X",
        "name": "Sketchy Hospital",
        "specialties": ["advanced surgery"],
        "procedure": ["robotic surgery"],
        "equipment": [],
        "capability": ["advanced surgery"],
        "description": "Performs advanced robotic surgery",
        "evidence_text": "advanced surgery robotic procedure offered",
    }
    audit = {"audit_findings": [], "summary": {"compliant": 0, "flagged": 0, "critical_gaps": 0, "tags_audited": 0, "compliance_index": 0.0}}
    evaluation = {"scores": []}
    result = scorer.score(facility=facility, capabilities=["advanced surgery", "robotic_surgery"], audit=audit, evaluation=evaluation)
    rules = {c["rule"] for c in result["contradictions"]}
    assert "advanced surgery" in rules or "robotic" in rules


def test_trust_band_high_when_clean():
    scorer = TrustScorer()
    facility = {
        "facility_id": "Y",
        "name": "Clean",
        "specialties": ["dental"],
        "procedure": ["root canal"],
        "equipment": ["dental chair", "autoclave"],
        "capability": ["dental"],
        "description": "Modern dental clinic with chair and autoclave",
        "phone_numbers": ["+91"],
        "websites": ["x.com"],
        "evidence_text": "dental chair autoclave root canal therapy clean",
    }
    audit = {"audit_findings": [{"capability": "dental", "status": "COMPLIANT", "missing_critical": [], "missing_recommended": [], "reference": "DCI", "retrieved_evidence": []}], "summary": {"compliant": 1, "flagged": 0, "critical_gaps": 0, "tags_audited": 1, "compliance_index": 1.0}}
    evaluation = {"scores": [{"capability": "dental", "fused": 0.95, "p_true_mean": 0.95, "p_true_std": 0.02, "consistency": 0.96, "samples": [0.95, 0.96, 0.94], "quarantined": False}]}
    result = scorer.score(facility=facility, capabilities=["dental"], audit=audit, evaluation=evaluation)
    assert result["band"] in {"HIGH_TRUST", "MEDIUM_TRUST"}
    assert result["trust_score"] > 0.6
