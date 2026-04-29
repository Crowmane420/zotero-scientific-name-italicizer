/* global Zotero, Services */

var ScientificNameItalicizer = {
  id: null,
  version: null,
  rootURI: null,
  matcherModule: null,
  matcher: null,
  matcherIndexPath: null,
  menuIDs: [],
  preferencePaneID: null,
  fallbackWindowIDs: new WeakMap(),

  PREF_INDEX_PATH: "extensions.scientificNameItalicizer.indexPath",
  PREF_REPORT_DIR: "extensions.scientificNameItalicizer.reportDir",
  MENU_ROOT_ID: "scientific-name-italicizer-tools-menu",

  async startup({ id, version, rootURI, matcher }) {
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
    this.matcherModule = matcher;

    await this.registerPreferences();
    this.addToAllWindows();
    this.registerMenus();

    Zotero.debug("Scientific Name Italicizer started");
  },

  async shutdown() {
    this.unregisterMenus();
    this.unregisterPreferences();
    this.removeFromAllWindows();
    this.matcher = null;
    this.matcherIndexPath = null;
    Zotero.debug("Scientific Name Italicizer shut down");
  },

  async registerPreferences() {
    if (!Zotero.PreferencePanes || !Zotero.PreferencePanes.register) {
      return;
    }

    try {
      this.preferencePaneID = await Zotero.PreferencePanes.register({
        id: "scientific-name-italicizer",
        pluginID: this.id,
        label: "Scientific Name Italicizer",
        src: `${this.rootURI}preferences.xhtml`,
        helpURL: "https://www.zotero.org/support/kb/rich_text_bibliography"
      });
    } catch (error) {
      Zotero.debug(`Scientific Name Italicizer could not register preferences: ${error}`);
    }
  },

  unregisterPreferences() {
    if (!this.preferencePaneID || !Zotero.PreferencePanes || !Zotero.PreferencePanes.unregister) {
      this.preferencePaneID = null;
      return;
    }

    try {
      Zotero.PreferencePanes.unregister(this.preferencePaneID);
    } catch (error) {
      Zotero.debug(`Scientific Name Italicizer could not unregister preferences: ${error}`);
    }
    this.preferencePaneID = null;
  },

  registerMenus() {
    if (!Zotero.MenuManager || !Zotero.MenuManager.registerMenu) {
      return;
    }

    try {
      const toolsMenuID = "scientific-name-italicizer-tools";
      Zotero.MenuManager.registerMenu({
        menuID: toolsMenuID,
        pluginID: this.id,
        target: "main/menubar/tools",
        menus: [
          {
            menuType: "submenu",
            l10nID: "sni-menu-root",
            menus: [
              {
                menuType: "menuitem",
                l10nID: "sni-menu-selected",
                onCommand: () => this.italicizeSelectedItems()
              },
              {
                menuType: "menuitem",
                l10nID: "sni-menu-library",
                onCommand: () => this.previewAndItalicizeCurrentLibrary()
              },
              {
                menuType: "menuseparator"
              },
              {
                menuType: "menuitem",
                l10nID: "sni-menu-configure",
                onCommand: () => this.configureIndexPath()
              }
            ]
          }
        ]
      });
      this.menuIDs.push(toolsMenuID);

      const itemContextMenuID = "scientific-name-italicizer-item-context";
      Zotero.MenuManager.registerMenu({
        menuID: itemContextMenuID,
        pluginID: this.id,
        target: "main/library/item",
        menus: [
          {
            menuType: "menuitem",
            l10nID: "sni-menu-selected",
            onCommand: context => this.italicizeSelectedItems(context && context.items)
          }
        ]
      });
      this.menuIDs.push(itemContextMenuID);
    } catch (error) {
      Zotero.debug(`Scientific Name Italicizer could not register MenuManager menus: ${error}`);
    }
  },

  unregisterMenus() {
    if (!Zotero.MenuManager || !Zotero.MenuManager.unregisterMenu) {
      this.menuIDs = [];
      return;
    }

    for (const menuID of this.menuIDs) {
      try {
        Zotero.MenuManager.unregisterMenu(menuID);
      } catch (error) {
        Zotero.debug(`Scientific Name Italicizer could not unregister menu ${menuID}: ${error}`);
      }
    }
    this.menuIDs = [];
  },

  addToAllWindows() {
    for (const win of this.getMainWindows()) {
      this.addToWindow(win);
    }
  },

  removeFromAllWindows() {
    for (const win of this.getMainWindows()) {
      this.removeFromWindow(win);
    }
  },

  addToWindow(win) {
    if (!win || !win.document) {
      return;
    }

    try {
      if (win.MozXULElement && win.MozXULElement.insertFTLIfNeeded) {
        win.MozXULElement.insertFTLIfNeeded("scientific-name-italicizer.ftl");
      }
    } catch (error) {
      Zotero.debug(`Scientific Name Italicizer could not insert FTL: ${error}`);
    }

    if (Zotero.MenuManager && Zotero.MenuManager.registerMenu) {
      return;
    }

    this.addFallbackToolsMenu(win);
  },

  removeFromWindow(win) {
    if (!win || !win.document) {
      return;
    }

    const menu = win.document.getElementById(this.MENU_ROOT_ID);
    if (menu) {
      menu.remove();
    }
  },

  addFallbackToolsMenu(win) {
    const doc = win.document;
    if (doc.getElementById(this.MENU_ROOT_ID)) {
      return;
    }

    const toolsPopup = doc.getElementById("menu_ToolsPopup");
    if (!toolsPopup) {
      return;
    }

    const menu = doc.createXULElement ? doc.createXULElement("menu") : doc.createElement("menu");
    menu.id = this.MENU_ROOT_ID;
    menu.setAttribute("label", "Scientific Name Italicizer");

    const popup = doc.createXULElement ? doc.createXULElement("menupopup") : doc.createElement("menupopup");
    menu.appendChild(popup);

    this.appendFallbackMenuItem(doc, popup, "Italicize Scientific Names in Selected Items", () => this.italicizeSelectedItems());
    this.appendFallbackMenuItem(doc, popup, "Preview/Italicize Scientific Names in Current Library", () => this.previewAndItalicizeCurrentLibrary());
    const separator = doc.createXULElement ? doc.createXULElement("menuseparator") : doc.createElement("menuseparator");
    popup.appendChild(separator);
    this.appendFallbackMenuItem(doc, popup, "Configure Scientific Name Index...", () => this.configureIndexPath());

    toolsPopup.appendChild(menu);
  },

  appendFallbackMenuItem(doc, popup, label, handler) {
    const item = doc.createXULElement ? doc.createXULElement("menuitem") : doc.createElement("menuitem");
    item.setAttribute("label", label);
    item.addEventListener("command", handler);
    popup.appendChild(item);
  },

  async italicizeSelectedItems(items) {
    try {
      const targetItems = items || this.getSelectedItems();
      const regularItems = this.filterRegularItems(targetItems);

      if (!regularItems.length) {
        this.alert("No regular Zotero items are selected.");
        return;
      }

      const changes = await this.collectTitleChanges(regularItems);
      if (!changes.length) {
        this.alert(`No matching scientific names were found in ${regularItems.length} selected item title(s).`);
        return;
      }

      await this.applyChanges(changes);
      const reportPath = await this.writeReport(changes, "selected-items");
      this.alert(`Updated ${changes.length} selected item title(s).\n\nReport: ${reportPath}`);
    } catch (error) {
      this.handleError(error);
    }
  },

  async previewAndItalicizeCurrentLibrary() {
    try {
      const libraryID = this.getSelectedLibraryID();
      if (!libraryID) {
        this.alert("Select a Zotero library first.");
        return;
      }

      const items = await this.getLibraryItems(libraryID);
      const regularItems = this.filterRegularItems(items);
      const changes = await this.collectTitleChanges(regularItems);

      if (!changes.length) {
        this.alert(`No matching scientific names were found in ${regularItems.length} item title(s).`);
        return;
      }

      const preview = this.formatPreview(changes, regularItems.length);
      if (!this.confirm(preview)) {
        return;
      }

      await this.applyChanges(changes);
      const reportPath = await this.writeReport(changes, "current-library");
      this.alert(`Updated ${changes.length} item title(s).\n\nReport: ${reportPath}`);
    } catch (error) {
      this.handleError(error);
    }
  },

  async configureIndexPath() {
    const win = this.getWindow();
    const currentPath = Zotero.Prefs.get(this.PREF_INDEX_PATH, true) || "";
    const path = win.prompt(
      "Enter the full path to the generated Catalogue of Life index JSON file.",
      currentPath
    );

    if (path === null) {
      return;
    }

    const trimmed = String(path).trim();
    Zotero.Prefs.set(this.PREF_INDEX_PATH, trimmed, true);
    this.matcher = null;
    this.matcherIndexPath = null;

    if (trimmed) {
      this.alert(`Scientific name index path saved:\n\n${trimmed}`);
    } else {
      this.alert("Scientific name index path cleared.");
    }
  },

  async collectTitleChanges(items) {
    const matcher = await this.getMatcher();
    const changes = [];

    for (const item of items) {
      const oldTitle = item.getField("title") || "";
      if (!oldTitle) {
        continue;
      }

      const result = matcher.apply(oldTitle);
      if (!result.changed) {
        continue;
      }

      changes.push({
        item,
        itemID: item.id,
        itemKey: item.key,
        libraryID: item.libraryID,
        itemType: item.itemType,
        oldTitle,
        newTitle: result.title,
        matches: result.matches.map(match => oldTitle.slice(match.start, match.end))
      });
    }

    return changes;
  },

  async getMatcher() {
    const indexPath = Zotero.Prefs.get(this.PREF_INDEX_PATH, true);
    if (!indexPath) {
      throw new Error("No Catalogue of Life index is configured. Use Tools -> Scientific Name Italicizer -> Configure Scientific Name Index first.");
    }

    if (this.matcher && this.matcherIndexPath === indexPath) {
      return this.matcher;
    }

    const raw = await Zotero.File.getContentsAsync(indexPath);
    const index = JSON.parse(raw);
    if (!index || index.format !== "zotero-scientific-name-index-v1" || !Array.isArray(index.names)) {
      throw new Error("The configured file is not a valid Scientific Name Italicizer index.");
    }

    this.matcher = this.matcherModule.createMatcher(index.names);
    this.matcherIndexPath = indexPath;
    return this.matcher;
  },

  async applyChanges(changes) {
    await Zotero.DB.executeTransaction(async () => {
      for (const change of changes) {
        change.item.setField("title", change.newTitle);
        await change.item.save();
      }
    });
  },

  async writeReport(changes, mode) {
    const indexPath = Zotero.Prefs.get(this.PREF_INDEX_PATH, true) || "";
    const configuredDir = Zotero.Prefs.get(this.PREF_REPORT_DIR, true) || "";
    const reportDir = configuredDir || this.parentPath(indexPath);

    if (!reportDir) {
      return "(report directory unavailable)";
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportPath = this.joinPath(reportDir, `scientific-name-italicizer-${mode}-${stamp}.jsonl`);
    const lines = changes.map(change => JSON.stringify({
      itemID: change.itemID,
      itemKey: change.itemKey,
      libraryID: change.libraryID,
      itemType: change.itemType,
      oldTitle: change.oldTitle,
      newTitle: change.newTitle,
      matches: change.matches
    })).join("\n");

    await Zotero.File.putContentsAsync(reportPath, `${lines}\n`);
    return reportPath;
  },

  formatPreview(changes, scannedCount) {
    const examples = changes.slice(0, 8).map((change, index) => {
      return `${index + 1}. ${change.oldTitle}\n   -> ${change.newTitle}`;
    }).join("\n\n");

    return [
      `Scientific Name Italicizer found ${changes.length} title(s) to update after scanning ${scannedCount} regular item(s).`,
      "",
      "Sample changes:",
      "",
      examples,
      "",
      "Apply these changes now?"
    ].join("\n");
  },

  async getLibraryItems(libraryID) {
    const all = await Zotero.Items.getAll(libraryID, false, false);
    if (!Array.isArray(all)) {
      return [];
    }

    if (!all.length || typeof all[0] === "object") {
      return all;
    }

    const items = [];
    for (const id of all) {
      const item = await Zotero.Items.getAsync(id);
      if (item) {
        items.push(item);
      }
    }
    return items;
  },

  filterRegularItems(items) {
    return Array.from(items || []).filter(item => {
      if (!item || item.deleted) {
        return false;
      }
      if (typeof item.isRegularItem === "function") {
        return item.isRegularItem();
      }
      return !!item.itemType && !["attachment", "note", "annotation"].includes(item.itemType);
    });
  },

  getSelectedItems() {
    const pane = this.getZoteroPane();
    if (!pane || !pane.getSelectedItems) {
      return [];
    }
    return pane.getSelectedItems();
  },

  getSelectedLibraryID() {
    const pane = this.getZoteroPane();
    if (pane && pane.getSelectedLibraryID) {
      return pane.getSelectedLibraryID();
    }
    if (Zotero.Libraries && Zotero.Libraries.userLibraryID) {
      return Zotero.Libraries.userLibraryID;
    }
    return null;
  },

  getZoteroPane() {
    const win = this.getWindow();
    return win && win.ZoteroPane;
  },

  getWindow() {
    if (Services && Services.wm) {
      const win = Services.wm.getMostRecentWindow("navigator:browser");
      if (win) {
        return win;
      }
    }
    return Zotero.getMainWindow ? Zotero.getMainWindow() : null;
  },

  getMainWindows() {
    const windows = [];
    if (!Services || !Services.wm) {
      const win = Zotero.getMainWindow && Zotero.getMainWindow();
      return win ? [win] : [];
    }

    const enumerator = Services.wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
      windows.push(enumerator.getNext());
    }
    return windows;
  },

  alert(message) {
    const win = this.getWindow();
    if (win && win.alert) {
      win.alert(message);
      return;
    }
    Zotero.debug(`Scientific Name Italicizer alert: ${message}`);
  },

  confirm(message) {
    const win = this.getWindow();
    if (win && win.confirm) {
      return win.confirm(message);
    }
    return false;
  },

  handleError(error) {
    Zotero.debug(`Scientific Name Italicizer error: ${error && error.stack ? error.stack : error}`);
    this.alert(error && error.message ? error.message : String(error));
  },

  parentPath(value) {
    const path = String(value || "");
    const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    if (index <= 0) {
      return "";
    }
    return path.slice(0, index);
  },

  joinPath(dir, file) {
    const separator = dir.includes("\\") ? "\\" : "/";
    return `${dir.replace(/[\\/]+$/, "")}${separator}${file}`;
  }
};
