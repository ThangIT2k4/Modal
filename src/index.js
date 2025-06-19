import { ModalManager } from "./core/modal-manager.js";
document.addEventListener('DOMContentLoaded', () => {
    ModalManager.initialize();

    const state = ModalManager.getState();
    console.log(state);
})