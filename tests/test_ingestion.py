from aegis_net.ingestion.parser import parse_array_string, normalize_capabilities


def test_parse_array_string_handles_json():
    assert parse_array_string('["a","b","c"]') == ["a", "b", "c"]


def test_parse_array_string_handles_python_repr():
    assert parse_array_string("['x', 'y']") == ["x", "y"]


def test_parse_array_string_handles_garbage():
    assert parse_array_string("nan") == []
    assert parse_array_string(None) == []
    assert parse_array_string("") == []


def test_normalize_capabilities_recognises_icu():
    tags = normalize_capabilities(["Has 12-bed ICU with ventilators", "CT scanner available"])
    assert "icu" in tags
    assert "imaging_ct" in tags


def test_normalize_capabilities_recognises_robotic():
    tags = normalize_capabilities(["MAKO Robotic knee replacement"])
    assert "robotic_surgery" in tags
    assert "orthopedics" in tags
