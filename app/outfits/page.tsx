"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Shirt, Heart, RefreshCw, ArrowRight, ArrowUpRight, Check, CloudSun, CloudRain, Sun, MapPin, Droplets, BriefcaseBusiness, Coffee, GraduationCap, PartyPopper, WandSparkles } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { useWeather } from "../context/WeatherContext";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Clothing = {
  id: string;
  name: string;
  category: string;
  color: string;
  style: string;
  image: string;
};

type Outfit = {
  id: string;
  name: string;
  style: string;
  activity: string;
  items: Clothing[];
  createdAt: string;
  reason?: string;
};

const WARDROBE_KEY = "closet-ai-wardrobe";
const SAVED_KEY = "closet-ai-saved-outfits";

const styles = ["Casual", "Formal", "Smart Casual", "Streetwear", "Minimalist", "Sporty", "Vintage"];

const activities = [
  { label: "College", icon: GraduationCap },
  { label: "Work", icon: BriefcaseBusiness },
  { label: "Hangout", icon: Coffee },
  { label: "Special Event", icon: PartyPopper },
];

function weatherIcon(code: number) {
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return CloudRain;
  if (code === 0) return Sun;
  return CloudSun;
}

function getOutfitName(style: string, activity: string) {
  const names: Record<string, string> = {
    College: "Campus Day Edit",
    Work: "The Workday Edit",
    Hangout: "Easy Weekend Look",
    "Special Event": "The Occasion Edit",
  };

  return `${names[activity] ?? "Everyday Edit"} · ${style}`;
}

