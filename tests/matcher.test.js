"use strict";

const assert = require("assert");
const matcher = require("../plugin/matcher.js");

const index = matcher.createMatcher([
  "escherichia coli",
  "canis lupus familiaris",
  "brassica oleracea var capitata",
  "arabidopsis thaliana",
  "nicotiana benthamiana",
  "phytophthora palmivora",
  "botrytis cinerea",
  "zea mays"
]);

function italicized(input) {
  return index.apply(input).title;
}

assert.strictEqual(
  italicized("Genome analysis of Escherichia coli isolates"),
  "Genome analysis of <i>Escherichia coli</i> isolates"
);

assert.strictEqual(
  italicized("Phylogeny of <i>Escherichia coli</i> isolates"),
  "Phylogeny of <i>Escherichia coli</i> isolates"
);

assert.strictEqual(
  italicized("Behavior in Canis lupus familiaris"),
  "Behavior in <i>Canis lupus familiaris</i>"
);

assert.strictEqual(
  italicized("Expression in Brassica oleracea var. capitata leaves"),
  "Expression in <i>Brassica oleracea var. capitata</i> leaves"
);

assert.strictEqual(
  italicized("Notes on Escherichia without species"),
  "Notes on <i>Escherichia</i> without species"
);

assert.strictEqual(
  italicized("Arabidopsis thaliana, but not generic Arabidopsis"),
  "<i>Arabidopsis thaliana</i>, but not generic <i>Arabidopsis</i>"
);

assert.strictEqual(
  italicized("The transcriptional landscape of arabidopsis thaliana pattern-triggered immunity"),
  "The transcriptional landscape of <i>Arabidopsis thaliana</i> pattern-triggered immunity"
);

assert.strictEqual(
  italicized("Time-resolved dual transcriptomics reveal early induced nicotiana benthamiana root genes and conserved infection-promoting phytophthora palmivora effectors"),
  "Time-resolved dual transcriptomics reveal early induced <i>Nicotiana benthamiana</i> root genes and conserved infection-promoting <i>Phytophthora palmivora</i> effectors"
);

assert.strictEqual(
  italicized("Expression in brassica oleracea var. capitata leaves"),
  "Expression in <i>Brassica oleracea var. capitata</i> leaves"
);

assert.strictEqual(
  italicized("Mechanisms of induced resistance against B. cinerea"),
  "Mechanisms of induced resistance against <i>B. cinerea</i>"
);

assert.strictEqual(
  italicized("Mechanisms of induced resistance against B cinerea"),
  "Mechanisms of induced resistance against B cinerea"
);

assert.strictEqual(
  italicized("Repression of the auxin response pathway increases arabidopsis susceptibility to necrotrophic fungi"),
  "Repression of the auxin response pathway increases <i>Arabidopsis</i> susceptibility to necrotrophic fungi"
);

assert.strictEqual(
  italicized("Repression of the auxin response pathway increases Arabidopsis susceptibility to necrotrophic fungi"),
  "Repression of the auxin response pathway increases <i>Arabidopsis</i> susceptibility to necrotrophic fungi"
);

assert.strictEqual(
  italicized("Arabidopsis thaliana remains a full species match"),
  "<i>Arabidopsis thaliana</i> remains a full species match"
);

assert.strictEqual(
  italicized("Zea shows a short genus can still be handled"),
  "<i>Zea</i> shows a short genus can still be handled"
);

console.log("matcher.test.js passed");
