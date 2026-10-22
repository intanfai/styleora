"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Shirt, ArrowRight, Leaf, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.3 0 24 0 14.6 0 6.5 5.4 3 13.3l7.8 6.1C12.5 13.2 17.8 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.6 2.9-2.2 5.4-4.6 7.1l7.3 5.7c4.3-4 7-10 7-17.3Z" />
      <path fill="#FBBC05" d="M10.8 28.6a14.5 14.5 0 0 1 0-9.2L3 13.3a24 24 0 0 0 0 21.4l7.8-6.1Z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-6.2l-7.3-5.7c-2 1.3-4.6 2.1-8.2 2.1-6.2 0-11.5-3.7-13.2-9.1L3 35.2C6.5 42.6 14.6 48 24 48Z" />
    </svg>
  );
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password harus terdiri dari minimal 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user && data.user.identities?.length === 0) {
        setError("Email ini sudah terdaftar. Silakan login atau gunakan email lain.");
        return;
      }

      setSuccess("Akun berhasil didaftarkan. Periksa email kamu untuk mengonfirmasi akun sebelum login.");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch {
      setError("Tidak dapat menghubungkan akun Google.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f4ed] px-4 py-8 text-[#30342d] sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#e8e6dc] bg-[#fffefa] shadow-[0_24px_80px_rgba(57,65,47,0.09)] lg:min-h-170 lg:grid-cols-2">
        <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
          <Link href="/" className="mb-10 inline-flex w-fit items-center gap-3">
            <span className="brand-icon">
              <Leaf size={21} />
            </span>

            <span className="text-2xl font-semibold tracking-tight text-[#40513b]">
              styleora<span className="text-[#a2a891]">.</span>
            </span>
          </Link>

          <div className="mb-7">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#edf0e6] px-3 py-1.5 text-xs font-medium text-[#64745c]">
              <Leaf size={13} />
              START YOUR STYLE JOURNEY
            </span>
            <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-[42px]">Find your style.</h1>
            <p className="mt-3 text-sm leading-6 text-[#85867d]">Create an account and make the most of every piece in your wardrobe.</p>
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <div role="status" className="mb-4 rounded-xl border border-[#dce5d4] bg-[#f0f4eb] px-4 py-3 text-sm leading-6 text-[#52634c]">
              {success}
              <Link href="/login" className="ml-1 font-semibold underline underline-offset-4">
                Go to login
              </Link>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Full name
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-[#e6e4da] bg-white px-4 transition focus-within:border-[#84927b] focus-within:ring-4 focus-within:ring-[#687961]/10">
                <UserRound size={18} className="shrink-0 text-[#a1a195]" />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#b2b1a7]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email address
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-[#e6e4da] bg-white px-4 transition focus-within:border-[#84927b] focus-within:ring-4 focus-within:ring-[#687961]/10">
                <Mail size={18} className="shrink-0 text-[#a1a195]" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#b2b1a7]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">
                Password
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-[#e6e4da] bg-white px-4 transition focus-within:border-[#84927b] focus-within:ring-4 focus-within:ring-[#687961]/10">
                <Lock size={18} className="shrink-0 text-[#a1a195]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#b2b1a7]"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="shrink-0 text-[#999b90] transition hover:text-[#40513b]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#687961] py-3.5 text-sm font-semibold text-white transition hover:bg-[#52634c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create your account"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#e9e7de]" />
            <span className="text-[10px] font-medium tracking-[0.15em] text-[#a3a397]">OR SIGN UP WITH</span>
            <div className="h-px flex-1 bg-[#e9e7de]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#e6e4da] bg-white py-3.5 text-sm font-medium transition hover:bg-[#f8f7f1] disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-7 text-center text-sm text-[#85867d]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#52634c] underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </section>

        <aside className="relative hidden overflow-hidden bg-[#e9ece1] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 -top-16 h-72 w-72 rounded-full border border-[#cbd2c1] opacity-70" />
          <div className="absolute -right-8 -top-4 h-48 w-48 rounded-full border border-[#cbd2c1] opacity-70" />
          <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#dce2d3]" />

          <div className="relative z-10 flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-[#687961]">
            <Leaf size={15} />
            LESS CLOTHES, MORE POSSIBILITIES
          </div>

          <div className="relative z-10 mx-auto max-w-sm py-10">
            <div className="mb-7 flex aspect-[4/4.3] items-center justify-center rounded-[180px_180px_28px_28px] border border-white/70 bg-[#dfe4d6] p-8">
              <div className="flex h-full w-full flex-col items-center justify-center rounded-[150px_150px_18px_18px] bg-[#f5f4ed] text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#e4e9dc] text-[#687961]">
                  <Shirt size={39} strokeWidth={1.2} />
                </div>
                <span className="font-serif text-3xl text-[#40513b]">Your closet,</span>
                <span className="font-serif text-3xl italic text-[#7d8b71]">your story.</span>
                <p className="mt-4 max-w-47.5 text-xs leading-5 text-[#85867d]">Discover new combinations from the clothes you already own.</p>
              </div>
            </div>
            <p className="text-center font-serif text-xl italic text-[#52634c]">&ldquo;Your style starts here.&rdquo;</p>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px] text-[#85867d]">
            <span>YOUR CLOSET, REIMAGINED</span>
            <span>EST. STYLEORA</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