export default function OutfitGeneratorPage() {
  const [wardrobe, setWardrobe] = useState<Clothing[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("Casual");
  const [selectedActivity, setSelectedActivity] = useState("College");
  const [currentOutfit, setCurrentOutfit] = useState<Outfit | null>(null);
  const { weather } = useWeather();
  const WeatherIcon = weather ? weatherIcon(weather.current.weatherCode) : CloudSun;
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
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

  useEffect(() => {
    try {
      const wardrobeData = localStorage.getItem(WARDROBE_KEY);
      const savedData = localStorage.getItem(SAVED_KEY);

      if (wardrobeData) {
        setWardrobe(JSON.parse(wardrobeData) as Clothing[]);
      }

      if (savedData) {
        setSavedOutfits(JSON.parse(savedData) as Outfit[]);
      }
    } catch {
      setMessage("Could not load your saved wardrobe data.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedOutfits));
    } catch {
      setMessage("Penyimpanan penuh. Coba hapus beberapa foto pakaian dari wardrobe.");
    }
  }, [savedOutfits, ready]);

  async function handleGenerate() {
    if (isGenerating) return;

    setMessage("");

    if (wardrobe.length === 0) {
      setMessage("Wardrobe kamu masih kosong. Tambahkan pakaian terlebih dahulu.");
      return;
    }

    if (!wardrobe.some((item) => item.category === "Tops") || !wardrobe.some((item) => item.category === "Bottoms")) {
      setMessage("Tambahkan minimal satu Tops dan satu Bottoms.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-outfit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wardrobe: wardrobe.map(({ id, name, category, color, style }) => ({
            id,
            name,
            category,
            color,
            style,
          })),
          style: selectedStyle,
          activity: selectedActivity,
          weather,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = typeof data.error === "string" ? data.error : data.error?.message || "Gagal membuat outfit.";

        throw new Error(errorMessage);
      }

      if (!Array.isArray(data.itemIds) || !data.itemIds.every((id: unknown) => typeof id === "string")) {
        throw new Error("Respons AI tidak memiliki daftar pakaian yang valid.");
      }

      const selectedIds = [...new Set<string>(data.itemIds)] as string[];

      const selectedItems = selectedIds.map((id) => wardrobe.find((item) => item.id === id));

      if (selectedItems.some((item) => !item) || selectedItems.filter((item) => item?.category === "Tops").length !== 1 || selectedItems.filter((item) => item?.category === "Bottoms").length !== 1) {
        throw new Error("Hasil outfit dari AI tidak valid.");
      }

      setCurrentOutfit({
        id: crypto.randomUUID(),
        name: typeof data.outfitName === "string" && data.outfitName.trim() ? data.outfitName : getOutfitName(selectedStyle, selectedActivity),
        style: selectedStyle,
        activity: selectedActivity,
        items: selectedItems as Clothing[],
        createdAt: new Date().toISOString(),
        reason: typeof data.reason === "string" ? data.reason : "",
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan saat membuat outfit.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSave() {
    if (!currentOutfit) return;

    const alreadySaved = savedOutfits.some(
      (outfit) =>
        outfit.items.length === currentOutfit.items.length && outfit.items.every((item) => currentOutfit.items.some((current) => current.id === item.id)) && outfit.style === currentOutfit.style && outfit.activity === currentOutfit.activity,
    );

    if (alreadySaved) {
      setMessage("Outfit ini sudah ada di Saved Outfits.");
      return;
    }

    setSavedOutfits((current) => [currentOutfit, ...current]);
    setMessage("Outfit berhasil disimpan ke Saved Outfits.");
  }

  const currentIsSaved = currentOutfit
    ? savedOutfits.some(
        (outfit) =>
          outfit.items.length === currentOutfit.items.length &&
          outfit.items.every((item) => currentOutfit.items.some((current) => current.id === item.id)) &&
          outfit.style === currentOutfit.style &&
          outfit.activity === currentOutfit.activity,
      )
    : false;

  return (
    <>
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span> / Outfit Generator</span>
          </div>

          <div className="topbar-right">
            <span className="date-label">YOUR PERSONAL STYLE SPACE</span>
            <button type="button" className="avatar" aria-label="Open profile" onClick={() => router.push("/account")}>
              {userName?.charAt(0).toUpperCase() || "U"}
            </button>{" "}
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">A LITTLE HELP FROM YOUR CLOSET</div>
            <h1>Outfit Generator.</h1>
            <p>Discover fresh combinations from pieces you already own. Your next look might be closer than you think.</p>
          </div>
        </section>

        {/* Weather (sinkron dengan dashboard) */}
        <section className="mb-6">
          <div className="outfit-weather">
            <div className="outfit-weather-icon">
              <WeatherIcon size={26} strokeWidth={1.4} />
            </div>

            {weather ? (
              <>
                <div className="outfit-weather-main">
                  <span className="outfit-weather-label">
                    <MapPin size={11} />
                    {weather.location.name}
                  </span>
                  <div className="outfit-weather-temp">
                    <strong>{Math.round(weather.current.temperature)}°C</strong>
                    <span>{weather.current.description}</span>
                  </div>
                </div>

                <div className="outfit-weather-chips">
                  <span>
                    <Droplets size={12} />
                    Humidity {weather.current.humidity}%
                  </span>
                  {weather.current.rainProbability !== null && (
                    <span>
                      <CloudRain size={12} />
                      Rain {weather.current.rainProbability}%
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="outfit-weather-main">
                <span className="outfit-weather-label">Weather</span>
                <div className="outfit-weather-temp">
                  <span>Loading weather…</span>
                </div>
              </div>
            )}

            <Link href="/" className="outfit-weather-link">
              Change city <ArrowUpRight size={13} />
            </Link>
          </div>
        </section>

        <section className="generator-layout">
          <div className="panel generator-settings">
            <div className="generator-title">
              <div className="generator-sparkle">
                <WandSparkles size={22} />
              </div>

              <div>
                <h2>Let&apos;s style your day</h2>
                <p>Personalize your outfit preferences below.</p>
              </div>
            </div>

            <div className="generator-field">
              <label>01 — WHAT&apos;S YOUR STYLE?</label>

              <div className="style-options">
                {styles.map((style) => (
                  <button type="button" key={style} className={`style-option ${selectedStyle === style ? "selected" : ""}`} onClick={() => setSelectedStyle(style)}>
                    {style}
                    {selectedStyle === style && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="generator-field">
              <label>02 — WHAT&apos;S THE OCCASION?</label>

              <div className="activity-options">
                {activities.map(({ label, icon: Icon }) => (
                  <button type="button" key={label} className={`activity-option ${selectedActivity === label ? "selected" : ""}`} onClick={() => setSelectedActivity(label)}>
                    <Icon size={19} strokeWidth={1.7} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="wardrobe-availability">
              <div className="availability-icon">
                <Shirt size={18} />
              </div>

              <div>
                <strong>{wardrobe.length} wardrobe pieces available</strong>
                <p>We&apos;ll use items saved in your collection.</p>
              </div>

              <Link href="/wardrobe" aria-label="Open wardrobe">
                <ArrowRight size={18} />
              </Link>
            </div>

            <button type="button" className="primary-button generate-button" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <RefreshCw size={17} className="animate-spin" /> : <Sparkles size={17} />}

              {isGenerating ? "Creating your outfit..." : "Generate my outfit"}
            </button>

            {message && (
              <p className="generator-message" role="status">
                {message}
              </p>
            )}

            <p className="generator-disclaimer">
              <Sparkles size={13} />
              AI styling considers your wardrobe, preferred style, occasion, and available weather data.
            </p>
          </div>

          <div className="generator-preview">
            {!currentOutfit ? (
              <div className="preview-empty">
                <div className="preview-empty-icon">
                  <Shirt size={35} strokeWidth={1.3} />
                  <Sparkles size={18} />
                </div>

                <div className="eyebrow">YOUR NEXT LOOK</div>
                <h2>A little styling magic awaits.</h2>

                <p>Choose a style and an occasion, then generate a fresh combination from your wardrobe and the current weather.</p>

                <div className="preview-tags">
                  <span>Personal</span>
                  <span>Weather-aware</span>
                  <span>Yours</span>
                </div>
              </div>
            ) : (
              <div className="generated-outfit">
                <div className="generated-heading">
                  <div>
                    <div className="eyebrow">YOUR OUTFIT</div>
                    <h2>{currentOutfit.name}</h2>
                    <p>
                      {currentOutfit.style} · {currentOutfit.activity}
                    </p>
                  </div>

                  <button type="button" className={`circle-button ${currentIsSaved ? "favorite-active" : ""}`} onClick={handleSave} aria-label="Save outfit" title="Save outfit">
                    <Heart size={18} fill={currentIsSaved ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="generated-items">
                  {currentOutfit.items.map((item) => (
                    <article className="generated-item" key={item.id}>
                      <img src={item.image} alt={item.name} />

                      <div className="generated-item-info">
                        <span>{item.category}</span>
                        <strong>{item.name}</strong>
                        <p>
                          {item.color} · {item.style}
                        </p>
                      </div>

                      <Check size={17} className="item-check" />
                    </article>
                  ))}
                </div>

                <div className="outfit-note">
                  <CloudSun size={18} />

                  <p>
                    <strong>AI styling note</strong>
                    <span>{currentOutfit.reason || "These pieces were selected to match your chosen style and occasion."}</span>
                  </p>
                </div>

                {weather && (
                  <div className="outfit-note">
                    <CloudSun size={18} />

                    <p>
                      <strong>Weather in {weather.location.name}</strong>
                      <span>
                        {Math.round(weather.current.temperature)}°C · {weather.current.description}
                        {weather.current.rainProbability !== null ? ` · Rain probability ${weather.current.rainProbability}%` : ""}
                      </span>
                    </p>
                  </div>
                )}

                <div className="generated-actions">
                  <button type="button" className="primary-button" onClick={handleGenerate} disabled={isGenerating}>
                    <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
                    {isGenerating ? "Creating another outfit..." : "Try another combination"}
                  </button>

                  <button type="button" className="secondary-button" onClick={handleSave} disabled={currentIsSaved}>
                    <Heart size={16} />
                    {currentIsSaved ? "Saved" : "Save outfit"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="generator-bottom">
          <div>
            <Sparkles size={18} />

            <div>
              <strong>Make the most of what you own.</strong>
              <p>A thoughtful outfit doesn&apos;t need a new shopping trip.</p>
            </div>
          </div>

          <Link href="/wardrobe">
            Explore wardrobe <ArrowRight size={15} />
          </Link>
        </section>
      </main>
    </>
  );
}
