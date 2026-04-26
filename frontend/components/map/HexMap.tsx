"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { cellToBoundary } from "h3-js";
import type { GeoDesertRow } from "@/lib/api";

/**
 * Aegis-Net atlas map.
 *
 * Pure MapLibre GL + h3-js. No deck.gl, no React 19/8.x compat issues.
 * H3 cells are converted to GeoJSON polygons once and rendered as a
 * data-driven fill layer with a hand-picked editorial colour ramp
 * (cream → ochre → vermillion). Providers render as a tiny circle
 * layer on top.
 */

type Provider = {
  facility_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address_city: string;
  capacity?: number | null;
};

const INDIA_VIEW = {
  center: [80.0, 22.5] as [number, number],
  zoom: 3.7,
  pitch: 0,
  bearing: 0,
};

// Carto Voyager "no labels" — a warm, light, hand-drawn feel that pairs
// with the paper theme. Falls back to Positron if Voyager is unavailable.
const BASEMAP_PRIMARY =
  "https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json";
const BASEMAP_FALLBACK =
  "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";

// Editorial ramp: paper cream → soft ochre → deep vermillion (ink red).
// Lower accessibility = darker red = "desert".
const COLOR_STOPS: [number, string][] = [
  [0.00, "#B43A26"], // accent — deepest desert
  [0.20, "#C56A3D"],
  [0.40, "#D69A55"],
  [0.60, "#D9BE7C"],
  [0.80, "#C9C09B"],
  [1.00, "#4A6E4A"], // moss — well-served
];

function hexesToFeatureCollection(rows: GeoDesertRow[]) {
  const features = rows
    .map((d) => {
      let boundary: number[][];
      try {
        boundary = cellToBoundary(d.h3_index, true); // [lng, lat] pairs
      } catch {
        return null;
      }
      // close ring
      if (
        boundary.length > 0 &&
        (boundary[0][0] !== boundary[boundary.length - 1][0] ||
          boundary[0][1] !== boundary[boundary.length - 1][1])
      ) {
        boundary.push(boundary[0]);
      }
      return {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [boundary],
        },
        properties: {
          h3: d.h3_index,
          access: d.accessibility_norm,
          desert: d.desert ? 1 : 0,
          fac: d.facility_count,
        },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);
  return {
    type: "FeatureCollection" as const,
    features,
  };
}

function providersToFeatureCollection(rows: Provider[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((p) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [p.longitude, p.latitude],
      },
      properties: {
        id: p.facility_id,
        name: p.name,
        city: p.address_city,
      },
    })),
  };
}

