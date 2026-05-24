# NyayaSatya — Master UI Prompt
## Harvey-Inspired · India-First · Institutional-Grade Legal AI Platform
**For: Cursor / Windsurf / v0 / Bolt | Stack: Next.js 15 + Tailwind CSS + Framer Motion**

---

> **How to use:** Feed this entire document to your AI assistant once.
> It will acknowledge the design system, then you request sections one by one (A through H).
> Never ask for the full site at once — build and verify section by section.

---

## THE MASTER PROMPT
> Copy everything below this line and paste into your IDE or v0/Bolt.

---

Act as an Elite UI/UX Engineer and Full-Stack Developer specializing in **Next.js 15 (App Router), TypeScript, Tailwind CSS v4, and Framer Motion**.

I am building the complete marketing landing page + authenticated app shell for **NyayaSatya** — an intelligent legal advisory platform built for India. Think Harvey AI's institutional gravitas, but reimagined for a country of 1.4 billion people who have never had access to legal help before.

The design must feel simultaneously **authoritative enough to be trusted with legal matters** and **warm and accessible enough that a first-generation smartphone user in rural Maharashtra is not intimidated by it.**

This is NOT a generic SaaS landing page. This is a justice platform. The design must carry that weight.

We will build section by section. First, read and acknowledge all rules below. Then wait for my section requests.

---

## 1. GLOBAL DESIGN SYSTEM

### Color Palette — "Nyaya Green" (Monochrome + Purposeful Accent)

```css
:root {
  /* Dark (hero, marketing sections) */
  --bg-dark:          #0A0E0B;   /* near-black with a green undertone — NOT pure black */
  --bg-dark-2:        #111A13;   /* slightly lifted dark for card surfaces */
  --text-primary:     #F0EDE6;   /* warm white — not pure white, feels human */
  --text-secondary:   #8A9E8D;   /* muted sage — secondary text in dark mode */
  --border-dark:      rgba(255, 255, 255, 0.08);

  /* Light (product UI sections, dashboard mockups) */
  --bg-light:         #F7F5F0;   /* warm off-white — NOT cold #FFFFFF */
  --bg-light-2:       #FFFFFF;
  --text-dark:        #1A1F1B;   /* near-black with green undertone */
  --text-muted:       #6B7A6E;
  --border-light:     rgba(0, 0, 0, 0.08);

  /* Brand — used sparingly */
  --green-primary:    #1B4332;   /* deep forest green — the trust color */
  --green-mid:        #2D6A4F;   /* lifted green for hover states */
  --green-bright:     #52B788;   /* accent — ONLY for CTAs, active states, highlights */
  --gold:             #C9A84C;   /* justice gold — used SPARINGLY: 1-2 moments only */
  --gold-muted:       #8B6914;   /* deep gold for secondary accents */
}
```

### Typography — The Dual-Voice System

NyayaSatya speaks in two voices:
- **The Scholar** (headings): authoritative, historic, trustworthy — a serif that feels like jurisprudence
- **The Guide** (body/UI): clear, multilingual-ready, accessible — a sans that works across scripts

```css
/* Import in layout.tsx or global CSS */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Noto+Sans:wght@400;500;600&display=swap');

/* 
  Cormorant Garamond — headings
  Why: Carries gravitas of legal documents. Reminds of constitutional text. 
       The italics are extraordinary for pull quotes.
  
  DM Sans — UI, navigation, buttons, body
  Why: Geometric but warm. Extremely legible at small sizes. Modern but not cold.
  
  Noto Sans — multilingual fallback
  Why: Supports all 10 Indian scripts. Activates when rendering हिन्दी, தமிழ், etc.
*/
```

```js
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["DM Sans", "Noto Sans", "system-ui", "sans-serif"],
      },
      colors: {
        nyaya: {
          dark:         "#0A0E0B",
          dark2:        "#111A13",
          green:        "#1B4332",
          "green-mid":  "#2D6A4F",
          "green-bright":"#52B788",
          gold:         "#C9A84C",
          "gold-muted": "#8B6914",
          warm:         "#F7F5F0",
          text:         "#F0EDE6",
          muted:        "#8A9E8D",
          "text-dark":  "#1A1F1B",
        },
      },
      fontSize: {
        /* Display sizes for hero headings */
        "display-2xl": ["clamp(3rem, 8vw, 7rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        "display-xl":  ["clamp(2.5rem, 6vw, 5.5rem)", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "display-lg":  ["clamp(2rem, 4vw, 3.5rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md":  ["clamp(1.5rem, 3vw, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
      },
      animation: {
        "marquee":       "marquee 40s linear infinite",
        "marquee-pause": "marquee 40s linear infinite paused",
        "fade-up":       "fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in":       "fadeIn 0.6s ease forwards",
      },
      keyframes: {
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

### Animation System — Framer Motion Defaults

```tsx
// src/lib/motion.ts — import these everywhere, never hardcode easing inline

