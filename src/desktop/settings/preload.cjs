"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const CHANNELS = Object.freeze({
  getModel: "git-leaf-settings:get-model",
  updatePreferences: "git-leaf-settings:update-preferences",
  action: "git-leaf-settings:action",
  show: "git-leaf-settings:show",
});

contextBridge.exposeInMainWorld("openGlanceSettings", Object.freeze({
  getModel() {
    return ipcRenderer.invoke(CHANNELS.getModel);
  },

  updatePreferences(patch) {
    return ipcRenderer.invoke(CHANNELS.updatePreferences, patch);
  },

  close() {
    return ipcRenderer.invoke(CHANNELS.action, { type: "close" });
  },

  checkForUpdates() {
    return ipcRenderer.invoke(CHANNELS.action, { type: "check-for-updates" });
  },

  syncGithubIssues() {
    return ipcRenderer.invoke(CHANNELS.action, { type: "sync-github-issues" });
  },

  configureGithubIssues(repositories) {
    return ipcRenderer.invoke(CHANNELS.action, {
      type: "configure-github-issues",
      repositories: Array.isArray(repositories) ? repositories : [],
    });
  },

  openExternal(url) {
    return ipcRenderer.invoke(CHANNELS.action, {
      type: "open-external",
      url: String(url ?? ""),
    });
  },

  onShow(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on(CHANNELS.show, wrapped);
    return () => ipcRenderer.removeListener(CHANNELS.show, wrapped);
  },
}));
