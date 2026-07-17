import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown, SlidersHorizontal, ArrowUpDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSuggestions } from '../utils/smartSearch';

const SORT_OPTIONS = [
  { value: 'fullName',          label: 'Full Name' },
  { value: 'username',          label: 'Username' },
  { value: 'email',             label: 'Email' },
  { value: 'apartmentBlock',    label: 'Block' },
  { value: 'houseNumber',       label: 'House No.' },
  { value: 'waterRatePerLiter', label: 'Water Rate' },
  { value: 'status',            label: 'Status' },
];

const STATUS_FILTERS = [
  { label: 'Approved',  value: 'APPROVED',  color: 'emerald' },
  { label: 'Pending',   value: 'PENDING',   color: 'amber' },
  { label: 'Rejected',  value: 'REJECTED',  color: 'red' },
];

const GENDER_FILTERS = [
  { label: '♂ Male',   value: 'male' },
  { label: '♀ Female', value: 'female' },
];

const ROLE_FILTERS = [
  { label: 'Community Admin', query: 'community admin' },
  { label: 'Household User',  query: 'household user' },
  { label: 'No Rate Set',     query: 'no rate set' },
];

const COLOR_MAP = {
  emerald: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
  amber:   'bg-amber-500/15 border-amber-500/40 text-amber-400',
  red:     'bg-red-500/15 border-red-500/40 text-red-400',
};

