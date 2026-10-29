"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Shirt, Sparkles, Heart, Plus, ArrowUpRight, CloudSun, Sun, CloudRain, MapPin, LoaderCircle, RefreshCw, Palette, Droplets } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { useWeather } from "./context/WeatherContext";

type Clothing = {
  id: string;
  name: string;
  category: string;
  color?: string;
  style?: string;
  image?: string;
};

type Outfit = {
  id: string;
  name: string;
  items?: Clothing[];
  style?: string;
  activity?: string;
};

type CitySuggestion = {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
};

const WARDROBE_KEY = "closet-ai-wardrobe";
const SAVED_KEY = "closet-ai-saved-outfits";

function weatherIcon(code: number) {
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
    return CloudRain;
  }

  if (code === 0) {
    return Sun;
  }

  return CloudSun;
}

export default function Dashboard() {
  const [wardrobe, setWardrobe] = useState<Clothing[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [ready, setReady] = useState(false);
  const { weather, loading: weatherLoading, error: weatherError, city, changeCity } = useWeather();
  const [searchText, setSearchText] = useState(city);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [todayLabel, setTodayLabel] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Hello");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    setSearchText(city);
  }, [city]);

  useEffect(() => {
    if (city) return;
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        if (status.state === "granted") detectLocation();
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Gagal mengambil data user:", error);
        return;
      }

      const user = data.user;

      const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.username || user?.email?.split("@")[0] || null;

      setUserName(name);
    }

    loadUser();
  }, []);

  // Menghindari penggunaan new Date() saat prerender.
  useEffect(() => {
    setTodayLabel(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
      })
        .format(new Date())
        .toUpperCase(),
    );
  }, []);

  // Membaca data wardrobe dan saved outfits dari localStorage.
  useEffect(() => {
    try {
      const wardrobeData = localStorage.getItem(WARDROBE_KEY);
      const savedData = localStorage.getItem(SAVED_KEY);

      if (wardrobeData) {
        const parsed: unknown = JSON.parse(wardrobeData);

        if (Array.isArray(parsed)) {
          setWardrobe(parsed as Clothing[]);
        }
      }

      if (savedData) {
        const parsed: unknown = JSON.parse(savedData);

        if (Array.isArray(parsed)) {
          setSavedOutfits(parsed as Outfit[]);
        }
      }
    } catch (error) {
      console.error("Failed to read Styleora dashboard data:", error);
    } finally {
      setReady(true);
    }
  }, []);

  // Mencari saran kota 300ms setelah user berhenti mengetik.
  useEffect(() => {
    const q = searchText.trim();

    if (!suggestOpen || q.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`, { signal: controller.signal });
        const data = await res.json();
        setSuggestions(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSuggestions([]);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, suggestOpen]);

  function detectLocation() {
    if (!("geolocation" in navigator)) {
      setGeoError("Your browser doesn't support location.");
      return;
    }

    setLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`);
          const data = await res.json();
          const name = data.city || data.locality || data.principalSubdivision;

          if (name) {
            setSearchText(name);
            await changeCity(name);
          } else {
            setGeoError("Couldn't determine your city. Try searching manually.");
          }
        } catch {
          setGeoError("Couldn't determine your city. Try searching manually.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setGeoError(err.code === err.PERMISSION_DENIED ? "Location permission denied. Search a city manually." : "Couldn't get your location.");
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  function selectCity(item: CitySuggestion) {
    setSearchText(item.name);
    setSuggestOpen(false);
    setSuggestions([]);
    void changeCity(item.name); // sebelumnya loadWeather
  }

  // Menghitung jumlah pakaian berdasarkan kategori.
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const item of wardrobe) {
      result[item.category] = (result[item.category] ?? 0) + 1;
    }
    return result;
  }, [wardrobe]);

  const tops = counts["Tops"] ?? 0;
  const bottoms = counts["Bottoms"] ?? 0;
  const outerwear = counts["Outerwear"] ?? 0;
  const shoes = counts["Shoes"] ?? 0;
  const accessories = counts["Accessories"] ?? 0;

  // Estimasi kombinasi dari pakaian yang tersedia.
  const combinations = tops > 0 && bottoms > 0 ? tops * bottoms * (outerwear + 1) * (shoes + 1) : 0;

  const stats = [
    {
      label: "Total Wardrobe",
      number: String(wardrobe.length),
      caption: "Pieces in your collection",
      icon: Shirt,
    },
    {
      label: "Outfit Combinations",
      number: combinations.toLocaleString("en-US"),
      caption: "Estimated combinations from your clothes",
      icon: Sparkles,
    },
    {
      label: "Saved Outfits",
      number: String(savedOutfits.length),
      caption: "Your favorite looks",
      icon: Heart,
    },
  ];

  const categories = [
    { name: "Tops", count: tops },
    { name: "Bottoms", count: bottoms },
    { name: "Outerwear", count: outerwear },
    {
      name: "Shoes & Accessories",
      count: shoes + accessories,
    },
  ];

  const WeatherStatusIcon = weather ? weatherIcon(weather.current.weatherCode) : CloudSun;

  return (
    <>
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span> / Dashboard</span>
          </div>

          <div className="topbar-right">
            <span className="date-label">YOUR PERSONAL STYLE SPACE</span>

            <Link href="/saved-outfits" className="circle-button" aria-label="Saved outfits">
              <Heart size={17} />
            </Link>

            <button
              type="button"
              className="avatar"
              aria-label="Open profile"
              onClick={() => {
                window.location.href = "/account";
              }}
            >
              {userName?.charAt(0).toUpperCase() || "U"}
            </button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">{todayLabel ? `${todayLabel}, YOUR STYLE JOURNAL` : "YOUR STYLE JOURNAL"}</div>

            <h1>
              {greeting}, {userName ?? "style lover"}.
            </h1>

            <p>A little inspiration goes a long way. Let&apos;s find something lovely to wear today.</p>
          </div>

          <Link href="/wardrobe" className="primary-button">
            <Plus size={17} />
            Add clothing
          </Link>
        </section>

        {/* Statistik berdasarkan data yang tersimpan */}
        <section className="stats-grid">
          {stats.map(({ label, number, caption, icon: Icon }) => (
            <article className="stat-card" key={label}>
              <div className="stat-top">
                <span>{label}</span>

                <div className="stat-icon">
                  <Icon size={18} />
                </div>
              </div>

              <div className="stat-number">{ready ? number : "—"}</div>

              <div className="stat-caption">{caption}</div>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <div>
            {/* Inspirasi outfit */}
            <article className="panel">
              <div className="panel-heading">
                <h2>Today&apos;s inspiration</h2>

                <Link href="/outfits" className="text-link">
                  Explore <ArrowUpRight size={13} />
                </Link>
              </div>

              <div className="hero-outfit">
                <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85" alt="Fashion inspiration with everyday outfits" />

                <div className="image-label">
                  <Sparkles size={13} />
                  THE EVERYDAY EDIT
                </div>
              </div>

              <div className="outfit-description">
                <div>
                  <h3>Effortlessly put together</h3>
                  <p>Neutral tones · Everyday casual</p>
                </div>

                <Link href="/outfits" className="circle-button" aria-label="Explore outfit ideas">
                  <ArrowUpRight size={17} />
                </Link>
              </div>
            </article>

            {/* Ringkasan wardrobe */}
            <article className="panel section-gap">
              <div className="panel-heading">
                <h2>Your wardrobe at a glance</h2>

                <Link href="/wardrobe" className="text-link">
                  View all <ArrowUpRight size={13} />
                </Link>
              </div>

              <div className="category-list">
                {categories.map((category) => (
                  <div className="category-row" key={category.name}>
                    <span className="category-dot" />

                    <span className="category-name">{category.name}</span>

                    <span className="category-count">{ready ? category.count : "—"} pieces</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div>
            {/* Cuaca aktual dari Open-Meteo */}
            <article className="panel">
              <div className="panel-heading">
                <h2>Weather today</h2>
                <CloudSun size={20} color="#65765e" />
              </div>

              <div className="weather-card">
                <form
                  className="weather-top"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSuggestOpen(false);
                    if (!searchText.trim()) return;
                    void changeCity(searchText);
                  }}
                >
                  <span>
                    <MapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                    LOCAL WEATHER
                  </span>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div className="city-search">
                      <input
                        aria-label="City for weather"
                        value={searchText}
                        onChange={(event) => {
                          setSearchText(event.target.value);
                          setSuggestOpen(true);
                        }}
                        onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
                        onBlur={() => setSuggestOpen(false)}
                        placeholder="Enter city"
                        autoComplete="off"
                      />

                      {suggestOpen && suggestions.length > 0 && (
                        <ul className="city-suggestions" role="listbox">
                          {suggestions.map((item) => (
                            <li
                              key={item.id}
                              role="option"
                              aria-selected={false}
                              onPointerDown={(event) => {
                                event.preventDefault();
                                selectCity(item);
                              }}
                            >
                              <MapPin size={13} />
                              <span>
                                <strong>{item.name}</strong>
                                <small>{[item.admin1, item.country].filter(Boolean).join(", ")}</small>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="submit"
                      aria-label="Refresh weather"
                      disabled={weatherLoading}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        border: 0,
                        background: "transparent",
                        cursor: "pointer",
                        color: "#65765e",
                      }}
                    >
                      <RefreshCw size={15} className={weatherLoading ? "animate-spin" : ""} />
                    </button>
                  </div>
                </form>

                {weatherLoading && !weather ? (
                  <div className="weather-main">
                    <LoaderCircle size={28} className="animate-spin" color="#78866f" />

                    <div>
                      <strong style={{ fontSize: 15 }}>Loading weather…</strong>
                      <p>Connecting to Open-Meteo</p>
                    </div>
                  </div>
                ) : weather ? (
                  <>
                    <div className="weather-main">
                      <WeatherStatusIcon size={42} color="#78866f" strokeWidth={1.3} />

                      <div>
                        <strong>{Math.round(weather.current.temperature)}°C</strong>

                        <p>
                          {weather.current.description} · {weather.location.name}
                        </p>

                        <p>Feels like {Math.round(weather.current.feelsLike)}°C</p>
                      </div>
                    </div>

                    <div className="weather-note">
                      <Droplets size={14} />
                      Humidity {weather.current.humidity}% · Wind {Math.round(weather.current.windSpeed)} km/h
                      {weather.current.rainProbability !== null ? ` · Rain chance ${weather.current.rainProbability}%` : ""}
                    </div>
                  </>
                ) : !city ? (
                  <div className="weather-main">
                    <MapPin size={38} color="#78866f" strokeWidth={1.3} />
                    <div>
                      <strong style={{ fontSize: 15 }}>Where are you today?</strong>
                      <p>Search a city above or use your location.</p>
                      <button type="button" className="primary-button" onClick={detectLocation} disabled={locating}>
                        {locating ? "Locating…" : "Use my location"}
                      </button>
                      {geoError && (
                        <p role="status" style={{ fontSize: 11, color: "#985C4E" }}>
                          {geoError}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="weather-main">
                    <CloudSun size={38} color="#78866f" strokeWidth={1.3} />

                    <div>
                      <strong style={{ fontSize: 15 }}>Weather unavailable</strong>

                      <p>{weatherError || "Check your connection and retry."}</p>
                    </div>
                  </div>
                )}

                {weatherError && weather && (
                  <p
                    role="status"
                    style={{
                      fontSize: 11,
                      color: "#985C4E",
                      marginTop: 8,
                    }}
                  >
                    {weatherError}
                  </p>
                )}

                <div className="weather-note">
                  <Palette size={14} />
                  Weather-based outfit tips will use this live forecast.
                </div>
              </div>
            </article>

            {/* Quick styling */}
            <article className="panel section-gap">
              <div className="panel-heading">
                <h2>Quick styling</h2>
                <Sparkles size={19} color="#65765e" />
              </div>

              <p
                style={{
                  color: "#85867d",
                  fontSize: 12,
                  lineHeight: 1.9,
                  marginTop: 0,
                }}
              >
                Make more of the clothes you already own. Mix your pieces into fresh combinations with a little help from AI.
              </p>

              <Link href="/outfits" className="primary-button" style={{ width: "100%" }}>
                <Sparkles size={16} />
                Generate outfit
                <Plus size={16} />
              </Link>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
