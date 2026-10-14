
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  Sun,
  Wind,
} from "lucide-react";

type Weather = {
  location: {
    name: string;
    region: string;
    country: string;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    precipitation: number;
    rain: number;
    windSpeed: number;
    weatherCode: number;
    description: string;
    isDay: boolean;
    rainProbability: number | null;
  };
  source: string;
};

type Props = {
  onWeatherChange?: (weather: Weather | null) => void;
};

function WeatherIcon({
  code,
  isDay,
  size = 28,
}: {
  code: number;
  isDay: boolean;
  size?: number;
}) {
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
      code,
    )
  ) {
    return <CloudRain size={size} strokeWidth={1.6} />;
  }

  if ([1, 2, 3, 45, 48].includes(code)) {
    return <CloudSun size={size} strokeWidth={1.6} />;
  }

  if (code === 0 && isDay) {
    return <Sun size={size} strokeWidth={1.6} />;
  }

  return <Cloud size={size} strokeWidth={1.6} />;
}

export default function WeatherWidget({ onWeatherChange }: Props) {
  const [city, setCity] = useState("Semarang");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadWeather = useCallback(
    async (cityName: string) => {
      const trimmedCity = cityName.trim();

      if (!trimmedCity) {
        setError("Masukkan nama kota terlebih dahulu.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/weather?city=${encodeURIComponent(trimmedCity)}`,
          { cache: "no-store" },
        );

        const text = await response.text();
        let data: Weather | { error?: string };

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Respons API tidak valid (status ${response.status}). Periksa endpoint cuaca.`,
          );
        }

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Gagal mengambil data cuaca.",
          );
        }

        if (
          !("location" in data) ||
          !data.location ||
          !data.current ||
          typeof data.current.temperature !== "number"
        ) {
          throw new Error("Format data cuaca dari server tidak sesuai.");
        }

        setWeather(data);
        setCity(data.location.name);
        onWeatherChange?.(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengambil cuaca.";

        setError(message);
        setWeather(null);
        onWeatherChange?.(null);
      } finally {
        setLoading(false);
      }
    },
    [onWeatherChange],
  );

  useEffect(() => {
    void loadWeather("Semarang");
  }, [loadWeather]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadWeather(city);
  }

  const current = weather?.current;

  return (
    <section className="rounded-2xl border border-[#E8E5DA] bg-[#F8F7F2] px-5 py-4 shadow-[0_2px_8px_rgba(50,55,40,0.04)] sm:px-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#78866D]">
            Styleora · Daily forecast
          </p>
          <h2 className="mt-1 font-serif text-xl text-[#292D25]">
            Today&apos;s weather
          </h2>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8EDE2] text-[#697B60]">
          {current ? (
            <WeatherIcon
              code={current.weatherCode}
              isDay={current.isDay}
            />
          ) : (
            <CloudSun size={25} strokeWidth={1.6} />
          )}
        </div>
      </div>

      {/* City search */}
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MapPin
            size={16}
            strokeWidth={1.7}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89917F]"
          />

          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Cari nama kota..."
            aria-label="Nama kota"
            maxLength={100}
            className="w-full rounded-xl border border-[#E6E3D9] bg-white/80 py-2.5 pl-9 pr-3 text-sm text-[#363A31] outline-none transition placeholder:text-[#A2A398] focus:border-[#89977D] focus:ring-2 focus:ring-[#E6EBDD]"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !city.trim()}
          aria-label="Cari cuaca"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#687B60] text-white transition hover:bg-[#56684F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Search size={17} />
          )}
        </button>

        <button
          type="button"
          onClick={() => void loadWeather(city)}
          disabled={loading || !city.trim()}
          aria-label="Muat ulang cuaca"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E4E2D8] bg-white/80 text-[#6F7967] transition hover:bg-[#EAEDE4] disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </form>

      {loading && !weather && (
        <div className="flex items-center gap-2 py-5 text-sm text-[#85877C]">
          <LoaderCircle size={17} className="animate-spin" />
          Mengambil data cuaca...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[#E8D8D0] bg-[#FBF0EC] p-3 text-sm text-[#985C4E]"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadWeather(city)}
            className="mt-1 font-medium underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      )}

      {current && (
        <>
          {/* Main weather information */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-[#85877C]">
                {weather.location.name}
                {weather.location.region
                  ? `, ${weather.location.region}`
                  : ""}
                {weather.location.country
                  ? `, ${weather.location.country}`
                  : ""}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-serif text-4xl leading-none tracking-tight text-[#292D25]">
                  {Math.round(current.temperature)}°
                </span>

                <div>
                  <p className="text-sm font-medium text-[#454A3F]">
                    {current.description}
                  </p>
                  <p className="mt-0.5 text-xs text-[#85877C]">
                    Terasa seperti {Math.round(current.feelsLike)}°C
                  </p>
                </div>
              </div>
            </div>

            <p className="max-w-[180px] text-right text-xs leading-relaxed text-[#85877C]">
              Weather-aware styling for your everyday look.
            </p>
          </div>

          {/* Weather statistics */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <WeatherStat
              icon={<Droplets size={16} strokeWidth={1.7} />}
              label="Kelembapan"
              value={`${current.humidity}%`}
            />

            <WeatherStat
              icon={<Wind size={16} strokeWidth={1.7} />}
              label="Angin"
              value={`${Math.round(current.windSpeed)} km/jam`}
            />

            <WeatherStat
              icon={<CloudRain size={16} strokeWidth={1.7} />}
              label="Peluang hujan"
              value={
                current.rainProbability === null
                  ? "—"
                  : `${current.rainProbability}%`
              }
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[10px] tracking-wide text-[#A09F94]">
              Data cuaca oleh{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-[#687B60]"
              >
                Open-Meteo
              </a>
            </p>

            {loading && (
              <span className="text-[10px] text-[#85877C]">
                Memperbarui...
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function WeatherStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#E8E5DA] bg-white/75 px-3 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-[#78866D]">
        {icon}
        <span className="truncate text-[11px] text-[#85877C]">
          {label}
        </span>
      </div>

      <p className="text-sm font-medium text-[#363A31]">{value}</p>
    </div>
  );
}
