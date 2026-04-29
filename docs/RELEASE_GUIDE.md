# Release Guide

## 1. Choose a License

Before a broad public release, choose and add a license file. Without a license, the repository is public but not explicitly open-source licensed.

## 2. Run Tests

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-tests.ps1
```

## 3. Package

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\package.ps1
```

The XPI is created in `dist/`.

## 4. Create the GitHub Repository

If using GitHub CLI:

```powershell
gh repo create zotero-scientific-name-italicizer --public --source . --remote origin --push
```

If creating the repository in the browser:

1. Create a public repository named `zotero-scientific-name-italicizer`.
2. Do not initialize it with a README.
3. Add the remote locally:

```powershell
git remote add origin https://github.com/<owner>/zotero-scientific-name-italicizer.git
git push -u origin main
```

## 5. Create a GitHub Release

Tag and push:

```powershell
git tag v0.1.8
git push origin v0.1.8
```

Create a GitHub release from the tag and upload:

```text
dist/scientific-name-italicizer-0.1.8.xpi
```

## 6. Release Notes

Use `CHANGELOG.md` for release notes. Include:

- Zotero compatibility.
- New matching behavior.
- Any known limitations.
- Whether the Catalogue of Life index needs to be rebuilt.
