import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Star, Lock, Trash2, MapPin } from "lucide-react";

export const metadata: Metadata = { title: "Saved Properties | Veriq Dashboard" };

const SAVED = [
  { id: "1", title: "3-Bed Apartment, GRA Phase 2", location: "GRA Phase 2, Port Harcourt", price: 250000, trustScore: 96, savedAt: "2 days ago", color: "bg-blue-100", verified: true },
  { id: "4", title: "4-Bed Duplex, Old GRA", location: "Old GRA, Port Harcourt", price: 450000, trustScore: 97, savedAt: "3 days ago", color: "bg-indigo-100", verified: true },
  { id: "2", title: "2-Bed Flat, Trans Amadi", location: "Trans Amadi, Port Harcourt", price: 150000, trustScore: 88, savedAt: "5 days ago", color: "bg-purple-100", verified: true },
  { id: "6", title: "3-Bed Flat, Peter Odili", location: "Peter Odili Road, Port Harcourt", price: 200000, trustScore: 90, savedAt: "1 week ago", color: "bg-orange-100", verified: true },
];

export default function SavedPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Saved Properties</h1>
          <p className="text-sm text-veriq-muted">{SAVED.length} properties saved to your list</p>
        </div>
        <Link href="/properties" className="btn-outline !text-sm !py-2.5">
          Browse More
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {SAVED.map((prop) => (
          <div key={prop.id} className="card p-5 flex gap-4">
            <div className={`h-20 w-20 rounded-xl ${prop.color} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/properties/${prop.id}`} className="font-semibold text-navy-900 text-sm leading-snug hover:text-veriq-secondary transition-colors line-clamp-2">
                  {prop.title}
                </Link>
                <button className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 mb-2">
                <MapPin className="h-3 w-3" />
                {prop.location}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-gold-500 fill-gold-500" />
                  <span className="text-xs font-semibold text-navy-800">{prop.trustScore}%</span>
                </div>
                <span className="text-xs text-slate-400">Saved {prop.savedAt}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-bold text-navy-900">₦{prop.price.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                <Link href={`/properties/${prop.id}`} className="inline-flex items-center gap-1 rounded-lg bg-veriq-secondary px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 transition-colors">
                  <Lock className="h-3 w-3" />
                  Unlock
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {SAVED.length === 0 && (
        <div className="card p-12 text-center">
          <Heart className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold text-navy-900 mb-2">No saved properties yet</h3>
          <p className="text-sm text-veriq-muted mb-6">Start browsing and save properties you&apos;re interested in.</p>
          <Link href="/properties" className="btn-primary">Browse Properties</Link>
        </div>
      )}
    </div>
  );
}
