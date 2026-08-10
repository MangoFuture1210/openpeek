"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const CHANNELS = Object.freeze({
  getModel: "git-leaf-settings:get-model",
  updatePreferences: "git-leaf-settings:update-preferences",
  action: "git-leaf-settings:action",
  show: "git-leaf-settings:show",
  shortcutInput: "git-leaf-settings:shortcut-input",
});

contextBridge.exposeInMainWorld("gitLeafSettings", Object.freeze({
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

  openExternal(url) {
    return ipcRenderer.invoke(CHANNELS.action, {
      type: "open-external",
      url: String(url ?? ""),
    });
  },

  setShortcutCapture(active) {
    return ipcRenderer.invoke(CHANNELS.action, {
      type: "set-shortcut-capture",
      active: active === true,
    });
  },

  onShortcutInput(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on(CHANNELS.shortcutInput, wrapped);
    return () => ipcRenderer.removeListener(CHANNELS.shortcutInput, wrapped);
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
