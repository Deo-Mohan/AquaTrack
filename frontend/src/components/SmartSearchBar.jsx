import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { generateSuggestions } from '../utils/smartSearch';

const SORT_OPTIONS = [
  { value: 'fullName',        label: 'Full Name' },
  { value: 'username',        label: 'Username' },
  { value: 'email',           label: 'Email' },
  { value: 'apartmentBlock',  label: 'Block' },
  { value: 'houseNumber',     label: 'House No.' },
  { value: 'waterRatePerLiter', label: 'Water Rate' },
  { value: 'status',          label: 'Status' },
];

const QUICK_FILTERS = [
  { label: 'No Rate Set',    query: 'no rate set' },
  { label: 'Community Admin', query: 'community admin' },
  { label: 'Household User', query: 'household user' },
  { label: 'Pending',        query: 'pending approval' },
  { label: 'Approved',       query: 'approved users' },
];

export default function SmartSearchBar({ users, query, onQueryChange, sortField, sortDir, onSortChange, blockFilter, onBlockFilterChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Generate suggestions when query changes
  useEffect(() => {
    if (query && query.length >= 1) {
      const s = generateSuggestions(users, query);
      setSuggestions(s.filter(sug => sug.toLowerCase() !== query.toLowerCase()));
      setShowSuggestions(s.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    setSelectedSuggestion(-1);
  }, [query, users]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
      e.preventDefault();
      onQueryChange(suggestions[selectedSuggestion]);
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, selectedSuggestion, onQueryChange]);

  const hasActiveFilters = query || blockFilter || sortField !== 'fullName';

  const clearAll = () => {
    onQueryChange('');
    onBlockFilterChange('');
    onSortChange('fullName', 'asc');
  };

  const blocks = [...new Set(users.map(u => u.apartmentBlock).filter(Boolean))];

  return (
    <div className="space-y-3">
      {/* Main search row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Smart Search Input */}
        <div ref={wrapperRef} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder='Smart search: "community admin", "no rate set", "Block A"...'
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-text placeholder-text-muted/60 focus:outline-none focus:border-primary transition-colors"
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border/50">
                <p className="text-xs text-text-muted">Suggestions</p>
              </div>
              {suggestions.map((sug, i) => (
                <button
                  key={sug}
                  onMouseDown={(e) => { e.preventDefault(); onQueryChange(sug); setShowSuggestions(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors cursor-pointer ${
                    i === selectedSuggestion ? 'bg-primary/15 text-primary' : 'text-text hover:bg-surface-lighter'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  <span>
                    {/* Highlight matching portion */}
                    {sug.toLowerCase().includes(query.toLowerCase()) ? (
                      <>
                        {sug.slice(0, sug.toLowerCase().indexOf(query.toLowerCase()))}
                        <strong className="text-primary">{sug.slice(sug.toLowerCase().indexOf(query.toLowerCase()), sug.toLowerCase().indexOf(query.toLowerCase()) + query.length)}</strong>
                        {sug.slice(sug.toLowerCase().indexOf(query.toLowerCase()) + query.length)}
                      </>
                    ) : sug}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Block Filter */}
        <select
          value={blockFilter}
          onChange={(e) => onBlockFilterChange(e.target.value)}
          className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary min-w-[120px] cursor-pointer"
        >
          <option value="">All Blocks</option>
          {blocks.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Sort Toggle Button */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
            showFilters ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface border-border text-text-muted hover:text-text'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Sort & Filter</span>
        </button>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/15 text-sm font-medium transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        )}
      </div>

      {/* Expanded Sort Panel */}
      {showFilters && (
        <div className="bg-surface-lighter border border-border rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-text-muted uppercase mb-2 block">Sort By</label>
              <select
                value={sortField}
                onChange={(e) => onSortChange(e.target.value, sortDir)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary cursor-pointer"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="text-xs font-medium text-text-muted uppercase mb-2 block">Direction</label>
              <div className="flex gap-2">
                <button
                  onClick={() => onSortChange(sortField, 'asc')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
                    sortDir === 'asc' ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface border-border text-text-muted hover:text-text'
                  }`}
                >
                  <ChevronUp className="w-4 h-4" /> A→Z
                </button>
                <button
                  onClick={() => onSortChange(sortField, 'desc')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
                    sortDir === 'desc' ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface border-border text-text-muted hover:text-text'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" /> Z→A
                </button>
              </div>
            </div>
          </div>
          {/* Quick filter chips */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase mb-2 block">Quick Filters</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map(f => (
                <button
                  key={f.label}
                  onClick={() => { onQueryChange(query === f.query ? '' : f.query); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    query === f.query
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-surface border-border text-text-muted hover:border-primary/30 hover:text-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active search tag */}
      {query && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-muted">Smart search:</span>
          <span className="px-2.5 py-1 bg-primary/10 border border-primary/25 text-primary text-xs rounded-full flex items-center gap-1.5">
            "{query}"
            <button onClick={() => onQueryChange('')} className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}
    </div>
  );
}
