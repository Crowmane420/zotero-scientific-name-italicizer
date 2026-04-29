"use strict";

const assert = require("assert");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { buildIndex, extractNames, parseDelimitedLine } = require("../tools/build-col-index.js");

(async () => {
  assert.deepStrictEqual(parseDelimitedLine("\"a,b\",c", ","), ["a,b", "c"]);

  assert.deepStrictEqual(
    extractNames({
      rank: "subspecies",
      genus: "Canis",
      specificEpithet: "lupus",
      infraspecificEpithet: "familiaris",
      scientificName: ""
    }),
    ["Canis lupus familiaris", "Canis lupus subsp. familiaris", "Canis lupus ssp. familiaris"]
  );

  assert.deepStrictEqual(
    extractNames({
      "col:rank": "species",
      "col:genericName": "Escherichia",
      "col:specificEpithet": "coli",
      "col:infraspecificEpithet": "",
      "col:scientificName": "Escherichia coli"
    }),
    ["Escherichia coli", "Escherichia coli"]
  );

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "sni-index-test-"));
  const nameFile = path.join(tempDir, "Name.tsv");
  const outputFile = path.join(tempDir, "index.json");
  await fsp.writeFile(nameFile, [
    "ID\tscientificName\trank\tgenus\tspecificEpithet\tinfraspecificEpithet",
    "1\tEscherichia coli\tspecies\tEscherichia\tcoli\t",
    "2\tCanis lupus familiaris\tsubspecies\tCanis\tlupus\tfamiliaris",
    "3\tCanis\tgenus\tCanis\t\t",
    "4\tBrassica oleracea capitata\tvariety\tBrassica\toleracea\tcapitata",
    "5\tspurious\tspecies\t\t\t"
  ].join("\n"), "utf8");

  await buildIndex({
    input: tempDir,
    output: outputFile,
    sourceLabel: "fixture"
  });

  const index = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  assert.strictEqual(index.format, "zotero-scientific-name-index-v1");
  assert(index.names.includes("escherichia coli"));
  assert(index.names.includes("canis lupus familiaris"));
  assert(index.names.includes("canis lupus subsp familiaris"));
  assert(!index.names.includes("canis"));

  const nameUsageDir = await fsp.mkdtemp(path.join(os.tmpdir(), "sni-nameusage-test-"));
  const nameUsageFile = path.join(nameUsageDir, "NameUsage.tsv");
  const nameUsageOutput = path.join(nameUsageDir, "index.json");
  await fsp.writeFile(nameUsageFile, [
    "col:ID\tcol:scientificName\tcol:rank\tcol:genericName\tcol:specificEpithet\tcol:infraspecificEpithet",
    "1\tArabidopsis thaliana\tspecies\tArabidopsis\tthaliana\t",
    "2\tArabidopsis\tgenus\tArabidopsis\t\t"
  ].join("\n"), "utf8");

  await buildIndex({
    input: nameUsageDir,
    output: nameUsageOutput,
    sourceLabel: "nameusage-fixture"
  });

  const nameUsageIndex = JSON.parse(fs.readFileSync(nameUsageOutput, "utf8"));
  assert(nameUsageIndex.names.includes("arabidopsis thaliana"));
  assert(!nameUsageIndex.names.includes("arabidopsis"));

  console.log("build-col-index.test.js passed");
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
