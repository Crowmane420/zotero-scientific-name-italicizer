/* exported ScientificNameMatcher */

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.ScientificNameMatcher = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MARKER_ALIASES = new Map([
    ["subspecies", "subsp"],
    ["subsp", "subsp"],
    ["ssp", "subsp"],
    ["variety", "var"],
    ["varietas", "var"],
    ["var", "var"],
    ["forma", "f"],
    ["form", "f"],
    ["f", "f"],
    ["subvariety", "subvar"],
    ["subvarietas", "subvar"],
    ["subvar", "subvar"],
    ["subform", "subf"],
    ["subforma", "subf"],
    ["subf", "subf"]
  ]);

  const TOKEN_RE = /[A-Za-z][A-Za-z.-]*/g;
  const TAG_RE = /<[^>]*>/g;
  const ITALIC_RE = /<i\b[^>]*>[\s\S]*?<\/i>/gi;
  const GENUS_STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "into",
    "of",
    "on",
    "or",
    "the",
    "to",
    "via",
    "with"
  ]);

  function normalizeNameForLookup(name) {
    if (!name) {
      return "";
    }

    const cleaned = String(name)
      .replace(/<[^>]*>/g, " ")
      .replace(/\u00d7/g, "x")
      .replace(/\s+/g, " ")
      .trim();

    const tokens = cleaned
      .split(" ")
      .map(normalizeToken)
      .filter(Boolean);

    if (tokens.length < 2) {
      return "";
    }

    return tokens.join(" ");
  }

  function normalizeToken(token) {
    const cleaned = String(token)
      .replace(/^[^A-Za-z]+/, "")
      .replace(/[^A-Za-z.-]+$/, "")
      .replace(/\.$/, "")
      .toLowerCase();

    return MARKER_ALIASES.get(cleaned) || cleaned;
  }

  function createMatcher(names) {
    const lookup = new Set();
    const abbreviations = new Set();
    const genera = new Set();

    for (const name of names || []) {
      const normalized = normalizeNameForLookup(name);
      if (normalized) {
        lookup.add(normalized);
        addGenus(genera, normalized);
        addAbbreviation(abbreviations, normalized);
      }
    }

    const index = {
      names: lookup,
      abbreviations,
      genera
    };

    return {
      has(name) {
        return lookup.has(normalizeNameForLookup(name));
      },
      size: lookup.size,
      apply(title) {
        return applyItalics(title, index);
      },
      find(title) {
        return findMatches(title, index);
      }
    };
  }

  function addAbbreviation(abbreviations, normalized) {
    const tokens = normalized.split(" ");
    if (tokens.length < 2 || tokens[0].length < 2) {
      return;
    }
    abbreviations.add(`${tokens[0][0]} ${tokens.slice(1).join(" ")}`);
  }

  function addGenus(genera, normalized) {
    const genus = normalized.split(" ")[0];
    if (isIndexableGenus(genus)) {
      genera.add(genus);
    }
  }

  function applyItalics(title, index) {
    const value = String(title || "");
    const matches = findMatches(value, index);

    if (!matches.length) {
      return {
        changed: false,
        title: value,
        matches: []
      };
    }

    let output = "";
    let cursor = 0;
    for (const match of matches) {
      output += value.slice(cursor, match.start);
      output += `<i>${formatMatchedName(value.slice(match.start, match.end))}</i>`;
      cursor = match.end;
    }
    output += value.slice(cursor);

    return {
      changed: output !== value,
      title: output,
      matches
    };
  }

  function findMatches(title, index) {
    const protectedRanges = getProtectedRanges(title);
    const tokens = tokenize(title).filter(token => !overlapsAny(token.start, token.end, protectedRanges));
    const matches = [];

    for (let i = 0; i < tokens.length; i++) {
      const genus = tokens[i];
      const species = tokens[i + 1];

      if (!isGenusToken(genus)) {
        continue;
      }

      if (isEpithetToken(species)) {
        const best = bestCandidateAt(tokens, i, index);
        if (best) {
          matches.push(best);

          while (tokens[i + 1] && tokens[i + 1].start < best.end) {
            i++;
          }
          continue;
        }
      }

      const genusOnly = genusCandidateAt(genus, index);
      if (genusOnly) {
        matches.push(genusOnly);
      }
    }

    return matches;
  }

  function bestCandidateAt(tokens, startIndex, index) {
    const genus = tokens[startIndex];
    const species = tokens[startIndex + 1];
    const next = tokens[startIndex + 2];
    const afterNext = tokens[startIndex + 3];
    const candidates = [];

    if (next && isMarkerToken(next) && isEpithetToken(afterNext)) {
      candidates.push({
        start: genus.start,
        end: afterNext.end,
        normalized: normalizeCandidateTokens([genus, species, next, afterNext]),
        abbreviated: isAbbreviatedGenusToken(genus),
        matchedName: null
      });
    }

    if (next && isEpithetToken(next)) {
      candidates.push({
        start: genus.start,
        end: next.end,
        normalized: normalizeCandidateTokens([genus, species, next]),
        abbreviated: isAbbreviatedGenusToken(genus),
        matchedName: null
      });
    }

    candidates.push({
      start: genus.start,
      end: species.end,
      normalized: normalizeCandidateTokens([genus, species]),
      abbreviated: isAbbreviatedGenusToken(genus),
      matchedName: null
    });

    for (const candidate of candidates) {
      if (hasCandidate(index, candidate)) {
        candidate.matchedName = candidate.normalized;
        return candidate;
      }
    }

    return null;
  }

  function hasCandidate(index, candidate) {
    if (index.names.has(candidate.normalized)) {
      return true;
    }
    return candidate.abbreviated && index.abbreviations.has(candidate.normalized);
  }

  function genusCandidateAt(token, index) {
    if (!isStandaloneGenusToken(token)) {
      return null;
    }

    const normalized = normalizeToken(token.text);
    if (!index.genera.has(normalized)) {
      return null;
    }

    return {
      start: token.start,
      end: token.end,
      normalized,
      genusOnly: true,
      matchedName: normalized
    };
  }

  function normalizeCandidateTokens(tokens) {
    return tokens.map(token => normalizeToken(token.text)).join(" ");
  }

  function formatMatchedName(value) {
    let tokenIndex = 0;
    return String(value).replace(/[A-Za-z][A-Za-z.-]*/g, token => {
      const formatted = tokenIndex === 0 ? capitalizeTaxonToken(token) : token.toLowerCase();
      tokenIndex++;
      return formatted;
    });
  }

  function capitalizeTaxonToken(token) {
    const lower = token.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  function tokenize(value) {
    const tokens = [];
    let match;
    TOKEN_RE.lastIndex = 0;
    while ((match = TOKEN_RE.exec(value))) {
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return tokens;
  }

  function getProtectedRanges(value) {
    const ranges = [];
    collectRanges(value, ITALIC_RE, ranges, true);
    collectRanges(value, TAG_RE, ranges, false);
    ranges.sort((a, b) => a.start - b.start || b.end - a.end);
    return ranges;
  }

  function collectRanges(value, regex, ranges, protectUnclosedItalic) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(value))) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }

    if (protectUnclosedItalic) {
      const open = value.search(/<i\b[^>]*>/i);
      const close = value.search(/<\/i>/i);
      if (open !== -1 && (close === -1 || close < open)) {
        ranges.push({
          start: open,
          end: value.length
        });
      }
    }
  }

  function overlapsAny(start, end, ranges) {
    for (const range of ranges) {
      if (end <= range.start) {
        continue;
      }
      if (start >= range.end) {
        continue;
      }
      return true;
    }
    return false;
  }

  function isGenusToken(token) {
    if (!token || token.text.length < 2) {
      return false;
    }
    const normalized = normalizeToken(token.text);
    if (!normalized || MARKER_ALIASES.has(normalized)) {
      return false;
    }
    return isAbbreviatedGenusToken(token) || /^[A-Za-z][A-Za-z-]*$/.test(token.text);
  }

  function isAbbreviatedGenusToken(token) {
    return !!token && /^[A-Za-z]\.$/.test(token.text);
  }

  function isStandaloneGenusToken(token) {
    if (!token || isAbbreviatedGenusToken(token)) {
      return false;
    }

    const normalized = normalizeToken(token.text);
    if (!isIndexableGenus(normalized)) {
      return false;
    }

    return /^[A-Z][a-z-]*$/.test(token.text) || /^[a-z][a-z-]*$/.test(token.text);
  }

  function isIndexableGenus(value) {
    return /^[a-z][a-z-]{2,}$/.test(value) && !GENUS_STOP_WORDS.has(value);
  }

  function isEpithetToken(token) {
    if (!token) {
      return false;
    }

    const normalized = normalizeToken(token.text);
    if (!normalized || MARKER_ALIASES.has(normalized)) {
      return false;
    }

    if (["sp", "spp", "cf", "aff", "nr"].includes(normalized)) {
      return false;
    }

    return /^[A-Za-z][A-Za-z-]*$/.test(token.text);
  }

  function isMarkerToken(token) {
    return !!token && MARKER_ALIASES.has(normalizeToken(token.text));
  }

  return {
    createMatcher,
    applyItalics,
    findMatches,
    formatMatchedName,
    normalizeNameForLookup
  };
});
