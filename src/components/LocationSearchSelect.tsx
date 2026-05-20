import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { INDONESIA_AREAS } from '../constants/locations';

interface LocationSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  scope?: 'jabodetabek' | 'national';
  type?: 'full' | 'district'; // full: Kelurahan / Kecamatan / Kota, district: Kecamatan / Kota
}

export default function LocationSearchSelect({ 
  value, 
  onChange, 
  placeholder = "Search location...", 
  scope = 'national',
  type = 'full' 
}: LocationSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredAreas = INDONESIA_AREAS.filter(area => {
    // Apply scope filter
    if (scope === 'jabodetabek' && !area.isJabodetabek) return false;
    
    const term = search.toLowerCase();
    return (
      area.kelurahan.toLowerCase().includes(term) ||
      area.kecamatan.toLowerCase().includes(term) ||
      area.kota.toLowerCase().includes(term)
    );
  }).map(area => {
    // Standardized format: (Kecamatan / Kota)
    return `${area.kecamatan} / ${area.kota}`;
  });

  // Remove duplicates and slice
  const uniqueResults = Array.from(new Set(filteredAreas)).slice(0, 50);

  // Creatable logic: If there's a search term and it doesn't exactly match any result, show it as an option
  const showCreatable = search && !uniqueResults.some(r => r.toLowerCase() === search.toLowerCase());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent flex items-center justify-between cursor-pointer hover:border-indigo-200 transition-all focus:ring-4 focus:ring-indigo-500/10"
      >
        <div className="flex items-center gap-2 truncate">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
          <span className={`text-sm tracking-tight ${value ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}>
            {value || placeholder}
          </span>
        </div>
        {value && (
          <button 
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-[110] w-full mt-2 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-4 border-b border-gray-50 flex items-center gap-3">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              autoFocus
              placeholder="Start typing your area..."
              className="w-full text-sm font-bold outline-none bg-transparent placeholder:text-gray-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search) {
                    onChange(search);
                    setIsOpen(false);
                    setSearch('');
                }
              }}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {showCreatable && (
                <div 
                  onClick={() => {
                    onChange(search);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="px-6 py-4 text-sm text-indigo-600 bg-indigo-50 cursor-pointer font-bold border-b border-gray-50"
                >
                  Use custom: <span className="text-gray-900 ml-1">"{search}"</span>
                </div>
            )}
            
            {uniqueResults.length > 0 ? (
              uniqueResults.map((result, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    onChange(result);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="px-6 py-4 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 cursor-pointer transition-colors border-b border-gray-50 last:border-0 font-bold"
                >
                  {result}
                </div>
              ))
            ) : !showCreatable && (
              <div className="p-10 text-center text-gray-400 text-xs italic font-medium">
                No location found. Type to add manually.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
