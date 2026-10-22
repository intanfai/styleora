
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Palette,
  Shirt,
  Sparkles,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";

type Preferences = {
  styleTips: boolean;
  outfitIdeas: boolean;
  compactWardrobe: boolean;
};

const DEFAULTS: Preferences = {
  styleTips: true,
  outfitIdeas: true,
  compactWardrobe: false,
};

const STORAGE_KEY = "styleora-settings";

export default function SettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkUser() {
      const { data, error } = await createClient().auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
          setPreferences({
            ...DEFAULTS,
            ...JSON.parse(stored),
          });
        }
      } catch {
        console.warn("Tidak dapat membaca pengaturan Styleora.");
      }

      setReady(true);
    }

    checkUser();

    return () => {
      active = false;
    };
  }, [router]);

  function updatePreference(
    key: keyof Preferences,
    value: boolean
  ) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
    setSaved(false);
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(preferences)
      );
      setSaved(true);
    } catch {
      window.alert("Pengaturan gagal disimpan di browser.");
    }
  }

  function renderSwitch(
    key: keyof Preferences,
    label: string
  ) {
    return (
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={preferences[key]}
        className={`settings-switch ${
          preferences[key] ? "is-on" : ""
        }`}
        onClick={() => updatePreference(key, !preferences[key])}
      >
        <span />
      </button>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="account-main">
        <header className="account-page-heading">
          <span className="account-eyebrow">MAKE IT YOURS</span>
          <h1>Settings</h1>
          <p>Atur pengalaman menggunakan Styleora.</p>
        </header>

        <section className="account-panel settings-panel">
          <div className="account-panel-heading">
            <div className="account-panel-icon">
              <Bell size={19} />
            </div>
            <div>
              <h2>Preferences</h2>
              <p>Sesuaikan preferensi inspirasi gayamu.</p>
            </div>
          </div>

          <div className="settings-option">
            <div className="settings-option-icon">
              <Sparkles size={18} />
            </div>
            <div className="settings-option-copy">
              <strong>Style tips</strong>
              <p>Tampilkan tips styling di aplikasi.</p>
            </div>
            {renderSwitch("styleTips", "Style tips")}
          </div>

          <div className="settings-option">
            <div className="settings-option-icon">
              <Bell size={18} />
            </div>
            <div className="settings-option-copy">
              <strong>Outfit inspiration</strong>
              <p>Aktifkan preferensi ide dan inspirasi outfit.</p>
            </div>
            {renderSwitch("outfitIdeas", "Outfit inspiration")}
          </div>

          <div className="settings-option">
            <div className="settings-option-icon">
              <Shirt size={18} />
            </div>
            <div className="settings-option-copy">
              <strong>Compact wardrobe cards</strong>
              <p>Preferensi untuk tampilan kartu pakaian ringkas.</p>
            </div>
            {renderSwitch(
              "compactWardrobe",
              "Compact wardrobe cards"
            )}
          </div>
        </section>

        <section className="account-panel settings-panel">
          <div className="account-panel-heading">
            <div className="account-panel-icon">
              <Palette size={19} />
            </div>
            <div>
              <h2>Appearance</h2>
              <p>Tema khas Styleora.</p>
            </div>
          </div>

          <div className="settings-theme-preview">
            <span className="settings-theme-swatch" />
            <div>
              <strong>Soft Sage</strong>
              <p>
                Cream background dengan aksen sage green.
              </p>
            </div>
            <span className="settings-theme-current">
              <Check size={14} /> Current theme
            </span>
          </div>
        </section>

        <div className="settings-save-row">
          {saved && (
            <span className="account-feedback account-feedback-success">
              <Check size={15} /> Pengaturan tersimpan di browser.
            </span>
          )}

          <button
            className="account-save-button"
            disabled={!ready}
            onClick={saveSettings}
          >
            Save preferences
          </button>
        </div>

        <p className="settings-footnote">
          Pengaturan ini disimpan di browser yang sedang digunakan.
          Pengaturan belum tersinkron antarperangkat.
        </p>
      </main>
    </div>
  );
}