export function HexMap({
  hexes,
  providers,
  showProviders,
}: {
  hexes: GeoDesertRow[];
  providers: Provider[];
  showProviders: boolean;
  onHover?: (info: GeoDesertRow | null) => void;
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise once
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapEl.current,
        style: BASEMAP_PRIMARY,
        center: INDIA_VIEW.center,
        zoom: INDIA_VIEW.zoom,
        pitch: INDIA_VIEW.pitch,
        bearing: INDIA_VIEW.bearing,
        attributionControl: { compact: true },
        maxZoom: 11,
        minZoom: 3,
      });
    } catch (e) {
      setError((e as Error).message ?? "MapLibre failed to initialise.");
      return;
    }

    mapRef.current = map;

    map.on("error", (ev) => {
      const err = ev?.error;
      // Silently swallow tile-load errors but log style-load issues.
      if (err && /style/i.test(String(err.message ?? ""))) {
        // try fallback once
        try { map.setStyle(BASEMAP_FALLBACK); } catch { /* ignore */ }
      }
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.on("load", () => {
      // Hex fill source + layer
      map.addSource("hex", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "hex-fill",
        type: "fill",
        source: "hex",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "access"],
            ...(COLOR_STOPS.flatMap(([t, c]) => [t, c]) as (number | string)[]),
          ],
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 0.55,
            6, 0.72,
            9, 0.85,
          ],
        },
      });

      map.addLayer({
        id: "hex-outline",
        type: "line",
        source: "hex",
        paint: {
          "line-color": "#1A1612",
          "line-opacity": 0.18,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 0.2,
            6, 0.4,
            9, 0.6,
          ],
        },
      });

      // Highlight ring for "desert" hexes
      map.addLayer({
        id: "hex-desert-ring",
        type: "line",
        source: "hex",
        filter: ["==", ["get", "desert"], 1],
        paint: {
          "line-color": "#1A1612",
          "line-opacity": 0.55,
          "line-width": 0.7,
        },
      });

      // Providers
      map.addSource("providers", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "providers-circle",
        type: "circle",
        source: "providers",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 1.5,
            6, 2.5,
            9, 4,
          ],
          "circle-color": "#1A1612",
          "circle-stroke-color": "#F4ECDC",
          "circle-stroke-width": 1,
          "circle-opacity": 0.9,
        },
      });

      // Hover tooltip (paper popup)
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 8,
        className: "aegis-popup",
        maxWidth: "280px",
      });
      popupRef.current = popup;

      map.on("mousemove", "hex-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const p = f.properties as {
          h3: string;
          access: number;
          desert: number;
          fac: number;
        };
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:'Inter',sans-serif;font-size:11px;line-height:1.5;color:#1A1612;">
               <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6E6354;letter-spacing:0.04em;margin-bottom:4px;">H3 · ${p.h3}</div>
               <div style="display:flex;justify-content:space-between;gap:18px;"><span style="color:#6E6354;">Accessibility</span><span style="font-family:'JetBrains Mono',monospace;font-feature-settings:'tnum' 1;">${Number(p.access).toFixed(3)}</span></div>
               <div style="display:flex;justify-content:space-between;gap:18px;"><span style="color:#6E6354;">Facilities</span><span style="font-family:'JetBrains Mono',monospace;font-feature-settings:'tnum' 1;">${p.fac}</span></div>
               <div style="display:flex;justify-content:space-between;gap:18px;"><span style="color:#6E6354;">Status</span><span style="color:${p.desert ? "#B43A26" : "#4A6E4A"};font-weight:600;">${p.desert ? "Medical desert" : "Served"}</span></div>
             </div>`
          )
          .addTo(map);
      });
      map.on("mouseleave", "hex-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      map.on("mouseenter", "providers-circle", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const p = f.properties as { id: string; name: string; city: string };
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:'Inter',sans-serif;font-size:12px;color:#1A1612;">
               <div style="font-weight:600;margin-bottom:2px;">${p.name}</div>
               <div style="color:#6E6354;font-size:11px;">${p.city}</div>
               <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#998D7A;margin-top:3px;">${p.id}</div>
             </div>`
          )
          .addTo(map);
      });
      map.on("mouseleave", "providers-circle", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      setReady(true);
    });

    return () => {
      try {
        popupRef.current?.remove();
        mapRef.current?.remove();
      } catch { /* ignore */ }
      mapRef.current = null;
    };
  }, []);

  // Hex data → fill source
  const hexFC = useMemo(() => hexesToFeatureCollection(hexes), [hexes]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("hex") as GeoJSONSource | undefined;
    if (src) src.setData(hexFC);
  }, [hexFC, ready]);

  // Providers → circle source
  const provFC = useMemo(
    () => providersToFeatureCollection(showProviders ? providers : []),
    [providers, showProviders]
  );
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("providers") as GeoJSONSource | undefined;
    if (src) src.setData(provFC);
  }, [provFC, ready]);

  if (error) {
    return (
      <div className="relative w-full h-full grid place-items-center text-center px-6 bg-paper-2">
        <div>
          <div className="font-display italic text-lg mb-2 text-ink">
            The map couldn’t load.
          </div>
          <p className="text-sm text-ink-3 max-w-md">
            MapLibre failed to initialise: <span className="font-mono text-xs">{error}</span>.
            The data remains available via{" "}
            <code className="font-mono text-xs">/api/geo/desert/&lt;capability&gt;</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapEl} className="absolute inset-0" />

      {/* legend */}
      <div className="absolute bottom-4 left-4 pane px-3 py-2.5 text-xs pointer-events-none shadow-letterpressSm">
        <div className="font-mono text-[10px] tracking-widest text-ink-3 mb-1.5">
          E2SFCA · ACCESSIBILITY
        </div>
        <div
          className="h-2 w-44"
          style={{
            background: `linear-gradient(90deg, ${COLOR_STOPS.map(([, c]) => c).join(", ")})`,
            border: "1px solid #1A1612",
          }}
        />
        <div className="flex items-center justify-between mt-1 text-ink-3 font-mono text-[10px]">
          <span>desert</span>
          <span>well-served</span>
        </div>
      </div>

      {/* loading veil while map initialising */}
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-paper-2/70 backdrop-blur-[1px]">
          <div className="text-xs text-ink-3 font-mono tracking-wider animate-slowfade">
            ETCHING THE ATLAS…
          </div>
        </div>
      )}
    </div>
  );
}
