declare module "@deck.gl/react" {
  import { ComponentType, ReactNode } from "react";
  type Layer = unknown;
  export const DeckGL: ComponentType<{
    initialViewState?: Record<string, unknown>;
    viewState?: Record<string, unknown>;
    controller?: boolean | Record<string, unknown>;
    layers?: Layer[];
    getTooltip?: (info: { object?: unknown; x?: number; y?: number }) =>
      | { html?: string; text?: string; style?: Record<string, string | number> }
      | null
      | undefined;
    children?: ReactNode;
    [key: string]: unknown;
  }>;
  export default DeckGL;
}

declare module "@deck.gl/layers" {
  export class ScatterplotLayer<T = unknown> {
    constructor(props: Record<string, unknown>);
  }
  export class IconLayer<T = unknown> {
    constructor(props: Record<string, unknown>);
  }
  export class LineLayer<T = unknown> {
    constructor(props: Record<string, unknown>);
  }
  export class PathLayer<T = unknown> {
    constructor(props: Record<string, unknown>);
  }
  export class PolygonLayer<T = unknown> {
    constructor(props: Record<string, unknown>);
  }
}

declare module "@deck.gl/geo-layers" {
  export class H3HexagonLayer<T = unknown> {
    constructor(props: Record<string, unknown>);
  }
}

declare module "@deck.gl/core" {
  export type Layer = unknown;
}

declare module "@deck.gl/mapbox";
declare module "@deck.gl/mesh-layers";
declare module "@deck.gl/aggregation-layers";
declare module "@deck.gl/extensions";
