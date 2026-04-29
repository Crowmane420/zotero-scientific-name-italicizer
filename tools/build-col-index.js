#!/usr/bin/env node

"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const readline = require("readline");
const matcher = require("../plugin/matcher.js");

const INDEX_FORMAT = "zotero-scientific-name-index-v1";
const SPECIES_LEVEL_RANKS = new Set([
  "species",
  "subspecies",
  "variety",
  "varietas",
  "form",
  "forma",
  "subvariety",
  "subvarietas",
  "subform",
  "subforma"
]);

const RANK_MARKERS = new Map([
  ["subspecies", ["subsp.", "ssp."]],
  ["variety", ["var."]],
  ["varietas", ["var."]],
  ["form", ["f."]],
  ["forma", ["f."]],
  ["subvariety", ["subvar."]],
  ["subvarietas", ["subvar."]],
  ["subform", ["subf."]],
  ["subforma", ["subf."]]
]);

async function main(argv) {
  const options = parseArgs(argv);
  if (!options.input || !options.output) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const result = await buildIndex(options);
  console.log(`Indexed ${result.count} names from ${result.sourceFile}`);
  console.log(`Wrote ${result.output}`);
}

function parseArgs(argv) {
  const options = {
    input: "",
    output: "",
    sourceLabel: ""
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input" || arg === "-i") {
      options.input = argv[++i] || "";
    } else if (arg === "--output" || arg === "-o") {
      options.output = argv[++i] || "";
    } else if (arg === "--source-label") {
      options.sourceLabel = argv[++i] || "";
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printUsage() {
  console.log([
    "Usage:",
    "  node tools/build-col-index.js --input <extracted ColDP folder or Name.tsv> --output <index.json>",
    "",
    "The input should be an extracted Catalogue of Life ColDP package containing Name.tsv/NameUsage.tsv, or one of those files directly."
  ].join("\n"));
}

async function buildIndex(options) {
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);
  const sourceFile = await findNameFile(inputPath);
  const delimiter = delimiterFor(sourceFile);
  const names = new Set();
  const stats = {
    rows: 0,
    indexedRows: 0,
    skippedRows: 0,
    ranks: {}
  };

  await readNameRows(sourceFile, delimiter, row => {
    stats.rows++;
    const rank = normalizeRank(row.rank);
    stats.ranks[rank || "(missing)"] = (stats.ranks[rank || "(missing)"] || 0) + 1;

    const rowNames = extractNames(row);
    if (!rowNames.length) {
      stats.skippedRows++;
      return;
    }

    stats.indexedRows++;
    for (const name of rowNames) {
      const normalized = matcher.normalizeNameForLookup(name);
      if (isIndexableNormalizedName(normalized)) {
        names.add(normalized);
      }
    }
  });

  const sortedNames = Array.from(names).sort();
  const index = {
    format: INDEX_FORMAT,
    version: 1,
    createdAt: new Date().toISOString(),
    source: options.sourceLabel || inputPath,
    sourceFile,
    count: sortedNames.length,
    ranks: Array.from(SPECIES_LEVEL_RANKS).sort(),
    stats,
    names: sortedNames
  };

  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  await fsp.writeFile(outputPath, JSON.stringify(index, null, 2), "utf8");

  return {
    count: sortedNames.length,
    output: outputPath,
    sourceFile
  };
}

async function findNameFile(inputPath) {
  const stat = await fsp.stat(inputPath);
  if (stat.isFile()) {
    return inputPath;
  }

  const exactCandidates = [
    "Name.tsv",
    "Name.txt",
    "Name.csv",
    "Name",
    "NameUsage.tsv",
    "NameUsage.txt",
    "NameUsage.csv",
    "NameUsage"
  ];
  for (const candidate of exactCandidates) {
    const candidatePath = path.join(inputPath, candidate);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  const stack = [inputPath];
  while (stack.length) {
    const current = stack.pop();
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
    } else if (/^(name|nameusage)(\.(tsv|txt|csv))?$/i.test(entry.name)) {
        return entryPath;
      }
    }
  }

  throw new Error(`Could not find Name.tsv, NameUsage.tsv, Name.txt, or Name.csv under ${inputPath}`);
}

function delimiterFor(filePath) {
  return /\.csv$/i.test(filePath) ? "," : "\t";
}

async function readNameRows(filePath, delimiter, onRow) {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const lines = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  let headers = null;

  for await (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const values = parseDelimitedLine(line, delimiter);
    if (!headers) {
      headers = values.map(value => value.replace(/^\uFEFF/, "").trim());
      continue;
    }

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    onRow(row);
  }
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === "\"") {
      if (quoted && next === "\"") {
        current += "\"";
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (ch === delimiter && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  values.push(current);
  return values;
}

function extractNames(row) {
  const rank = normalizeRank(getValue(row, ["rank", "col:rank", "taxonRank", "dwc:taxonRank"]));
  if (!SPECIES_LEVEL_RANKS.has(rank)) {
    return [];
  }

  const genus = cleanNamePart(getValue(row, ["genericName", "col:genericName", "genus", "col:genus", "dwc:genus"]));
  const species = cleanNamePart(getValue(row, ["specificEpithet", "col:specificEpithet", "dwc:specificEpithet"]));
  const infra = cleanNamePart(getValue(row, ["infraspecificEpithet", "col:infraspecificEpithet", "dwc:infraspecificEpithet"]));
  const names = [];

  if (genus && species) {
    const base = `${genus} ${species}`;
    if (rank === "species" || !infra) {
      names.push(base);
    } else {
      names.push(`${base} ${infra}`);
      for (const marker of RANK_MARKERS.get(rank) || []) {
        names.push(`${base} ${marker} ${infra}`);
      }
    }
  }

  const scientificName = cleanScientificName(getValue(row, ["scientificName", "col:scientificName", "name", "col:name", "dwc:scientificName"]));
  if (scientificName && looksLikeSpeciesOrBelow(scientificName)) {
    names.push(scientificName);
  }

  return names;
}

function getValue(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key]) {
      return row[key];
    }
  }
  return "";
}

function normalizeRank(rank) {
  return String(rank || "").trim().toLowerCase();
}

function cleanNamePart(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanScientificName(value) {
  return cleanNamePart(value)
    .replace(/\bcf\.\s+/gi, "")
    .replace(/\baff\.\s+/gi, "");
}

function looksLikeSpeciesOrBelow(value) {
  const normalized = matcher.normalizeNameForLookup(value);
  return isIndexableNormalizedName(normalized);
}

function isIndexableNormalizedName(normalized) {
  if (!normalized) {
    return false;
  }

  const tokens = normalized.split(" ");
  if (tokens.length < 2) {
    return false;
  }

  if (["sp", "spp", "cf", "aff", "nr"].includes(tokens[1])) {
    return false;
  }

  return /^[a-z][a-z-]*$/.test(tokens[0]) && /^[a-z][a-z-]*$/.test(tokens[1]);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildIndex,
  extractNames,
  findNameFile,
  getValue,
  parseDelimitedLine,
  normalizeRank,
  isIndexableNormalizedName
};
