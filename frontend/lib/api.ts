"use client";

import useSWR, { type SWRConfiguration } from "swr";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_BROWSER ||
  (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function useApi<T>(path: string | null, config: SWRConfiguration = {}) {
  return useSWR<T>(path, fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30_000,
    keepPreviousData: true,
    ...config,
  });
}

export type StatsResponse = {
  facility_count: number;
  state_count: number;
  city_count: number;
  audited_count: number;
  trust_bands: Record<string, number>;
  top_states: { state: string; count: number }[];
  facility_types: { type: string; count: number }[];
  top_capabilities: { capability: string; count: number }[];
};

export type CapabilityRow = {
  capability: string;
  providers: number;
  desert_pct: number | null;
  has_e2sfca: boolean;
};

export type FacilityRow = {
  facility_id: string;
  name: string;
  address_city: string;
  address_stateOrRegion: string;
  facilityTypeId?: string;
  latitude: number;
  longitude: number;
  h3_index?: string;
  raw_capability_tags?: string[];
  completeness_score?: number;
  numberDoctors?: number | null;
  capacity?: number | null;
};

export type DossierRow = {
  facility_id: string;
  name: string;
  address_city: string;
  address_state: string;
  latitude: number;
  longitude: number;
  h3_index?: string;
  band: string;
  score: number;
  compliance: number;
  contradictions: number;
  audited_count: number;
  critical_gaps: number;
  caps: string[];
};

export type DossierDetail = {
  facility_id: string;
  name: string;
  address_city: string;
  address_state: string;
  latitude: number;
  longitude: number;
  h3_index?: string;
  diagnostic: {
    capabilities: string[];
    cov: {
      facility_id: string;
      baseline: string[];
      questions: string[];
      answers: { question: string; supported: boolean; evidence: string }[];
      final_capabilities: string[];
      pruned: string[];
      reasoning_trace: { phase: string; [k: string]: unknown }[];
    };
  };
  evaluation: {
    scores: {
      capability: string;
      fused: number;
      p_true_mean: number;
      p_true_std: number;
      consistency: number;
      samples: number[];
      quarantined: boolean;
    }[];
    quarantine: unknown[];
    quarantine_threshold: number;
    approved: unknown[];
  };
  audit: {
    audit_findings: {
      capability: string;
      status: "COMPLIANT" | "FLAGGED" | "CRITICAL_GAP";
      missing_critical: string[];
      missing_recommended: string[];
      reference: string;
      retrieved_evidence: { id: string; title: string; text: string; source: string; score: number }[];
    }[];
    summary: {
      compliance_index: number;
      compliant: number;
      flagged: number;
      critical_gaps: number;
      tags_audited: number;
    };
  };
  trust: {
    facility_id: string;
    trust_score: number;
    completeness: number;
    avg_confidence: number;
    contradiction_penalty: number;
    contradictions: { rule: string; message: string; citation: string }[];
    citations: { capability: string; evidence_span: string }[];
    band: string;
  };
};

export type GeoDesertRow = {
  h3_index: string;
  lat: number;
  lon: number;
  accessibility: number;
  accessibility_norm: number;
  desert: boolean;
  facility_count: number;
  population_proxy: number;
};
