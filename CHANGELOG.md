# Changelog

## 0.1.8

- Prepared project documentation for public release.
- Added GitHub update manifest.
- Made package output portable by defaulting to `dist/`.

## 0.1.7

- Added standalone genus matching and capitalization, for example `arabidopsis` -> `<i>Arabidopsis</i>`.
- Kept full-name matching longest-first so `Arabidopsis thaliana` is formatted as a full species name.
- Verified matching against the generated Catalogue of Life index.

## 0.1.6

- Added abbreviated genus matching, for example `B. cinerea` -> `<i>B. cinerea</i>`.
- Preserved abbreviations instead of expanding them, because abbreviated genus names can be ambiguous.

## 0.1.5

- Normalized scientific-name casing while italicizing.
- Converts lowercase full names such as `arabidopsis thaliana` to `<i>Arabidopsis thaliana</i>`.

## 0.1.4

- Added lowercase full-name detection for sentence-case titles.

## 0.1.3

- Fixed Zotero settings pane loading with native Zotero preference bindings.

## 0.1.2

- Adjusted manifest compatibility for Zotero 8 installation.

## 0.1.0

- Initial Zotero 8 plugin scaffold.
- Added Catalogue of Life index builder.
- Added selected-item and current-library title formatting commands.
