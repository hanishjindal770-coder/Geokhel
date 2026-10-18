"use client";
// MapLibre globe framed on India. All geography is served from /public/geo: India's states
// from OpenStreetMap (official Government of India depiction), other countries from Natural Earth.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import maplibregl, { type Map as MLMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface GlobeHandle {
  reset(): void;
  placeGuess(lat: number, lon: number): void;
  reveal(guess: { lat: number; lon: number }, answer: { lat: number; lon: number }): void;
  clear(): void;
}

const INDIA: [[number, number], [number, number]] = [[68.1, 6.7], [97.4, 37.1]];
const EMPTY = { type: "FeatureCollection" as const, features: [] };

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function palette() {
  return {
    sea: css("--sea"), other: css("--other"), otherLine: css("--other-line"),
    land: css("--land"), border: css("--border"), ink: css("--ink"),
  };
}

function pin(cls: string) {
  const el = document.createElement("div");
  el.className = `pin ${cls}`;
  return el;
}

export const GlobeMap = forwardRef<GlobeHandle, { onTap: (lat: number, lon: number) => void }>(function GlobeMap({ onTap }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const marks = useRef<{ guess?: Marker; answer?: Marker }>({});
  const tap = useRef(onTap);
  const [failed, setFailed] = useState(false);
  tap.current = onTap;

  useEffect(() => {
    if (!box.current) return;
    let m: MLMap;
    try {
      const c = palette();
      m = new maplibregl.Map({
        container: box.current,
        style: {
          version: 8,
          projection: { type: "globe" },
          sources: {
            world: { type: "geojson", data: "/geo/world.json" },
            near: { type: "geojson", data: "/geo/near.json" },
            india: { type: "geojson", data: "/geo/india.json" },
            line: { type: "geojson", data: EMPTY },
          },
          layers: [
            { id: "sea", type: "background", paint: { "background-color": c.sea } },
            { id: "world", type: "fill", source: "world", paint: { "fill-color": c.other } },
            { id: "world-line", type: "line", source: "world", paint: { "line-color": c.otherLine, "line-width": 0.6 } },
            { id: "near", type: "fill", source: "near", paint: { "fill-color": c.other } },
            { id: "near-line", type: "line", source: "near", paint: { "line-color": c.otherLine, "line-width": 0.8 } },
            { id: "india", type: "fill", source: "india", paint: { "fill-color": c.land } },
            { id: "india-line", type: "line", source: "india", paint: { "line-color": c.border, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 8, 1.6] } },
            { id: "guess-line", type: "line", source: "line", paint: { "line-color": c.ink, "line-width": 2.2, "line-dasharray": [2, 1.5] } },
          ],
        },
        bounds: INDIA,
        fitBoundsOptions: { padding: 16 },
        minZoom: 1,
        maxZoom: 11,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false,
        attributionControl: {
          compact: true,
          customAttribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors · Natural Earth',
        },
      });
    } catch {
      setFailed(true);
      return;
    }
    m.touchZoomRotate.disableRotation();
    m.keyboard.disableRotation();
    // MapLibre only fires click when the pointer didn't drag, so a drag never counts as a guess.
    m.on("click", (e) => {
      const ll = e.lngLat.wrap();
      tap.current(ll.lat, ll.lng);
    });
    const recolor = () => {
      if (!m.isStyleLoaded()) return;
      const c = palette();
      m.setPaintProperty("sea", "background-color", c.sea);
      for (const id of ["world", "near"]) m.setPaintProperty(id, "fill-color", c.other);
      for (const id of ["world-line", "near-line"]) m.setPaintProperty(id, "line-color", c.otherLine);
      m.setPaintProperty("india", "fill-color", c.land);
      m.setPaintProperty("india-line", "line-color", c.border);
      m.setPaintProperty("guess-line", "line-color", c.ink);
    };
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", recolor);
    map.current = m;
    return () => {
      mq.removeEventListener("change", recolor);
      m.remove();
      map.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => {
    const setLine = (coords: [number, number][] | null) => {
      const src = map.current?.getSource("line") as maplibregl.GeoJSONSource | undefined;
      src?.setData(coords ? { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} } : EMPTY);
    };
    return {
      reset() {
        map.current?.fitBounds(INDIA, { padding: 16, duration: reduced() ? 0 : 700 });
      },
      placeGuess(lat, lon) {
        const m = map.current;
        if (!m) return;
        if (marks.current.guess) marks.current.guess.setLngLat([lon, lat]);
        else marks.current.guess = new maplibregl.Marker({ element: pin("guess") }).setLngLat([lon, lat]).addTo(m);
      },
      reveal(guess, answer) {
        const m = map.current;
        if (!m) return;
        this.placeGuess(guess.lat, guess.lon);
        marks.current.answer?.remove();
        marks.current.answer = new maplibregl.Marker({ element: pin("ans") }).setLngLat([answer.lon, answer.lat]).addTo(m);
        setLine([[guess.lon, guess.lat], [answer.lon, answer.lat]]);
        m.fitBounds(
          [[Math.min(guess.lon, answer.lon), Math.min(guess.lat, answer.lat)], [Math.max(guess.lon, answer.lon), Math.max(guess.lat, answer.lat)]],
          { padding: 70, maxZoom: 8, duration: reduced() ? 0 : 900 },
        );
      },
      clear() {
        marks.current.guess?.remove();
        marks.current.answer?.remove();
        marks.current = {};
        setLine(null);
      },
    };
  }, []);

  return (
    <div id="map" ref={box} role="application" aria-label="Globe centred on India. Tap to place your guess.">
      {failed && <p className="nomap">The map needs WebGL, which this browser has turned off. Try another browser or device.</p>}
    </div>
  );
});
