"use client";

import { useSyncExternalStore } from "react";

// Per-browser conveniences (no user accounts). Every access is try/catch'd so a
// private window or blocked storage just means "empty", never a crash.

const FAV_KEY = "blt.favourites.v1";
const VIEWS_KEY = "blt.savedViews.v1";

export type SavedView = { id: string; name: string; query: string; createdAt: string };

type Store = { favourites: string[]; views: SavedView[] };

const listeners = new Set<() => void>();
let cache: Store | null = null;
const EMPTY: Store = { favourites: [], views: [] };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

function load(): Store {
  if (!cache) {
    const favourites = read<unknown>(FAV_KEY, []);
    const views = read<unknown>(VIEWS_KEY, []);
    cache = {
      favourites: Array.isArray(favourites) ? favourites.filter((x): x is string => typeof x === "string") : [],
      views: Array.isArray(views) ? (views as SavedView[]).filter((v) => v && typeof v.query === "string") : [],
    };
  }
  return cache;
}

function set(next: Store) {
  cache = next;
  write(FAV_KEY, next.favourites);
  write(VIEWS_KEY, next.views);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === FAV_KEY || e.key === VIEWS_KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore() {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export function toggleFavourite(id: string) {
  const s = load();
  const favourites = s.favourites.includes(id) ? s.favourites.filter((x) => x !== id) : [id, ...s.favourites];
  set({ ...s, favourites });
}

export function saveView(name: string, query: string) {
  const s = load();
  const view: SavedView = { id: crypto.randomUUID(), name: name.trim() || "Skats", query, createdAt: new Date().toISOString() };
  set({ ...s, views: [view, ...s.views] });
  return view;
}

export function deleteView(id: string) {
  const s = load();
  set({ ...s, views: s.views.filter((v) => v.id !== id) });
}

export function exportJson() {
  const s = load();
  return JSON.stringify({ app: "blt-hr-portal", version: 1, exportedAt: new Date().toISOString(), ...s }, null, 2);
}

/** Merge an exported file into the current store. Returns counts added. */
export function importJson(text: string) {
  const data = JSON.parse(text) as Partial<Store>;
  const s = load();
  const favs = (Array.isArray(data.favourites) ? data.favourites : []).filter(
    (x): x is string => typeof x === "string" && !s.favourites.includes(x),
  );
  const ids = new Set(s.views.map((v) => v.id));
  const views = (Array.isArray(data.views) ? data.views : []).filter(
    (v): v is SavedView => !!v && typeof v.query === "string" && typeof v.name === "string" && !ids.has(v.id),
  );
  set({ favourites: [...s.favourites, ...favs], views: [...s.views, ...views] });
  return { favourites: favs.length, views: views.length };
}
