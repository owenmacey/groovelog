import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { FeaturedReviews } from "./FeaturedReviews";

export const metadata: Metadata = {
  title: "Groovelog — Your music, rated.",
};

function VinylRecord() {
  return (
    <svg
      viewBox="0 0 400 400"
      width="640"
      height="640"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="200" cy="200" r="198" fill="#13110D" />
      {/* Groove rings */}
      {[188, 175, 162, 149, 136, 123, 110, 97, 84].map((r) => (
        <circle
          key={r}
          cx="200"
          cy="200"
          r={r}
          fill="none"
          stroke="#D6A040"
          strokeWidth="0.4"
          opacity="0.35"
        />
      ))}
      {/* Center label */}
      <circle cx="200" cy="200" r="52" fill="rgba(214,160,64,0.12)" />
      <circle cx="200" cy="200" r="38" fill="rgba(214,160,64,0.08)" />
      {/* Spindle */}
      <circle cx="200" cy="200" r="5" fill="rgba(214,160,64,0.5)" />
      <circle cx="200" cy="200" r="2.5" fill="#0D0C0A" />
    </svg>
  );
}


export default function LandingPage() {
  return (
    <div className="noise-overlay relative min-h-screen bg-bg-base overflow-x-hidden">
      {/* Gold radial pulse */}
      <div className="gold-radial-pulse" aria-hidden="true" />

      {/* Navbar */}
      <Navbar />

      {/* Hero */}
      <section
        className="relative z-10 flex flex-col items-center justify-center px-6 pb-16 text-center"
        style={{ minHeight: "calc(100svh - 3.5rem)" }}
      >
        {/* Spinning vinyl record — very faint behind the title */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div className="vinyl-spin" style={{ opacity: 0.04 }}>
            <VinylRecord />
          </div>
        </div>

        {/* Floating music notes */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <span
            className="absolute float-note-1 text-accent-gold"
            style={{ left: "18%", bottom: "38%", fontSize: "1.5rem", opacity: 0.18 }}
          >
            ♪
          </span>
          <span
            className="absolute float-note-2 text-accent-gold"
            style={{ left: "76%", bottom: "42%", fontSize: "1.1rem", opacity: 0.13 }}
          >
            ♫
          </span>
          <span
            className="absolute float-note-3 text-accent-gold"
            style={{ left: "60%", bottom: "28%", fontSize: "1.8rem", opacity: 0.1 }}
          >
            ♩
          </span>
        </div>

        {/* Title */}
        <div className="animate-in stagger-1 relative z-10 mb-6">
          <h1
            className="font-display text-7xl sm:text-8xl font-bold text-text-primary leading-none tracking-tight"
            style={{ textShadow: "0 0 120px rgba(214, 160, 64, 0.3)" }}
          >
            Groovelog
          </h1>
        </div>

        {/* Tagline */}
        <div className="animate-in stagger-2 relative z-10 mb-10">
          <p className="text-xl sm:text-2xl text-text-secondary leading-relaxed">
            Rate albums.{" "}
            <span className="text-text-tertiary">Write reviews.</span>
            <br />
            <span className="text-accent-gold font-medium">Share your taste.</span>
          </p>
        </div>

        {/* CTAs */}
        <div className="animate-in stagger-3 flex items-center gap-3 relative z-10">
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-11 px-7 text-base rounded-md bg-accent-gold text-text-inverse font-medium hover:bg-accent-amber transition-colors"
          >
            Start Rating
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-7 text-base rounded-md bg-bg-elevated border border-border-default text-text-primary hover:border-border-strong transition-colors"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Featured reviews */}
      <section className="relative z-10 pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-medium text-text-tertiary uppercase tracking-widest mb-8">
            From the community
          </p>

          <FeaturedReviews />

          <p className="text-center mt-16 text-sm text-text-tertiary">
            Already have an account?{" "}
            <Link href="/login" className="text-accent-gold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
