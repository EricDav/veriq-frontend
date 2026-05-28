# Veriq Property — Next.js Web App

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (custom design system)
- **PWA**: Custom Service Worker + Web App Manifest
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Project Structure

```
veriq-next/
├── app/
│   ├── layout.tsx              # Root layout (Navbar + Footer + PWA register)
│   ├── page.tsx                # Home page
│   ├── globals.css             # Global styles + Tailwind
│   ├── about/page.tsx          # About Us
│   ├── contact/page.tsx        # Contact Us
│   ├── faq/page.tsx            # FAQ (interactive accordion)
│   ├── terms/page.tsx          # Terms of Service + Privacy + Agent Terms
│   ├── offline/page.tsx        # PWA offline fallback page
│   ├── pwa-register.tsx        # Client-side SW registration
│   ├── properties/
│   │   ├── page.tsx            # Property listings with filters
│   │   └── [id]/page.tsx       # Property detail + intelligence unlock
│   ├── auth/
│   │   ├── login/page.tsx      # Login
│   │   └── register/page.tsx   # Register (user or agent)
│   └── dashboard/
│       ├── layout.tsx          # Dashboard sidebar layout
│       ├── page.tsx            # Dashboard home
│       ├── properties/page.tsx # Unlocked properties
│       ├── saved/page.tsx      # Saved properties
│       ├── agent/page.tsx      # Agent analytics & listings
│       └── profile/page.tsx    # Profile & settings
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # Sticky, transparent-to-solid navbar
│   │   └── Footer.tsx          # Full footer with social links
│   ├── home/
│   │   ├── Hero.tsx            # Hero section with animated card mockup
│   │   ├── Features.tsx        # 8-feature grid
│   │   ├── HowItWorks.tsx      # 4-step process
│   │   ├── TrustStats.tsx      # Stats + testimonials on dark bg
│   │   └── CTA.tsx             # Call-to-action section
│   └── properties/
│       └── PropertyCard.tsx    # Reusable property card
├── lib/
│   └── utils.ts                # cn(), formatCurrency(), truncate()
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   └── icons/                  # PWA icons (replace with real icons)
├── tailwind.config.ts          # Custom colors, animations, shadows
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Getting Started

### 1. Install dependencies

```bash
cd veriq-next
npm install
```

### 2. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Build for production

```bash
npm run build
npm run start
```

## PWA Setup

### Icons
Generate proper PWA icons (72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512) and place them in `/public/icons/`. 

Recommended tools:
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### Service Worker
The service worker at `/public/sw.js` handles:
- Static asset caching (cache-first)
- Navigation caching (network-first with offline fallback)
- Push notifications (structure ready)

## Environment Variables

Create `.env.local`:

```env
# App
NEXT_PUBLIC_APP_URL=https://veriqproperty.com
NEXT_PUBLIC_APP_NAME="Veriq Property"

# API (when backend is ready)
NEXT_PUBLIC_API_URL=https://api.veriqproperty.com

# Payment (Paystack)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...

# Firebase (if using for auth/notifications)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

## Design System

### Colors (defined in tailwind.config.ts)
- `navy-900` (#0A1628) — primary dark
- `veriq-secondary` (#1B4FDB) — brand blue
- `gold-500` (#C9A84C) — brand gold accent
- `veriq-surface` (#F8FAFC) — light background

### Key Classes
- `.btn-primary` — blue primary button
- `.btn-gold` — gold gradient button
- `.btn-outline` — outlined button
- `.card` — rounded card with hover shadow
- `.section-heading` — large section title
- `.input` — form input
- `.badge` — small status badge

## Next Steps (Backend Integration)

1. **Authentication**: Integrate with Firebase Auth or a custom JWT API
2. **Properties API**: Replace mock data in `/app/properties/page.tsx` with real API calls
3. **Payments**: Integrate Paystack for intelligence report unlock fees
4. **Real-time**: Add WebSocket/SSE for live freshness updates
5. **Maps**: Integrate Google Maps or Mapbox for property location views
6. **Images**: Replace gradient placeholders with Cloudinary-hosted property images
7. **SEO**: Add `sitemap.ts` and `robots.txt` in the app directory

## Social Links

- YouTube: https://www.youtube.com/@veriqproperty
- TikTok: https://www.tiktok.com/@veriqproperty
- Facebook: https://www.facebook.com/@veriqproperty
- Instagram: https://www.instagram.com/veriqproperty
