import React, { useState, useEffect } from 'react';
import api from '../api';

const WaterLogFormWidget = ({ parsedLiters, onLogged }) => {
  const [residents, setResidents] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);
  const [readingDate, setReadingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [readingLiters, setReadingLiters] = useState(parsedLiters ? String(parsedLiters) : '');
  const [logType, setLogType] = useState('MONTHLY');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const block = localStorage.getItem('apartmentBlock') || 'Block A';
  const callerRole = localStorage.getItem('role') || 'ROLE_COMMUNITY_ADMIN';

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        const res = await api.get(`/admin/users?callerRole=${callerRole}&callerBlock=${encodeURIComponent(block)}`);
        if (res.data && Array.isArray(res.data)) {
          setResidents(res.data);
          if (res.data.length > 0) {
            setSelectedResident(res.data[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching residents for chatbot widget:", err);
      } finally {
        setLoadingResidents(false);
      }
    };
    fetchResidents();
  }, [block, callerRole]);

  const filteredResidents = residents.filter(r => {
    const term = search.toLowerCase();
    const house = (r.houseNumber || '').toLowerCase();
    const name = (r.fullName || r.username || '').toLowerCase();
    return house.includes(term) || name.includes(term);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResident) {
      setErrorMsg("Please select a household resident.");
      return;
    }
    if (!readingLiters || isNaN(readingLiters) || parseFloat(readingLiters) < 0) {
      setErrorMsg("Please enter a valid water reading in liters.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      await api.post(`/usage/log?callerRole=${callerRole}`, {
        houseNumber: selectedResident.houseNumber,
        apartmentBlock: selectedResident.apartmentBlock || block,
        readingDate: readingDate,
        readingLiters: parseFloat(readingLiters),
        logType: logType,
        source: 'MANUAL'
      });

      setSuccessMsg({
        house: selectedResident.houseNumber,
        name: selectedResident.fullName || selectedResident.username,
        liters: readingLiters,
        date: readingDate,
        logType: logType
      });
      if (onLogged) onLogged();
    } catch (err) {
      const errorText = err.response?.data?.message || err.response?.data || "Failed to log water reading. Please check if billing month is already locked.";
      setErrorMsg(typeof errorText === 'string' ? errorText : "Failed to log water reading.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successMsg) {
    return (
      <div className="mt-3 p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border-2 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 shadow-md animate-fade-in">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm mb-2">
          <span>✅</span>
          <span>Water Meter Reading Successfully Logged!</span>
        </div>
        <div className="text-xs space-y-1 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-500/20 font-medium">
          <p>• <strong>Household:</strong> {successMsg.house} ({successMsg.name})</p>
          <p>• <strong>Volume Logged:</strong> <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{successMsg.liters} Liters</strong> ({successMsg.logType})</p>
          <p>• <strong>Reading Date:</strong> {successMsg.date}</p>
          <p>• <strong>Status:</strong> Saved to Database & Resident Notified 🔔</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 dark:from-slate-900/90 dark:to-indigo-950/90 border-2 border-indigo-300 dark:border-indigo-700/60 shadow-lg text-slate-800 dark:text-slate-100 text-xs select-text">
      <div className="flex items-center gap-1.5 font-extrabold text-indigo-950 dark:text-indigo-200 text-xs mb-2.5">
        <span className="text-base">💧</span>
        <span>Quick In-Chat Meter Log Workstation</span>
      </div>

      {errorMsg && (
        <div className="mb-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300">
              1. Search & Select Resident:
            </label>
            <span className="text-[10px] text-slate-500 font-semibold">
              Showing {filteredResidents.length} of {residents.length}
            </span>
          </div>

          <div className="relative mb-1.5">
            <input
              type="text"
              placeholder="🔍 Search by Name, House No, Meter ID (e.g. MTR-113)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {loadingResidents ? (
            <p className="text-[10px] text-slate-500 animate-pulse italic">Loading block residents...</p>
          ) : filteredResidents.length > 0 ? (
            <div className="max-h-36 overflow-y-auto space-y-1 bg-white/80 dark:bg-slate-800/80 p-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-inner custom-scrollbar">
              {filteredResidents.map((res) => {
                const isSelected = selectedResident?.id === res.id;
                const meterIdDisplay = res.meterId || res.meterNo || res.waterMeterId || `MTR-${res.id || 100}`;
                return (
                  <button
                    key={res.id || res.username}
                    type="button"
                    onClick={() => setSelectedResident(res)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between text-[11px] cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'hover:bg-indigo-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>🏠 <strong>House #{res.houseNumber || '???'}</strong> — {res.fullName || res.username}</span>
                      <span className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-400'}`}>
                        Meter ID: {meterIdDisplay} {res.apartmentBlock ? `• ${res.apartmentBlock}` : ''}
                      </span>
                    </div>
                    {isSelected && <span className="font-extrabold text-sm">✓</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
              ⚠️ No matching resident found for "{search}". Try searching by Meter ID (e.g. MTR-113) or House Number.
            </div>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
            2. Log Frequency / Type:
          </label>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {[
              { id: 'DAILY', label: '📅 Daily' },
              { id: 'WEEKLY', label: '📊 Weekly' },
              { id: 'MONTHLY', label: '🗓️ Monthly' }
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setLogType(type.id)}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                  logType === type.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                3. Reading Date:
              </label>
              <input
                type="date"
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                4. Water Log (Liters):
              </label>
              <input
                type="number"
                placeholder="e.g. 250"
                value={readingLiters}
                onChange={(e) => setReadingLiters(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-extrabold text-indigo-600 dark:text-indigo-400"
              />
            </div>
          </div>
        </div>

        {(() => {
          const parsedVal = parseFloat(readingLiters);
          if (parsedVal > 1500) {
            return (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                ⚡ <strong>High Volume Notice:</strong> {parsedVal} Liters exceeds typical household base limits. High-tier tariff applies.
              </div>
            );
          }
          return null;
        })()}

        <div className="pt-1 flex gap-2">
          <button
            type="submit"
            disabled={submitting || !selectedResident}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Logging Reading...</span>
              </>
            ) : (
              <>
                <span>💾 Confirm & Save Reading</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WaterLogFormWidget;