export default function SmartSearchBar({
  users, query, onQueryChange,
  sortField, sortDir, onSortChange,
  blockFilter, onBlockFilterChange,
  statusFilter, onStatusFilterChange,
  genderFilter, onGenderFilterChange,
}) {
  const [suggestions, setSuggestions]         = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPanel, setShowPanel]             = useState(false);
  const [selectedSugg, setSelectedSugg]       = useState(-1);

  const inputRef  = useRef(null);
  const wrapperRef = useRef(null);
  const panelRef  = useRef(null);

  // ── Autocomplete ──────────────────────────────────────────────
  useEffect(() => {
    if (query && query.length >= 1) {
      const s = generateSuggestions(users, query);
      const filtered = s.filter(sug => sug.toLowerCase() !== query.toLowerCase());
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    setSelectedSugg(-1);
  }, [query, users]);

  // ── Close on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowSuggestions(false);
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          !e.target.closest('[data-filter-toggle]'))
        setShowPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSugg(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSugg(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedSugg >= 0) {
      e.preventDefault();
      onQueryChange(suggestions[selectedSugg]);
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, selectedSugg, onQueryChange]);

  // ── Derived state ─────────────────────────────────────────────
  const blocks = [...new Set(users.map(u => u.apartmentBlock).filter(Boolean))].sort();

  const activeFilterCount = [
    query,
    blockFilter,
    statusFilter,
    genderFilter,
    sortField !== 'fullName' || sortDir !== 'asc',
  ].filter(Boolean).length;

  const clearAll = () => {
    onQueryChange('');
    onBlockFilterChange('');
    if (onStatusFilterChange) onStatusFilterChange('');
    if (onGenderFilterChange) onGenderFilterChange('');
    onSortChange('fullName', 'asc');
  };

  // ── Chip helper ───────────────────────────────────────────────
  const Chip = ({ label, active, color, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
        active
          ? (color ? COLOR_MAP[color] : 'bg-primary/20 border-primary/50 text-primary')
          : 'bg-surface border-border text-text-muted hover:border-primary/30 hover:text-text'
      }`}
    >
      {active && <Check className="w-3 h-3" />}
      {label}
    </button>
  );

  return (
    <div className="space-y-2 w-full">
      {/* ── Row 1: Search + Controls ── */}
      <div className="flex flex-wrap gap-2 items-center">

        {/* Smart Search Input */}
        <div ref={wrapperRef} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder='Smart search: "community admin", "no rate set", "Block A"...'
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-text placeholder-text-muted/50 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
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
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1.5 bg-surface/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
                  <Search className="w-3 h-3 text-text-muted" />
                  <p className="text-xs font-medium text-text-muted">Suggestions</p>
                </div>
                {suggestions.map((sug, i) => {
                  const qIdx = sug.toLowerCase().indexOf(query.toLowerCase());
                  return (
                    <button
                      key={sug}
                      onMouseDown={(e) => { e.preventDefault(); onQueryChange(sug); setShowSuggestions(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors cursor-pointer ${
                        i === selectedSugg ? 'bg-primary/15 text-primary' : 'text-text hover:bg-surface-lighter'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span>
                        {qIdx >= 0 ? (
                          <>
                            {sug.slice(0, qIdx)}
                            <strong className="text-primary">{sug.slice(qIdx, qIdx + query.length)}</strong>
                            {sug.slice(qIdx + query.length)}
                          </>
                        ) : sug}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Block Filter Select */}
        <select
          value={blockFilter}
          onChange={(e) => onBlockFilterChange(e.target.value)}
          className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 min-w-[120px] cursor-pointer"
        >
          <option value="">All Blocks</option>
          {blocks.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Sort Quick Toggle */}
        <button
          onClick={() => onSortChange(sortField, sortDir === 'asc' ? 'desc' : 'asc')}
          title={`Currently: ${sortDir === 'asc' ? 'A → Z' : 'Z → A'}`}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-surface text-text-muted hover:text-text hover:border-primary/30 transition-all text-sm cursor-pointer"
        >
          {sortDir === 'asc'
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
          <span className="hidden sm:inline text-xs font-medium">
            {SORT_OPTIONS.find(o => o.value === sortField)?.label ?? 'Sort'}
          </span>
        </button>

        {/* Filter Panel Toggle */}
        <div className="relative">
          <button
            data-filter-toggle
            onClick={() => setShowPanel(v => !v)}
            className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
              showPanel || activeFilterCount > 0
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-surface border-border text-text-muted hover:text-text hover:border-primary/30'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Sort & Filter</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/15 text-sm font-medium transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* ── Filter Panel ── */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-surface/80 backdrop-blur-xl border border-border/80 rounded-2xl p-5 space-y-5 shadow-2xl"
          >
            {/* Sort Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">
                  Sort By
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => onSortChange(o.value, sortDir)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        sortField === o.value
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'bg-surface-lighter border-border text-text-muted hover:text-text'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">
                  Direction
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSortChange(sortField, 'asc')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                      sortDir === 'asc'
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-surface border-border text-text-muted hover:text-text'
                    }`}
                  >
                    <ChevronUp className="w-4 h-4" /> A → Z
                  </button>
                  <button
                    onClick={() => onSortChange(sortField, 'desc')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                      sortDir === 'desc'
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-surface border-border text-text-muted hover:text-text'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" /> Z → A
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/50" />

            {/* Status Filter */}
            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">
                Account Status
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map(f => (
                  <Chip
                    key={f.value}
                    label={f.label}
                    color={f.color}
                    active={statusFilter === f.value}
                    onClick={() => onStatusFilterChange && onStatusFilterChange(statusFilter === f.value ? '' : f.value)}
                  />
                ))}
              </div>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">
                Gender
              </label>
              <div className="flex flex-wrap gap-2">
                {GENDER_FILTERS.map(f => (
                  <Chip
                    key={f.value}
                    label={f.label}
                    active={genderFilter === f.value}
                    onClick={() => onGenderFilterChange && onGenderFilterChange(genderFilter === f.value ? '' : f.value)}
                  />
                ))}
              </div>
            </div>

            {/* Role / Quick Filters */}
            <div>
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">
                Quick Filters
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLE_FILTERS.map(f => (
                  <Chip
                    key={f.label}
                    label={f.label}
                    active={query === f.query}
                    onClick={() => onQueryChange(query === f.query ? '' : f.query)}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-text-muted">
                {users.length} total users
              </p>
              <button
                onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active filter tags ── */}
      {(query || statusFilter || genderFilter || blockFilter) && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-xs text-text-muted">Active:</span>
          {query && (
            <span className="px-2.5 py-1 bg-primary/10 border border-primary/25 text-primary text-xs rounded-full flex items-center gap-1.5">
              🔍 "{query}"
              <button onClick={() => onQueryChange('')} className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          {statusFilter && (
            <span className="px-2.5 py-1 bg-surface-lighter border border-border text-text-muted text-xs rounded-full flex items-center gap-1.5">
              ● {statusFilter}
              <button onClick={() => onStatusFilterChange && onStatusFilterChange('')} className="hover:text-text cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          {genderFilter && (
            <span className="px-2.5 py-1 bg-surface-lighter border border-border text-text-muted text-xs rounded-full flex items-center gap-1.5">
              ⚥ {genderFilter}
              <button onClick={() => onGenderFilterChange && onGenderFilterChange('')} className="hover:text-text cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          {blockFilter && (
            <span className="px-2.5 py-1 bg-surface-lighter border border-border text-text-muted text-xs rounded-full flex items-center gap-1.5">
              🏢 {blockFilter}
              <button onClick={() => onBlockFilterChange('')} className="hover:text-text cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
