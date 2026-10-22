
"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, ShieldCheck, UserRound } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();

        if (!active) return;

        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        setEmail(data.user.email ?? "");
        setName(
          String(
            data.user.user_metadata?.full_name ??
              data.user.user_metadata?.name ??
              ""
          )
        );
      } catch (err) {
        console.error("Gagal memuat akun:", err);

        if (active) {
          setError(
            "Gagal memuat informasi akun. Silakan coba lagi."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setName(
        String(
          data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            name.trim()
        )
      );

      setMessage("Profil berhasil diperbarui.");
    } catch (err) {
      console.error("Gagal menyimpan profil:", err);
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />

        <main className="account-main">
          <p>Memuat informasi akun...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="account-main">
        <header className="account-page-heading">
          <span className="account-eyebrow">YOUR SPACE</span>
          <h1>My Account</h1>
          <p>Kelola informasi profil akun Styleora kamu.</p>
        </header>

        <section className="account-profile-hero">
          <div className="account-avatar-large">
            {(name || email || "S").charAt(0).toUpperCase()}
          </div>

          <div>
            <span className="account-eyebrow">STYLEORA MEMBER</span>
            <h2>{name || email.split("@")[0]}</h2>
            <p>{email}</p>
          </div>

          <span className="account-verified">
            <ShieldCheck size={15} />
            Account active
          </span>
        </section>

        <section className="account-panel">
          <div className="account-panel-heading">
            <div className="account-panel-icon">
              <UserRound size={19} />
            </div>

            <div>
              <h2>Personal information</h2>
              <p>Perbarui nama yang ditampilkan di profilmu.</p>
            </div>
          </div>

          <form className="account-form" onSubmit={saveProfile}>
            <label className="account-field">
              <span>Display name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Masukkan nama"
                maxLength={80}
              />
            </label>

            <label className="account-field">
              <span>Email address</span>

              <div className="account-readonly">
                <Mail size={16} />
                <input
                  type="email"
                  value={email}
                  readOnly
                  aria-label="Email address"
                />
              </div>
            </label>

            {error && (
              <p
                className="account-feedback account-feedback-error"
                role="alert"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                className="account-feedback account-feedback-success"
                role="status"
              >
                <Check size={15} />
                {message}
              </p>
            )}

            <div className="account-form-actions">
              <button
                className="account-save-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        <section className="account-panel">
          <div className="account-panel-heading">
            <div className="account-panel-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h2>Sign-in and security</h2>
              <p>
                Informasi autentikasi dikelola melalui Supabase.
              </p>
            </div>
          </div>

          <div className="account-security-row">
            <div>
              <strong>Email akun</strong>
              <p>{email}</p>
            </div>

            <span className="account-security-badge">Active</span>
          </div>

          <p className="account-note">
            Perubahan email atau kata sandi perlu dilakukan melalui
            alur autentikasi yang sesuai dengan metode login akunmu.
          </p>
        </section>
      </main>
    </div>
  );
}
