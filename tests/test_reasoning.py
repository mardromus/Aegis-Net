from aegis_net.reasoning.chain_of_verification import ChainOfVerification
from aegis_net.reasoning.confidence import fused_confidence


def test_cov_keeps_grounded_capability_and_drops_phantom():
    cov = ChainOfVerification()
    src = (
        "Apex Heart Hospital. 200-bed multi-specialty facility with cardiac catheterization "
        "lab, 24x7 ICU, and modular operation theaters. Performs CABG and angioplasty. "
        "Equipped with MRI scanner and CT scanner."
    )
    out = cov.run(facility_id="T", name="Apex Heart Hospital", source=src)
    final = set(out.final_capabilities)
    # capabilities mentioned literally should survive
    assert any("icu" in c.lower() for c in final)
    assert any("cardi" in c.lower() for c in final)
    # phantom: dental should NOT appear (not in source) and isn't in baseline either
    assert not any("dental" in c.lower() for c in final)


def test_fused_confidence_is_high_for_supported_claim():
    src = "ICU available with ventilators, multi-parameter monitors, and defibrillator"
    out = fused_confidence(claim="icu", source=src)
    assert 0.5 <= out["fused"] <= 1.0


def test_fused_confidence_is_low_for_unsupported_claim():
    src = "Small dental clinic offering root canal therapy and laser dentistry."
    out = fused_confidence(claim="robotic surgery", source=src)
    assert out["fused"] < 0.7
