"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type WeatherData = {
  location: {
    name: string;
    region: string;
    country: string;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    precipitation?: number;
    rain?: number;
    windSpeed: number;
    weatherCode: number;
    description: string;
    isDay: boolean;
    rainProbability: number | null;
  };
  source: string;
};

type WeatherContextValue = {
  city: string;
  weather: WeatherData | null;
  loading: boolean;
  error: string;
  initialized: boolean;
  changeCity: (name: string) => Promise<void>;
  changeCoords: (lat: number, lon: number, label?: string) => Promise<void>;
};

const CITY_KEY = "closet-ai-city";
const WeatherContext = createContext<WeatherContextValue | null>(null);

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Fungsi inti: fetch cuaca dari URL API, lalu simpan hasilnya.
  const load = useCallback(async (url: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Data cuaca gagal dimuat.");

      setWeather(data as WeatherData);
      setCity(data.location.name);

      try {
        localStorage.setItem(CITY_KEY, data.location.name);
      } catch {}
    } catch (e) {
      setWeather(null);
      setError(e instanceof Error ? e.message : "Tidak dapat terhubung ke layanan cuaca.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Cari cuaca berdasarkan nama kota.
  const changeCity = useCallback(
    async (name: string) => {
      const requested = name.trim();
      if (!requested) return;

      await load(`/api/weather?city=${encodeURIComponent(requested)}`);
    },
    [load],
  );

  // Cari cuaca berdasarkan koordinat (dari GPS). `label` hanya untuk nama tampilan.
  const changeCoords = useCallback(
    async (lat: number, lon: number, label?: string) => {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
      });

      if (label) params.set("name", label);

      await load(`/api/weather?${params.toString()}`);
    },
    [load],
  );

  // Pertama kali dimuat: pakai kota tersimpan saja.
  // Kalau belum ada, biarkan kosong supaya dashboard menampilkan "Where are you today?".
  useEffect(() => {
    let saved: string | null = null;

    try {
      saved = localStorage.getItem(CITY_KEY);
    } catch {}

    if (saved) {
      void changeCity(saved).finally(() => setInitialized(true));
    } else {
      setLoading(false);
      setInitialized(true);
    }
  }, [changeCity]);

  return (
    <WeatherContext.Provider
      value={{
        city,
        weather,
        loading,
        error,
        initialized,
        changeCity,
        changeCoords,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) throw new Error("useWeather harus dipakai di dalam WeatherProvider");
  return ctx;
}