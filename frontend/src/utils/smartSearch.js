/**
 * AquaTrack Smart Search Utility
 * Pure JS implementation of:
 *  - Levenshtein distance (typo tolerance)
 *  - Synonym mapping (domain-aware)
 *  - Lemmatization / word stemming
 *  - Semantic pattern matching
 *  - Autocomplete suggestion generation
 */

// ─────────────────────────────────────────────
// 1. SYNONYM MAP (domain-specific)
// ─────────────────────────────────────────────
const SYNONYMS = {
  admin:      ['administrator', 'manager', 'head', 'superadmin', 'super'],
  community:  ['block', 'colony', 'area', 'zone', 'sector', 'society', 'apartment'],
  household:  ['resident', 'house', 'home', 'flat', 'unit', 'family', 'tenant', 'user'],
  water:      ['usage', 'consumption', 'liters', 'litres', 'l', 'meter', 'reading'],
  pending:    ['waiting', 'unverified', 'new', 'request', 'approval', 'unapproved'],
  approved:   ['active', 'verified', 'confirmed', 'enabled'],
  rejected:   ['denied', 'blocked', 'disabled', 'banned'],
  male:       ['man', 'm'],
  female:     ['woman', 'f'],
  bill:       ['invoice', 'payment', 'charge', 'fee', 'amount'],
  rate:       ['price', 'cost', 'tariff', 'per liter', 'pl'],
  block:      ['section', 'wing', 'floor'],
};

// Build reverse map: alias → canonical
const ALIAS_TO_CANONICAL = {};
Object.entries(SYNONYMS).forEach(([canonical, aliases]) => {
  aliases.forEach(alias => { ALIAS_TO_CANONICAL[alias] = canonical; });
  ALIAS_TO_CANONICAL[canonical] = canonical;
});

// ─────────────────────────────────────────────
// 2. LEMMATIZATION / STEMMING (English light-stemmer)
// ─────────────────────────────────────────────
export function stemWord(word) {
  word = word.toLowerCase().trim();
  // Remove common suffixes
  const suffixes = ['ing', 'tion', 'sion', 'ers', 'ed', 'es', 'ies', 'ly', 's'];
  for (const suf of suffixes) {
    if (word.endsWith(suf) && word.length > suf.length + 3) {
      return word.slice(0, -suf.length);
    }
  }
  return word;
}

// ─────────────────────────────────────────────
// 3. SYNONYM EXPANSION
// ─────────────────────────────────────────────
export function expandToCanonical(word) {
  const stemmed = stemWord(word.toLowerCase());
  // direct match
  if (ALIAS_TO_CANONICAL[stemmed]) return ALIAS_TO_CANONICAL[stemmed];
  if (ALIAS_TO_CANONICAL[word.toLowerCase()]) return ALIAS_TO_CANONICAL[word.toLowerCase()];
  return stemmed;
}

// ─────────────────────────────────────────────
// 4. LEVENSHTEIN DISTANCE (typo tolerance)
// ─────────────────────────────────────────────
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function fuzzyMatch(query, target, threshold = 2) {
  query = query.toLowerCase(); target = target.toLowerCase();
  if (target.includes(query)) return true;
  if (query.length <= 3) return target.startsWith(query);
  return levenshtein(query, target) <= threshold;
}

// ─────────────────────────────────────────────
// 5. SEMANTIC PATTERNS (intent detection)
// ─────────────────────────────────────────────
const SEMANTIC_PATTERNS = [
  { pattern: /no.?(rate|price|tariff)/i, flag: 'noRate' },
  { pattern: /rate.?not.?set|unset/i,    flag: 'noRate' },
  { pattern: /has.?rate|with.?rate/i,    flag: 'hasRate' },
  { pattern: /super.?admin|sys.?admin/i, flag: 'roleAdmin' },
  { pattern: /community.?admin|co.?admin/i, flag: 'roleCommunityAdmin' },
  { pattern: /household|resident|user/i, flag: 'roleResident' },
  { pattern: /pending|waiting|new/i,     flag: 'statusPending' },
  { pattern: /approved|active|verified/i, flag: 'statusApproved' },
  { pattern: /male/i,                    flag: 'genderMale' },
  { pattern: /female/i,                  flag: 'genderFemale' },
];

