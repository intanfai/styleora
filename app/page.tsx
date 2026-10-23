"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shirt, Sparkles, Heart, Plus, ArrowUpRight, CloudSun, Sun, CloudRain, MapPin, LoaderCircle, RefreshCw, Palette, Droplets } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { createClient } from "@/lib/supabase/client";

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
    windSpeed: number;
    weatherCode: number;
    description: string;
    rainProbability: number | null;
    isDay: boolean;
  };
  source: string;
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
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");
  const [city, setCity] = useState("Semarang");
  const [todayLabel, setTodayLabel] = useState("");
  const [userName, setUserName] = useState<string | null>(null);

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

  // Mengambil data cuaca dari endpoint API.
  async function loadWeather(cityName = city) {
    const requestedCity = cityName.trim();

    if (!requestedCity) {
      setWeatherError("Masukkan nama kota terlebih dahulu.");
      return;
    }

    setWeatherLoading(true);
    setWeatherError("");

    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(requestedCity)}`, { cache: "no-store" });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Data cuaca gagal dimuat.");
      }

      if (!data.location || !data.current) {
        throw new Error("Format data cuaca tidak sesuai.");
      }

      setWeather(data as Weather);
      setCity(data.location.name);
    } catch (error) {
      setWeather(null);
      setWeatherError(error instanceof Error ? error.message : "Tidak dapat terhubung ke layanan cuaca.");
    } finally {
      setWeatherLoading(false);
    }
  }

  // Mengambil cuaca setelah dashboard dimuat di browser.
  useEffect(() => {
    void loadWeather("Semarang");
    // Hanya mengambil cuaca awal ketika komponen dimuat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Menghitung jumlah pakaian berdasarkan kategori.
  const countCategory = (category: string) => wardrobe.filter((item) => item.category === category).length;

  const tops = countCategory("Tops");
  const bottoms = countCategory("Bottoms");
  const outerwear = countCategory("Outerwear");
  const shoes = countCategory("Shoes");
  const accessories = countCategory("Accessories");

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

            <button
              type="button"
              className="circle-button"
              aria-label="Saved outfits"
              onClick={() => {
                window.location.href = "/saved-outfits";
              }}
            >
              <Heart size={17} />
            </button>

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

            <h1>Good morning, style lover.</h1>

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
                    void loadWeather(city);
                  }}
                >
                  <span>
                    <MapPin
                      size={12}
                      style={{
                        display: "inline",
                        marginRight: 4,
                      }}
                    />
                    LOCAL WEATHER
                  </span>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    <input
                      aria-label="City for weather"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Enter city"
                      style={{
                        width: 105,
                        minWidth: 0,
                        border: "1px solid #e1e4d8",
                        borderRadius: 8,
                        padding: "5px 7px",
                        background: "#fff",
                        fontSize: 11,
                      }}
                    />

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
