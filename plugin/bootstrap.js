/* global Services, Zotero, APP_SHUTDOWN, ScientificNameMatcher, ScientificNameItalicizer */

var ScientificNameItalicizerBootstrap = {
  id: null,
  rootURI: null,

  async startup(data) {
    this.id = data.id;
    this.rootURI = data.rootURI || data.resourceURI.spec;

    Services.scriptloader.loadSubScript(`${this.rootURI}matcher.js`);
    Services.scriptloader.loadSubScript(`${this.rootURI}scientific-name-italicizer.js`);

    await ScientificNameItalicizer.startup({
      id: this.id,
      version: data.version,
      rootURI: this.rootURI,
      matcher: ScientificNameMatcher
    });
  },

  async shutdown(reason) {
    if (reason === APP_SHUTDOWN) {
      return;
    }

    if (typeof ScientificNameItalicizer !== "undefined") {
      await ScientificNameItalicizer.shutdown();
    }
  },

  onMainWindowLoad({ window }) {
    if (typeof ScientificNameItalicizer !== "undefined") {
      ScientificNameItalicizer.addToWindow(window);
    }
  },

  onMainWindowUnload({ window }) {
    if (typeof ScientificNameItalicizer !== "undefined") {
      ScientificNameItalicizer.removeFromWindow(window);
    }
  }
};

function install() {}

async function startup(data, reason) {
  await ScientificNameItalicizerBootstrap.startup(data, reason);
}

async function shutdown(data, reason) {
  await ScientificNameItalicizerBootstrap.shutdown(reason);
}

function uninstall() {}

function onMainWindowLoad(data) {
  ScientificNameItalicizerBootstrap.onMainWindowLoad(data);
}

function onMainWindowUnload(data) {
  ScientificNameItalicizerBootstrap.onMainWindowUnload(data);
}
