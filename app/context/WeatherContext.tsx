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
  changeCity: (name: string) => Promise<void>;
};

const CITY_KEY = "closet-ai-city";
const WeatherContext = createContext<WeatherContextValue | null>(null);

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const [city, setCity] = useState("Semarang");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const changeCity = useCallback(async (name: string) => {
    const requested = name.trim();
    if (!requested) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(requested)}`, { cache: "no-store" });
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

  // Pertama kali dimuat: pakai kota tersimpan, kalau tidak ada pakai Semarang
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(CITY_KEY);
    } catch {}
    void changeCity(saved || "Semarang");
  }, [changeCity]);

  return <WeatherContext.Provider value={{ city, weather, loading, error, changeCity }}>{children}</WeatherContext.Provider>;
}

export function useWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) throw new Error("useWeather harus dipakai di dalam WeatherProvider");
  return ctx;
}