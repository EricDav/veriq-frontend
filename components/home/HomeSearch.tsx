'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { buttonClass } from '@/components/ui';

/**
 * The prototype's `.searchbar`, the band directly under the hero: where, what, go. Its five
 * categories are the same five the browse page filters by, so the selection carries straight through
 * as `?category=`.
 */
const CATEGORIES = [
  { value: 'residential', label: 'Residential Property' },
  { value: 'short_let', label: 'Short Lets' },
  { value: 'hostel', label: 'Hostels' },
  { value: 'shared', label: 'Shared Property' },
  { value: 'sale', label: 'Property for Sale' },
] as const;

export function HomeSearch() {
  const router = useRouter();
  const locationId = useId();
  const categoryId = useId();
  const [location, setLocation] = useState('Port Harcourt');
  const [category, setCategory] = useState<string>('residential');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set('q', location.trim());
    params.set('category', category);
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-[26px] grid gap-3 rounded-[14px] border border-[#ffffff1a] bg-card p-5 wide:grid-cols-[1.2fr_1fr_auto] wide:gap-[15px]"
    >
      <div>
        <label htmlFor={locationId} className="block text-[0.75rem] text-muted-foreground">
          WHERE ARE YOU LOOKING?
        </label>
        <input
          id={locationId}
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="City or area"
          className="w-full border-0 bg-transparent px-0 py-1.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
        />
      </div>

      <div>
        <label htmlFor={categoryId} className="block text-[0.75rem] text-muted-foreground">
          PROPERTY CATEGORY
        </label>
        <select
          id={categoryId}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-8 w-full border-0 bg-transparent px-0 text-base text-foreground focus-visible:outline-none"
        >
          {CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value} className="bg-card text-foreground">
              {label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className={buttonClass('primary', 'default', 'w-full wide:w-auto wide:self-end')}>
        <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        Explore properties
      </button>
    </form>
  );
}