export const EASING = [0.16, 1, 0.3, 1] as const; // premium ease-out-expo

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASING } },
};

export const staggerChildren = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASING } },
};
```

### Layout Rules

```
Max container width: 1280px (max-w-7xl)
Horizontal padding: px-6 (mobile) → px-8 (tablet) → px-12 (desktop)
Section vertical padding: py-24 (mobile) → py-32 (desktop)
Grid gutter: gap-6 (mobile) → gap-8 (desktop)
Border radius: rounded-xl (cards), rounded-2xl (large panels), rounded-full (pills/badges)
```

### The Dual-Theme Contrast Rule

Sections alternate between **dark** (cinematic, marketing) and **light** (clean, product). The transition is abrupt — no gradient between them. The contrast is intentional. It creates rhythm and prevents monotony.

```
Section A — Nav:           DARK (glass)
Section B — Hero:          DARK (video/cinematic)
Section C — Logo marquee:  DARK (seamless continuation)
Section D — Platform:      LIGHT (product trust section)
Section E — Scroll-spy:    DARK (cinematic deep-dive)
Section F — Testimonials:  LIGHT (human, warm)
Section G — Stats + CTA:   DARK (closing cinematic)
Section H — Footer:        DARK (deep, legal)
```

---

## 2. PAGE SECTIONS — BUILD ONE AT A TIME

---

### SECTION A — Global Navigation

**Tone:** Confident, minimal. No clutter. Every pixel earns its place.

```
Structure:
- Sticky top, z-50
- Background: backdrop-blur-md bg-nyaya-dark/70 — glassmorphism
- Left: Logo — "⚖ NyayaSatya" in Cormorant Garamond serif, font-semibold text-nyaya-text
         Below logo: "न्यायसत्य" in tiny Devanagari (Noto Sans) — localization signal
- Center: Nav links in DM Sans, font-medium, text-sm text-nyaya-muted
          Links: Platform | For Lawyers | How It Works | About
          Hover: text-nyaya-text with a 2px underline in --green-bright color
- Right: 
          "Sign In" — ghost button, text-nyaya-text border border-white/20
          "Get Free Help →" — filled button, bg-nyaya-green-bright text-nyaya-dark font-semibold
          "Are you a Lawyer?" — tiny text link in text-nyaya-muted below the main CTA
- Mobile: hamburger opens a full-screen overlay drawer
          Drawer is DARK background, links are massive Cormorant Garamond serif

Technical:
- Add scroll listener: when scrollY > 60, increase backdrop-blur and add a bottom border border-white/10
- The logo scales from text-xl to text-lg as user scrolls (Framer Motion useScroll + useTransform)
```

---

### SECTION B — Hero Section

**Tone:** Cinematic, just, weighty. The first 3 seconds must communicate: "This platform is serious and it is for you."

```
Layout: min-h-[100svh], flex items-center justify-center, relative overflow-hidden

Background: 
  Option 1 (with video): 
    <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-30">
      <source src="/videos/india-courts.webm" type="video/webm" />
    </video>
    + gradient overlay: bg-gradient-to-b from-nyaya-dark/80 via-nyaya-dark/60 to-nyaya-dark
  
  Option 2 (no video — use as fallback):
    A CSS grain texture overlay on top of nyaya-dark background
    + abstract topographic lines pattern (SVG, very low opacity)
    + a single large radial gradient in nyaya-green at 5% opacity emanating from center