export function detectSemanticIntent(query) {
  const flags = {};
  SEMANTIC_PATTERNS.forEach(({ pattern, flag }) => {
    if (pattern.test(query)) flags[flag] = true;
  });
  return flags;
}

// ─────────────────────────────────────────────
// 6. MAIN SMART FILTER FUNCTION
// ─────────────────────────────────────────────
export function smartFilter(users, rawQuery) {
  if (!rawQuery || rawQuery.trim() === '') return users;

  const query = rawQuery.trim().toLowerCase();
  const tokens = query.split(/\s+/).map(t => expandToCanonical(t));
  const intent = detectSemanticIntent(query);

  return users.filter(user => {
    // Semantic intent gates
    if (intent.noRate && user.role === 'ROLE_COMMUNITY_ADMIN' && user.waterRatePerLiter != null) return false;
    if (intent.hasRate && user.role === 'ROLE_COMMUNITY_ADMIN' && user.waterRatePerLiter == null) return false;
    if (intent.roleAdmin && user.role !== 'ROLE_ADMIN') return false;
    if (intent.roleCommunityAdmin && user.role !== 'ROLE_COMMUNITY_ADMIN') return false;
    if (intent.roleResident && user.role !== 'ROLE_RESIDENT' && user.role !== 'ROLE_HOUSEHOLD_USER') return false;
    if (intent.statusPending && user.status !== 'PENDING') return false;
    if (intent.statusApproved && user.status !== 'APPROVED') return false;
    if (intent.genderMale && user.gender?.toLowerCase() !== 'male') return false;
    if (intent.genderFemale && user.gender?.toLowerCase() !== 'female') return false;

    // Token-based matching (all tokens must match something)
    const searchables = [
      user.username, user.fullName, user.email,
      user.houseNumber, user.apartmentBlock, user.colonyName,
      user.mobileNumber, user.whatsAppNumber, user.gender,
      user.role === 'ROLE_ADMIN' ? 'super admin' : '',
      user.role === 'ROLE_COMMUNITY_ADMIN' ? 'community admin' : '',
      user.role === 'ROLE_RESIDENT' ? 'household resident' : '',
    ].filter(Boolean).map(s => s.toLowerCase());

    return tokens.every(token =>
      searchables.some(field =>
        field.includes(token) || fuzzyMatch(token, field.split(' ').find(w => w.length >= token.length - 1 && w.length <= token.length + 2) || field, 2)
      )
    );
  });
}

// ─────────────────────────────────────────────
// 7. AUTOCOMPLETE SUGGESTIONS GENERATOR
// ─────────────────────────────────────────────
export function generateSuggestions(users, query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  const suggestions = new Set();

  // User-data derived suggestions
  users.forEach(u => {
    [u.username, u.fullName, u.email, u.houseNumber, u.apartmentBlock, u.colonyName].forEach(field => {
      if (field && field.toLowerCase().includes(q)) suggestions.add(field);
    });
  });

  // Semantic/domain suggestions
  const domainSuggestions = [
    'community admin', 'super admin', 'household user',
    'no rate set', 'has rate', 'pending approval', 'approved users',
    'Block A', 'Block B', 'Block C',
    'male', 'female',
  ];
  domainSuggestions.forEach(s => {
    if (s.toLowerCase().includes(q)) suggestions.add(s);
  });

  // Fuzzy matches on existing usernames/names
  users.forEach(u => {
    [u.username, u.fullName].filter(Boolean).forEach(field => {
      if (fuzzyMatch(q, field.toLowerCase(), 2)) suggestions.add(field);
    });
  });

  return [...suggestions].slice(0, 8);
}

// ─────────────────────────────────────────────
// 8. SORT HELPER
// ─────────────────────────────────────────────
export function sortUsers(users, sortField, sortDir) {
  return [...users].sort((a, b) => {
    let aVal = a[sortField] ?? '';
    let bVal = b[sortField] ?? '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}
