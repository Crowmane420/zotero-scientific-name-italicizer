# User Manual

This manual explains how to install Scientific Name Italicizer, build the Catalogue of Life index, configure Zotero, and use the add-on safely.

## 1. Install the Add-on

1. Download `scientific-name-italicizer-<version>.xpi` from the GitHub release.
2. Open Zotero.
3. Go to `Tools -> Add-ons`.
4. Click the gear icon and choose `Install Add-on From File...`.
5. Select the `.xpi`.
6. Restart Zotero when prompted.

## 2. Download Catalogue of Life Data

Download a Catalogue of Life ColDP package and extract it. The extracted folder should contain one of these files:

- `NameUsage.tsv`
- `Name.tsv`
- `Name.txt`
- `Name.csv`

The full Catalogue of Life export can be large. The index builder streams the TSV/CSV file, but the resulting JSON index may still be hundreds of megabytes.

## 3. Build the Local Index

Open PowerShell in the project folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-col-index.ps1 `
  -InputPath "C:\path\to\extracted\catalogue-of-life" `
  -OutputPath "C:\path\to\catalogue-of-life-index.json"
```

For example:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-col-index.ps1 `
  -InputPath "C:\Users\you\Downloads\catalogue-of-life" `
  -OutputPath "C:\Users\you\Documents\catalogue-of-life-index.json"
```

## 4. Configure Zotero

1. Open `Edit -> Settings`.
2. Select `Scientific Name Italicizer`.
3. Paste the full path to `catalogue-of-life-index.json` into `Index JSON`.
4. Leave `Report folder` blank, or enter a folder where JSONL reports should be saved.

The settings are saved by Zotero automatically.

## 5. Run on Selected Items

1. Select one or more regular Zotero items.
2. Open `Tools -> Scientific Name Italicizer`.
3. Choose `Italicize Scientific Names in Selected Items`.

The add-on updates the item title field and writes a JSONL report.

## 6. Run on the Current Library

1. Select the library or collection you want to scan.
2. Open `Tools -> Scientific Name Italicizer`.
3. Choose `Preview/Italicize Scientific Names in Current Library`.
4. Review the preview.
5. Confirm only if the examples look correct.

Whole-library mode always previews changes before writing them.

## 7. What Gets Formatted

The add-on formats:

- Full species names: `arabidopsis thaliana` -> `<i>Arabidopsis thaliana</i>`
- Infraspecific names: `brassica oleracea var. capitata` -> `<i>Brassica oleracea var. capitata</i>`
- Abbreviated names: `B. cinerea` -> `<i>B. cinerea</i>`
- Standalone genus names: `arabidopsis` -> `<i>Arabidopsis</i>`

The add-on skips names already inside `<i>...</i>`.

## 8. Reports

Each run writes a JSONL report with item keys, old titles, new titles, and matched names. If `Report folder` is blank, reports are written next to the configured index file.

These reports are useful for auditing changes or manually restoring a title.

## 9. Limitations

- The add-on modifies titles only.
- Abbreviated genus names are italicized but not expanded because abbreviations can be ambiguous.
- The quality of matching depends on the Catalogue of Life index you provide.
- Very broad genus-only matching can produce occasional false positives for words that are also genus names.
