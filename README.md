# Scientific Name Italicizer for Zotero

Scientific Name Italicizer is a Zotero 8 add-on that formats organism names in item titles. It uses a local Catalogue of Life index, works offline after setup, and writes Zotero rich-text markup such as `<i>Arabidopsis thaliana</i>`.

## Features

- Italicizes scientific names in Zotero item titles.
- Supports species, subspecies, varieties, forms, and standalone genus names.
- Handles sentence-case names such as `arabidopsis thaliana` and converts them to `<i>Arabidopsis thaliana</i>`.
- Handles abbreviated genus names such as `B. cinerea` and preserves the abbreviation.
- Skips names already wrapped in `<i>...</i>`.
- Offers selected-item and current-library commands.
- Shows a preview before whole-library edits.
- Saves JSONL change reports for audit/reversal.
- Uses a local Catalogue of Life ColDP index. No network lookup is performed during Zotero use.

## Requirements

- Zotero 8.
- Windows PowerShell for the helper scripts.
- Node.js 18 or newer for building the Catalogue of Life index and running tests.
- An extracted Catalogue of Life ColDP download containing `NameUsage.tsv`, `Name.tsv`, `Name.txt`, or `Name.csv`.

## Install

Download the latest `.xpi` from the repository releases, then in Zotero:

1. Open `Tools -> Add-ons`.
2. Choose `Install Add-on From File...`.
3. Select `scientific-name-italicizer-<version>.xpi`.
4. Restart Zotero.

## Build the Catalogue of Life Index

Download a Catalogue of Life ColDP package and extract it. From this project folder, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-col-index.ps1 `
  -InputPath "C:\path\to\extracted\catalogue-of-life" `
  -OutputPath "C:\path\to\catalogue-of-life-index.json"
```

The generated JSON file can be large. Keep it outside the git repository unless you intentionally want to archive a specific index.

## Configure Zotero

Open `Edit -> Settings -> Scientific Name Italicizer`.

- `Index JSON`: full path to the generated `catalogue-of-life-index.json`.
- `Report folder`: optional. Leave blank to save reports next to the index file.

## Use

In Zotero, use the add-on commands from the Tools menu:

- `Italicize Scientific Names in Selected Items`
- `Preview/Italicize Scientific Names in Current Library`

Examples:

```text
The transcriptional landscape of arabidopsis thaliana pattern-triggered immunity
```

becomes:

```text
The transcriptional landscape of <i>Arabidopsis thaliana</i> pattern-triggered immunity
```

```text
Mechanisms of induced resistance against B. cinerea
```

becomes:

```text
Mechanisms of induced resistance against <i>B. cinerea</i>
```

```text
Repression of the auxin response pathway increases arabidopsis susceptibility to necrotrophic fungi
```

becomes:

```text
Repression of the auxin response pathway increases <i>Arabidopsis</i> susceptibility to necrotrophic fungi
```

## Development

Run tests:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-tests.ps1
```

Package the add-on:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\package.ps1
```

The packaged `.xpi` is written to `dist/`.

## Documentation

- [User Manual](docs/USER_MANUAL.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Release Guide](docs/RELEASE_GUIDE.md)
- [Changelog](CHANGELOG.md)

## Privacy

The add-on does not send title data or Catalogue of Life matches to any external service. Matching happens locally from the configured JSON index.

## License

No license has been selected yet. Until a license is added, the code is publicly visible but not explicitly open-source licensed.
