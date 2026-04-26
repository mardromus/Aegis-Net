"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";

/**
 * Reasoning Console map.
 *
 * Pure MapLibre GL + a turf-style ring polygon. Matches the editorial
 * paper aesthetic of the rest of the app — no deck.gl, no dark base.
 */

export type NearbyResult = {
  facility_id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  address_city: string;
  raw_capability_tags?: string[];
};

const BASEMAP_PRIMARY =
  "https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json";
const BASEMAP_FALLBACK =
  "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";

function ringPolygon(lat: number, lon: number, radiusKm: number, points = 96) {
  const R = 6371;
  const coords: [number, number][] = [];
  const latRad = (lat * Math.PI) / 180;
  for (let i = 0; i <= points; i++) {
    const bearing = (i * 2 * Math.PI) / points;
    const dLat = (radiusKm / R) * Math.cos(bearing);
    const dLon = (radiusKm / R) * (Math.sin(bearing) / Math.cos(latRad));
    coords.push([
      lon + (dLon * 180) / Math.PI,
      lat + (dLat * 180) / Math.PI,
    ]);
  }
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [coords],
        },
        properties: {},
      },
    ],
  };
}

function resultsToFeatures(rows: NearbyResult[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((r) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [r.longitude, r.latitude],
      },
      properties: {
        id: r.facility_id,
        name: r.name,
        city: r.address_city,
        dist: r.distance_km,
      },
    })),
  };
}

function anchorToFeatures(
  anchor: { lat: number; lon: number; label: string } | null
) {
  if (!anchor) return { type: "FeatureCollection" as const, features: [] };
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [anchor.lon, anchor.lat],
        },
        properties: { label: anchor.label },
      },
    ],
  };
}

function radiusToZoom(radiusKm: number): number {
  if (radiusKm <= 10) return 10.5;
  if (radiusKm <= 25) return 9;
  if (radiusKm <= 75) return 7.8;
  if (radiusKm <= 150) return 6.8;
  return 6;
}

export function NearbyMap({
  anchor,
  radiusKm,
  results,
  onPick,
}: {
  anchor: { lat: number; lon: number; label: string } | null;
  radiusKm: number;
  results: NearbyResult[];
  onPick?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [styleErr, setStyleErr] = useState(false);

  const ringFC = useMemo(
    () => (anchor ? ringPolygon(anchor.lat, anchor.lon, radiusKm) : null),
    [anchor, radiusKm]
  );
  const anchorFC = useMemo(() => anchorToFeatures(anchor), [anchor]);
  const resultsFC = useMemo(() => resultsToFeatures(results), [results]);

  // Mount once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_PRIMARY,
      center: anchor ? [anchor.lon, anchor.lat] : [80, 22.5],
      zoom: anchor ? radiusToZoom(radiusKm) : 4,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.on("error", (e) => {
      const msg = String(e?.error?.message ?? e);
      if (!styleErr && msg.toLowerCase().includes("style")) {
        setStyleErr(true);
        map.setStyle(BASEMAP_FALLBACK);
      }
    });
    map.on("load", () => {
      setReady(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire sources + layers once map is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!map.getSource("aegis-ring")) {
      map.addSource("aegis-ring", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "aegis-ring-fill",
        type: "fill",
        source: "aegis-ring",
        paint: {
          "fill-color": "#B43A26",
          "fill-opacity": 0.06,
        },
      });
      map.addLayer({
        id: "aegis-ring-stroke",
        type: "line",
        source: "aegis-ring",
        paint: {
          "line-color": "#B43A26",
          "line-width": 1.5,
          "line-dasharray": [3, 2],
          "line-opacity": 0.85,
        },
      });
    }

    if (!map.getSource("aegis-results")) {
      map.addSource("aegis-results", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "aegis-results-circles",
        type: "circle",
        source: "aegis-results",
        paint: {
          "circle-radius": 6,
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "dist"],
            0,
            "#4A6E4A", // moss — closest
            radiusKm * 0.5,
            "#A77523", // ochre — mid
            radiusKm,
            "#B43A26", // accent — at edge
          ],
          "circle-stroke-color": "#1A1612",
          "circle-stroke-width": 1,
          "circle-opacity": 0.95,
        },
      });
    }

    if (!map.getSource("aegis-anchor")) {
      map.addSource("aegis-anchor", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "aegis-anchor-halo",
        type: "circle",
        source: "aegis-anchor",
        paint: {
          "circle-radius": 14,
          "circle-color": "#B43A26",
          "circle-opacity": 0.18,
        },
      });
      map.addLayer({
        id: "aegis-anchor-dot",
        type: "circle",
        source: "aegis-anchor",
        paint: {
          "circle-radius": 6,
          "circle-color": "#1A1612",
          "circle-stroke-color": "#F4ECDC",
          "circle-stroke-width": 2,
        },
      });
    }

    // Click + cursor handlers
    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, {
        layers: ["aegis-results-circles"],
      });
      const f = feats[0];
      if (f && onPick) {
        const id = (f.properties as { id?: string } | null)?.id;
        if (id) onPick(id);
      }
    };
    const onEnter = () => {
      if (map) map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      if (map) map.getCanvas().style.cursor = "";
    };
    map.on("click", "aegis-results-circles", onClick);
    map.on("mouseenter", "aegis-results-circles", onEnter);
    map.on("mouseleave", "aegis-results-circles", onLeave);

    return () => {
      map.off("click", "aegis-results-circles", onClick);
      map.off("mouseenter", "aegis-results-circles", onEnter);
      map.off("mouseleave", "aegis-results-circles", onLeave);
    };
  }, [ready, radiusKm, onPick]);

  // Update ring source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("aegis-ring") as GeoJSONSource | undefined;
    if (src) src.setData(ringFC ?? { type: "FeatureCollection", features: [] });
  }, [ringFC, ready]);

  // Update anchor source + recenter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("aegis-anchor") as GeoJSONSource | undefined;
    if (src) src.setData(anchorFC);
    if (anchor) {
      map.flyTo({
        center: [anchor.lon, anchor.lat],
        zoom: radiusToZoom(radiusKm),
        speed: 1.2,
        curve: 1.6,
      });
    }
  }, [anchorFC, anchor, ready, radiusKm]);

  // Update results source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("aegis-results") as GeoJSONSource | undefined;
    if (src) src.setData(resultsFC);
  }, [resultsFC, ready]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