Content (centered, max-w-4xl mx-auto, text-center):

  EYEBROW (above headline):
    Small pill badge: 
    <span class="bg-nyaya-green/20 text-nyaya-green-bright border border-nyaya-green/30 
                  text-xs font-medium px-4 py-1.5 rounded-full tracking-widest uppercase">
      India's Legal AI Platform
    </span>

  HEADLINE (Cormorant Garamond, display-2xl):
    Line 1: "Every Indian Deserves"
    Line 2 (italic): "to Know Their Rights."
    
    The word "Know" in italic Cormorant — italics create emphasis like no bold can.
    Animate: staggered word reveal using Framer Motion, each word fades up with 0.08s delay

  SUBHEADLINE (DM Sans, text-lg, text-nyaya-muted, max-w-xl mx-auto, mt-6):
    "Ask any legal question in your language. Get answers grounded in real Indian law — 
    cited, verified, and explained in plain terms."

  LANGUAGE ROW (mt-4):
    Small text: "Ask in:" followed by language pills:
    हिन्दी · தமிழ் · తెలుగు · বাংলা · मराठी · ગુજરાતી + 5 more
    Each language rendered in Noto Sans (correct script rendering)
    Animate: slides in from left after headline animation completes

  CTA ROW (mt-10, flex gap-4 justify-center flex-wrap):
    Primary: Large button — "Ask Your First Question →"
             bg-nyaya-green-bright text-nyaya-dark font-semibold text-base px-8 py-4 rounded-xl
             Hover: scale-[1.02] transition + shadow-lg shadow-nyaya-green-bright/25
    
    Secondary: Ghost button — "Register as a Lawyer"
               border border-white/20 text-nyaya-text px-8 py-4 rounded-xl
               Hover: bg-white/5

  TRUST SIGNAL (mt-12, text-center):
    Small text in text-nyaya-muted text-xs:
    "Free for individuals · Verified Indian legal corpus · Built for Bharat"

  SCROLL INDICATOR (absolute bottom-8, left-50%, animate-bounce):
    Small chevron-down icon in text-nyaya-muted/50
```

---

### SECTION C — Client Trust Marquee

**Tone:** Proof without boasting. Let the logos speak.

```
This section directly follows the Hero with NO gap — seamless dark continuation.

Top border: a 1px line in border-white/10

Label (centered above marquee, text-xs text-nyaya-muted tracking-widest uppercase):
  "Trusted by lawyers, NGOs & legal aid organizations across India"

Two-row marquee (each row scrolling in OPPOSITE directions):
  Row 1 scrolls LEFT: Logo SVGs / partner names in text
  Row 2 scrolls RIGHT: More partners

Logo treatment:
  - All logos: filter grayscale opacity-40 hover:opacity-80 hover:grayscale-0 transition-all duration-500
  - For MVP (no real logos yet): Use text-based partner names in a monospaced/caps style
    e.g.: NALSA · iJustice · Nyaaya.org · Indian Kanoon · DLSA · CHRI · PUCL · HAQ Centre
  - Each name separated by a small ⚖ symbol in nyaya-green-bright color

CSS:
  .marquee-track {
    display: flex;
    width: max-content;
    animation: marquee 35s linear infinite;
  }
  /* Duplicate the content inside for seamless loop */

