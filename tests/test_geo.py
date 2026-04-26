import pandas as pd

from aegis_net.geo.h3_index import attach_h3, haversine_km
from aegis_net.geo.e2sfca import compute_e2sfca, demand_grid_from_facilities


def _toy_facilities():
    return pd.DataFrame(
        [
            {"facility_id": "A", "name": "A", "latitude": 19.07, "longitude": 72.87, "capacity": 100, "numberDoctors": 10, "raw_capability_tags": ["icu"]},
            {"facility_id": "B", "name": "B", "latitude": 19.20, "longitude": 72.85, "capacity": 50, "numberDoctors": 5, "raw_capability_tags": ["trauma"]},
            {"facility_id": "C", "name": "C", "latitude": 28.61, "longitude": 77.21, "capacity": 200, "numberDoctors": 20, "raw_capability_tags": ["icu", "trauma"]},
        ]
    )


def test_haversine_distances_are_reasonable():
    d = haversine_km(19.07, 72.87, 28.61, 77.21)
    assert 1100 < d < 1200


def test_attach_h3_works():
    df = attach_h3(_toy_facilities())
    assert df["h3_index"].notna().all()


def test_e2sfca_marks_isolated_hexagon_as_desert():
    f = _toy_facilities()
    f = attach_h3(f)
    demand = demand_grid_from_facilities(f)
    res = compute_e2sfca(facilities=f, demand=demand, capability="icu")
    assert "accessibility" in res
    assert "facility_supply" in res
    assert res["capability"] == "icu"
    df = pd.DataFrame(res["accessibility"])
    assert "desert" in df.columns
    assert "h3_index" in df.columns
    # The Delhi hexagon is far from Mumbai; at least one of these should
    # register as desert because it has only one provider in its catchment.
    assert df["desert"].any()
