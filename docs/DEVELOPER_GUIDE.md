# Developer Guide

## Project Layout

```text
plugin/                 Zotero add-on files packaged into the XPI
plugin/matcher.js       Scientific-name matching and formatting logic
tools/                  Build, test, and packaging scripts
tests/                  Node.js tests for matcher and index builder
docs/                   User and release documentation
```

## Build and Test

Run all tests:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-tests.ps1
```

Package the add-on:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\package.ps1
```

The XPI is written to `dist/scientific-name-italicizer-<version>.xpi`.

## Matching Model

The add-on loads the generated Catalogue of Life index JSON and builds three lookup sets:

- Full names, such as `arabidopsis thaliana`.
- Abbreviated names, such as `a thaliana`.
- Genus names, derived from the first token of full species-level names.

Title matching is longest-match-first for full names. If no full name matches at a token position, the matcher tries standalone genus matching.

## Formatting Rules

- Full names are wrapped in `<i>...</i>`.
- Genus tokens are capitalized.
- Species and infraspecific epithets are lowercased.
- Existing italic markup is protected.
- Abbreviated genus tokens such as `B.` are preserved.

## Index Builder

The index builder accepts extracted Catalogue of Life ColDP folders containing `NameUsage.tsv`, `Name.tsv`, `Name.txt`, or `Name.csv`.

It indexes species-level and below names:

- `species`
- `subspecies`
- `variety`
- `varietas`
- `form`
- `forma`
- `subvariety`
- `subvarietas`
- `subform`
- `subforma`

It ignores genus-only and higher-rank rows during index creation. Standalone genus matching is derived from species-level names in the generated index.

## Versioning

Update `plugin/manifest.json` before packaging a release. The package script reads that version and names the XPI accordingly.