Gradient fade edges:
  .marquee-container::before, .marquee-container::after {
    content: '';
    position: absolute;
    top: 0; bottom: 0;
    width: 120px;
    z-index: 2;
  }
  ::before { left: 0; background: linear-gradient(to right, #0A0E0B, transparent); }
  ::after { right: 0; background: linear-gradient(to left, #0A0E0B, transparent); }
```

---

### SECTION D — Platform Features (Light Mode Product Showcase)

**Tone:** ABRUPT switch to warm off-white (#F7F5F0). Clean, trustworthy, functional. This section shows the PRODUCT, not the dream.

```
The background switches from #0A0E0B to #F7F5F0 with NO transition — raw contrast.

Section label (eyebrow):
  "The Platform"

Headline (Cormorant, display-xl, text-nyaya-text-dark):
  "Two modes. One truth."

Subtext (DM Sans):
  "Choose quick general awareness or source-grounded verified answers from real Indian statutes."

FEATURE CARDS — 2-column grid (md:grid-cols-2), gap-6:

CARD 1 — Fast Mode:
  Background: White, rounded-2xl, border border-nyaya-dark/8, shadow-sm
  
  Top badge: ⚡ "Quick Answer" in bg-amber-50 text-amber-700 border border-amber-200
  
  Title (Cormorant, text-3xl): "Instant Legal Awareness"
  
  Body (DM Sans, text-base, text-nyaya-text-muted):
    "Ask anything. Get a clear, plain-language answer with the relevant law named.
    In under 3 seconds. In your language."
  
  MOCK UI inside card (the Harvey-style product screenshot trick):
    Simulate a chat interface in a rounded-xl inner box with bg-nyaya-warm border border-black/8:
    
    User message bubble (right-aligned, bg-nyaya-green text-white):
      "क्या मेरा मकान मालिक बिना नोटिस दिए मुझे निकाल सकता है?"
    
    AI response (left-aligned, white bg, shadow-sm):
      Small "⚡ Quick Answer" badge
      Response text: "नहीं। किसी भी किरायेदार को बिना नोटिस के नहीं..."
      Bottom: Law tag — "Maharashtra Rent Control Act, 1999"
    
    Needs lawyer banner (yellow, full width, rounded-lg, small text):
      "⚠ This situation may benefit from professional advice — Find a Lawyer →"

CARD 2 — Verified Mode:
  Background: nyaya-green (#1B4332), rounded-2xl — DARK card in a light section (intentional contrast)
  Text: nyaya-text (#F0EDE6)
  
  Top badge: 🔍 "Verified Answer" in bg-nyaya-green-bright/20 text-nyaya-green-bright border border-nyaya-green-bright/30
  
  Title (Cormorant, text-3xl, text-nyaya-text): "Source-Grounded Answers"
  
  Body (DM Sans, text-nyaya-muted):
    "Every answer cited to the exact statute, section, or landmark judgement. 
    Hallucination-guarded. Legally traceable."
  
  MOCK UI inside card (dark inner surface):
    Query shown, then answer with [1] [2] citation markers
    
    Citations panel below:
      [1] IPC Section 498A — text excerpt in small mono font
      [2] Arnesh Kumar v. State of Bihar (SC, 2014) — excerpt
    
    Confidence badge: 🟢 "High Confidence · Hallucination guard passed"

Below the 2 cards — 3-column feature grid (md:grid-cols-3), smaller cards:
  Card A: 📍 GPS Lawyer Finder — "Top 5 verified lawyers near you, ranked by specialisation"
  Card B: 📄 Document Scanner — "Upload any legal document. Get plain-language risk analysis."
  Card C: 🆘 SOS Legal Help — "Emergency legal guidance for arrest, domestic violence, accidents."
  
  Each small card: white bg, border border-black/8, rounded-xl, p-6
  Icon: 40x40 rounded-lg bg-nyaya-green/10 flex items-center justify-center
```

---

### SECTION E — Scroll-Spy Feature Deep Dive

**Tone:** Returns to DARK. Slow, immersive. Harvey's most iconic UI pattern — adapted for NyayaSatya.

```
Background: #0A0E0B (back to dark)

Layout: Two columns, sticky left / scrolling right
  Left column (sticky top-1/3, w-40%):
    Eyebrow: "What NyayaSatya does"
    
    Vertical feature list — Cormorant Garamond, text-4xl, each item on its own line:
    
    01  Legal Q&A
    02  Verified RAG
    03  Voice in Hindi
    04  Lawyer Matching
    05  Document Scan
    06  SOS Emergency
    
    Active item: opacity-100, text-nyaya-text, + a 2px left border in nyaya-green-bright
    Inactive: opacity-20, no border
    
    Framer Motion implementation:
      useScroll({ target: containerRef, offset: ["start start", "end end"] })
      Divide 0→1 scroll progress into N equal segments (one per feature)
      useTransform to map current progress to activeIndex
      Each list item: animate opacity based on (index === activeIndex)

  Right column (scrolling, space-y-[40vh] — lots of breathing room between panels):
    
    For each feature, a content panel fades in as it becomes active:
    
    Panel 01 — Legal Q&A:
      Large Cormorant italic heading: "Ask in any language. Understand in yours."
      Body text in DM Sans explaining Fast Mode
      Small UI mockup (the Hindi chat bubble from Section D, repeated in dark styling)
      Stat: "< 3 seconds · 10 Indian languages"
    
    Panel 02 — Verified RAG:
      Heading: "Every answer has a source. Every source is real."
      Body text explaining Verified Mode + hallucination guard
      Visual: a citation card component (dark themed) showing [1] Act + Section + excerpt
      Stat: "ILDC + India Code + Indian Kanoon corpus"
    
    Panel 03 — Voice in Hindi:
      Heading: "Speak. We listen. The law answers."
      Body: Voice-first design for users who cannot type
      Visual: waveform animation (CSS only — 5 bars animating height with staggered delays)
      Stat: "10 regional languages · 800ms response"
    
    Panel 04 — Lawyer Matching:
      Heading: "The right lawyer. Right now. Right here."
      Visual: 3 LawyerCards in dark mode (name, specialisation, distance, rating)
      Stat: "GPS-ranked · Verified Bar Council enrollment"
    
    Panel 05 — Document Scanner:
      Heading: "What does this document actually mean for you?"
      Visual: A document with highlighted "risk clauses" in red, green sections marked safe
      Risk meter: 0-100 gauge in nyaya-green-bright → amber → red
      Stat: "Rental agreements · Employment contracts · Court summons"
    
    Panel 06 — SOS Emergency:
      Heading: "Know your rights in the first 60 seconds."
      Body: "For arrests, domestic violence, and accidents — immediate step-by-step guidance."
      Visual: SOS button (red, pulsing) + the 3 scenario icons
      Color: This panel uses a subtle red tint — the only moment of red in the whole site

Mobile adaptation:
  The sticky left column becomes a horizontal scrolling pill selector at the top
  Tap a pill to scroll to that feature panel
```

---

### SECTION F — Testimonials / Social Proof

**Tone:** Returns to LIGHT (#F7F5F0). Human, warm, emotional. People, not logos.

```
Background: nyaya-warm (#F7F5F0)

Eyebrow: "Impact stories"
Headline (Cormorant, display-lg, text-nyaya-text-dark):
  "Real people. Real questions. Real answers."

Layout: Asymmetric quote layout (Harvey's style, adapted)

FEATURED QUOTE (large, hero testimonial):
  Left: Portrait image (circular, 120px, with a thin ring in nyaya-green-bright)
        Below: Name in DM Sans font-semibold
               Role in small text: "Factory worker, Pune"
  Right: Large Cormorant italic blockquote (text-3xl):
    '"मुझे नहीं पता था कि मैं ओवरटाइम के लिए दावा कर सकता हूँ। 
    NyayaSatya ने मुझे Payment of Wages Act Section 14 बताया।"'
    
    — Ramesh Jadhav, Pune (English translation below in small DM Sans)
    
  This entire block has a left border: 4px solid nyaya-green-bright

SECONDARY QUOTES — 3-column grid (md:grid-cols-3):
  Each card: white bg, rounded-xl, p-6, border border-black/8
  
  Quote text in DM Sans italic (not Cormorant — keeps it grounded)
  Name + role below, small
  A single relevant law mentioned: "Consumer Protection Act was cited"
  
  Quote 1: Tenant who found out landlord couldn't evict without court order
  Quote 2: Woman who learned about PWDVA protection using SOS feature
  Quote 3: Small shop owner who understood GST complaint rights

LAWYER TESTIMONIAL (different treatment — dark card):
  Dark card (nyaya-green bg), full-width or half-width
  Text: "As a lawyer, I've seen clients come in not knowing they had rights. 
         NyayaSatya closes that gap before they reach my office."
  — Advocate Priya Nair, Kerala High Court
  Badge: "Verified Partner Advocate" with a checkmark
```

---

### SECTION G — Stats + Final CTA

**Tone:** Back to DARK. Cinematic close. Confident numbers. A final invitation.

```
Background: Back to #0A0E0B

STATS ROW — 4 columns, centered:
  Stat 1: "10" large Cormorant serif number + "Indian languages supported"
  Stat 2: "3 sec" + "Fast Mode answer time"
  Stat 3: "₹0" + "Cost for basic legal awareness"  ← this hits differently than "Free"
  Stat 4: "76%" + "of Indians lack access to legal help — we're changing that"
  
  Each stat: number in Cormorant display-xl nyaya-green-bright, label in DM Sans text-nyaya-muted text-sm

DIVIDER: thin line in border-white/10, my-16

FINAL CTA BLOCK (centered, max-w-2xl mx-auto):
  
  Headline (Cormorant, display-xl, italic):
    "The right to justice is meaningless without the knowledge that it exists."
  
  Attribution (DM Sans, text-nyaya-muted, text-sm, mt-4):
    — NyayaSatya Mission Statement
  
  CTA Buttons (mt-10, flex gap-4 justify-center flex-wrap):
    Primary: "Ask Your First Question — It's Free"
             Large, bg-nyaya-green-bright, text-nyaya-dark
    Secondary: "Register as a Lawyer →"
               Border ghost button
  
  Small trust text below (text-xs, text-nyaya-muted):
    "No signup required for basic queries · 
     Verified Indian legal corpus · 
     Disclaimer: General information, not legal advice"
```

---

### SECTION H — Footer

**Tone:** Dense, clean, institutional. Dark, authoritative.

```
Background: #0A0E0B (continuous from Section G)
Top border: 1px border-white/10

LOGO + MISSION (left column):
  Logo: ⚖ NyayaSatya (Cormorant, large)
  Devanagari: न्यायसत्य (Noto Sans)
  Tagline (DM Sans, text-nyaya-muted, text-sm, max-w-xs, mt-3):
    "Democratising legal knowledge for every Indian — fast answers, cited truth, human dignity."

NAV COLUMNS (3 columns):
  Platform: Quick Answer · Verified Answers · Voice Agent · SOS Help · Document Scanner
  For Lawyers: Register as Lawyer · Verify Your Profile · Lawyer Dashboard
  Company: About · Security · Privacy Policy · Terms · Contact

TRUST BADGES ROW (bottom, border-t border-white/10, pt-6):
  Left: "© 2026 NyayaSatya. All rights reserved."
  Center: Language pills — EN · हि · த · తె · বা + 6 more
  Right: Compliance text — "DPDP Act 2023 Compliant · End-to-end encrypted"

CRITICAL LEGAL DISCLAIMER (full-width, text-center, text-xs, text-nyaya-muted/60, mt-4):
  "NyayaSatya provides general legal information, not legal advice. 
   For advice specific to your situation, consult a qualified advocate."
```

---

## 3. AUTHENTICATED APP SHELL (After Login)

### Design language for the product app (separate from landing):

```
The app uses LIGHT mode as default (product trust > cinematic marketing).
Background: #F7F5F0 (warm off-white)

Sidebar (desktop, 260px wide):
  Background: white, right border border-black/8
  
  Top: Logo + user avatar + role badge ("User" or "Verified Lawyer" or "Admin")
  
  Nav items (DM Sans, text-sm, font-medium):
    ⚡ Quick Answer
    🔍 Verified Answer  
    📍 Find a Lawyer
    📄 My Documents
    ⚖ Query History
    ⚙ Settings
  
  Active item: bg-nyaya-green/10 text-nyaya-green border-r-2 border-nyaya-green-bright
  
  Bottom: "Upgrade to Premium" card (if free tier)
          Small, rounded-xl, bg-nyaya-green text-nyaya-text
          "₹99/month for unlimited Verified Mode queries"

Top bar:
  Search: "Ask a legal question..." (placeholder activates the query modal)
  Right: Notification bell + avatar dropdown

Main area (variable):
  Standard card containers: white bg, rounded-2xl, border border-black/8, p-6

Query interface:
  Mode toggle (⚡ Quick / 🔍 Verified): pill-style toggle at top
  Large textarea: DM Sans, text-base, clean border, no shadows — very minimal
  Language selector: compact icon dropdown
  Submit: "Ask →" button in nyaya-green-bright

Answer display:
  Fast Mode: streaming text, law badge, needs-lawyer banner (if applicable)
  Verified Mode: streamed answer + collapsible citations drawer at bottom
  
  Both: thumbs up/down, copy, "Ask follow-up" button

Lawyer dashboard (when user_role = lawyer + verified):
  Stats row: Queries referred / Profile views / Reviews received
  Profile preview panel (how users see the lawyer)
  Verification status badge (green "Verified Advocate" with BCI number)
```

---

## 4. MOBILE-SPECIFIC RULES

```
These rules apply site-wide and override desktop patterns where noted:

1. Hero headline clamps to text-4xl max on mobile — no display-2xl
2. Scroll-spy section becomes a horizontal tab bar (pinned top) + full-width panels below
3. All modals become bottom sheets (slide up from bottom, rounded-t-2xl)
4. Language selector opens as bottom sheet (not dropdown)
5. LawyerCards in single column, condensed
6. Marquee speed slows on mobile (motion reduced preference check)
7. SOS button: always fixed bottom-right, 56x56px, bg-red-600, z-50
   Pulsing ring: ::after pseudo with scale animation
8. Min touch target: 44x44px on ALL interactive elements
9. No horizontal scroll at 320px — test every section
10. Bottom navigation bar for app (not sidebar):
    5 icons: Home · Ask · Lawyers · Docs · Profile
```

---

## 5. COMPONENT QUICK-REFERENCE

```
All reusable components live in: src/components/ui/

NyayaBadge: 
  props: variant ("fast" | "verified" | "sos" | "verified-lawyer" | "pending")
  Each variant has its own bg/text/border color preset

NyayaButton:
  props: variant ("primary" | "ghost" | "danger"), size ("sm" | "md" | "lg")
  Primary: bg-nyaya-green-bright text-nyaya-dark
  Ghost: border border-white/20 text-nyaya-text (dark) or border-black/20 text-nyaya-text-dark (light)

NyayaCard:
  props: theme ("light" | "dark" | "green")
  Light: white bg, border-black/8, shadow-sm
  Dark: nyaya-dark2 bg, border-white/8
  Green: nyaya-green bg (for featured/CTA cards)

CitationCard:
  props: index, actName, section, caseName, court, year, excerpt
  Compact, monospaced index number, expandable excerpt

LawyerCard:
  props: lawyer (LawyerResult type), showPhone (boolean)
  Specialisation badges color-coded:
    criminal → bg-red-50 text-red-700
    family → bg-pink-50 text-pink-700
    labour → bg-blue-50 text-blue-700
    property → bg-green-50 text-green-700
    consumer → bg-teal-50 text-teal-700
    civil → bg-gray-50 text-gray-700
    constitutional → bg-purple-50 text-purple-700
    corporate → bg-orange-50 text-orange-700

RiskMeter:
  props: score (0-1), tier ("low" | "medium" | "high")
  Arc gauge, color: green (0-0.3) → amber (0.3-0.6) → red (0.6-1.0)
  Framer Motion animate the arc on mount

BottomSheet (mobile modal):
  Framer Motion AnimatePresence + y: "100%" → y: 0
  Backdrop: bg-black/50 backdrop-blur-sm
  Handle bar at top: rounded-full w-12 h-1 bg-black/20 mx-auto mt-3

LanguageSelector:
  Desktop: <select> with native script names
  Mobile: BottomSheet with large tap targets (min-h-[56px] per option)
  Each option: language name in native script + "(English name)" in small text
```

---

## 6. EXECUTION PROTOCOL

**Rules for the AI building this:**

1. Do NOT generate the entire site at once. Build one section per request.
2. Every section must be a standalone Next.js Server Component unless it uses `useScroll`/`useRef` — those get `"use client"` at the top.
3. All Framer Motion variants import from `src/lib/motion.ts` — never inline.
4. All color values use Tailwind config tokens (e.g., `bg-nyaya-green`) — never raw hex inline in JSX.
5. Every section must pass at 320px width with no horizontal overflow.
6. The SOS button component is a fixed-position element rendered in `layout.tsx` — not inside any section.
7. Multilingual text (Hindi, Tamil, etc.) always wraps in `<span lang="hi" className="font-sans">` to trigger correct Noto Sans script rendering.
8. `prefers-reduced-motion` media query respected — all Framer Motion animations check `const prefersReduced = useReducedMotion()`.
9. Images use `next/image` with proper `sizes` prop. No raw `<img>` tags.
10. Lighthouse target: Performance > 85, Accessibility > 95 on mobile.

**Section build order (request these one by one):**
```
→ "Build Section A: Navigation"
→ "Build Section B: Hero"
→ "Build Section C: Logo Marquee"
→ "Build Section D: Platform Features (Light Mode)"
→ "Build Section E: Scroll-Spy Deep Dive"
→ "Build Section F: Testimonials"
→ "Build Section G: Stats + Final CTA"
→ "Build Section H: Footer"
→ "Build the App Shell: Sidebar + Top Bar"
→ "Build the Query Interface Component"
→ "Build the LawyerCard Component"
→ "Build the CitationCard Component"
→ "Build the RiskMeter Component"
→ "Build the BottomSheet Component"
```

Start now: Confirm you understand the design system. Output `tailwind.config.ts` and `src/app/layout.tsx` with the Google Fonts import, CSS variables in `globals.css`, and the `src/lib/motion.ts` file. Then wait for my section requests.

---

*NyayaSatya Master UI Prompt · v1.0 · May 2026*
*Harvey-inspired institutional gravitas · India-first warmth · Justice by design*
