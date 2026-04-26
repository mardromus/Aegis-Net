"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  Tooltip,
} from "recharts";

type Score = {
  capability: string;
  fused: number;
  p_true_mean: number;
  p_true_std: number;
  consistency: number;
  quarantined: boolean;
};

const TICK = { fill: "#6E6354", fontFamily: "JetBrains Mono", fontSize: 10 };

export function ConfidenceChart({
  scores,
  threshold,
}: {
  scores: Score[];
  threshold: number;
}) {
  if (!scores || scores.length === 0) {
    return (
      <div className="h-[260px] grid place-items-center font-display italic text-sm text-ink-3">
        No confidence scores yet.
      </div>
    );
  }

  const data = scores.map((s) => ({
    ...s,
    fill: s.fused >= threshold ? "#4A6E4A" : "#B43A26",
  }));

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 20, right: 28, top: 14, bottom: 4 }}
        >
          <XAxis
            type="number"
            domain={[0, 1]}
            tick={TICK}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            axisLine={{ stroke: "#1A1612" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="capability"
            tick={{
              fill: "#1A1612",
              fontFamily: "Fraunces",
              fontSize: 12,
            }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <ReferenceLine
            x={threshold}
            stroke="#1A1612"
            strokeDasharray="4 3"
            label={{
              value: `quarantine ≥ ${threshold}`,
              position: "top",
              fontSize: 10,
              fontFamily: "JetBrains Mono",
              fill: "#1A1612",
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#F4ECDC",
              border: "1px solid #1A1612",
              borderRadius: 0,
              fontSize: 11,
              fontFamily: "JetBrains Mono",
              color: "#1A1612",
              boxShadow: "3px 3px 0 #1A1612",
            }}
            formatter={(value: number, _name: string, props) => {
              const p = props.payload as Score;
              return [
                `${value.toFixed(3)} (P=${p.p_true_mean.toFixed(2)} ±${p.p_true_std.toFixed(2)} · cons=${p.consistency.toFixed(2)})`,
                "fused",
              ];
            }}
          />
          <Bar dataKey="fused">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
