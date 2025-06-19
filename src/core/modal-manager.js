import { MODAL_CONFIG } from './config.js';
import { handleError, debounce, getPreviousFocusSelector, checkScrollContent, $, $$ } from '../utils/utils.js';
import { getDOMElements, removeModalFromDOM, createModal } from '../utils/dom-utils.js';
import { renderModal } from '../components/modal-render.js';

export const ModalManager = (() => {
    const state = {
        body: null,
        script: null,
        groupActions: null,
        modals: [],
        modalStack: [],
        focusHandlers: new WeakMap(),
        initialized: false
    };

    const validModalIndex = (idx) => {
        if (typeof idx !== 'number' || isNaN(idx)) {
            handleError(`Invalid modal index: ${idx}. Must be a number.`);
            return false;
        }
        const modalLength = state.modals.length;
        if (idx < 0 || idx >= modalLength) {
            handleError(`Modal index ${idx} out of bounds. Available: 0 -> ${modalLength}`);
            return false;
        }
        return true;
    };

    const initialize = () => {
        if (state.initialized) return true;
        
        try {
            const elements = getDOMElements();
            Object.assign(state, elements);

            if (!state.body) {
                handleError(`Required DOM element <body> not found`);
                return false;
            }

            setupGlobalEventListeners();
            state.initialized = true;
            return true;
        }
        catch (error) {
            handleError('Initialzation failed', error);
            return false;
        }
    }

    const setupGlobalEventListeners = () => {
        window.addEventListener('keydown', handleEscapeKey, { passive: false });
        if (state.groupActions) {
            state.groupActions.addEventListener('click', handleBtnClick, { passive: true});
        }

        window.addEventListener('resize', debounce(handleWindowResize, 250), { passive: true});
    }

    const isValidModalId = (modalId) => {
        if (typeof modalId !== 'string') {
            handleError(`Invalid modal ID: ${modalId}. It must be a string.`);
            return false;
        }
        
        modalId = modalId.trim();
        if (modalId.length === 0) {
            handleError(`Modal ID cannot be empty.`);
            return false;
        }

        return true;
    }

    const handleEscapeKey = (e) => {
        console.log(e);
        if (e.key !== 'Escape') return;

        const currentModalId = state.modalStack[state.modalStack.length - 1];
        if (currentModalId === undefined) return;
        
        const modal = state.modals[currentModalId];
        console.log(modal)
        if (!modal) {
            console.warn(`Modal has id: ${currentModalId} not found`);
            return;
        }
        closeModalElement();
    }

    const handleBtnClick = (e) => {
        const target = e?.target.closest('.open-modal');
        // console.dir(target);
        if (!target) return;

        // check modal in stack
        const modalId = target.dataset.modalid?.trim();
        console.log(modalId);
        if(!isValidModalId(modalId)) return;

        // check if modal already exists in our collection
        const existingModal = state.modals.find(m => m.id === modalId);
        if (existingModal) return;

        const modal = createModal('Modal 1', { modalId });
        state.modals.push(modal);
        const modalIdx = state.modals.length - 1;
        console.log(modalIdx);
        showModal(modalIdx);

    }

    const handleWindowResize = () => {
        state.modalStack.forEach(modalIdx => {
            const modal = state.modals[modalIdx];
            if (!modal) return;
            
            const modalContent =  modal.querySelector('.modal-content');
            checkScrollContent(modalContent);
        });
    }
    
    const animateModalShow = (modal) => {
        return new Promise((res, rej) => {
            try {
                setTimeout(() => {
                    modal.classList.add('show');

                    const modalContent = modal.querySelector('.modal-content');
                    checkScrollContent(modalContent);
                    setTimeout(res, MODAL_CONFIG.MODAL_LOAD_FOCUS || 0);
                },);
            }
            catch (error) {
                rej(error);
            }
        });
    }

    const setupFocusTrap = (modal) => {
        try {
            const existingHandler = state.focusHandlers.get(modal);
            if (existingHandler) {
                modal.removeEventListener('keydown', existingHandler);
            }
            
            const focusableElements = modal.querySelector(MODAL_CONFIG.FOCUSABLE_SELECTOR);
            
            if (focusableElements.length === 0) return;
            
            const firstEl = focusableElements[0];
            const lastEl = focusableElements[focusableElements.length - 1];

            const focusHandler = (e) => {
                if (e.key !== 'Tab') return;

                if (focusableElements.length == 1) {
                    e.preventDefault();
                    firstEl.focus();
                    return;
                }

                if (e.shiftKey) {
                    if (document.activeElement === firstEl) {
                        e.preventDefault();
                        lastEl.focus();
                        return;
                    }
                }
                else {
                    if (document.activeElement === lastEl) {
                        e.preventDefault();
                        firstEl.focus();
                    }
                }
            }

            state.focusHandlers.set(modal, focusHandler);
            modal.addEventListener('keydown', focusHandler, { passive : false});
            
        }
        catch (error) {
            handleError('Failed to setup focus trap', error);
        }
    }

    const setupModalAccessibility = (modal, modalIndex) => {
        try {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', `modal-title-${modalIndex}`);

            const btnClose = modal.querySelector('.modal-close');
            
            if (btnClose) {
                btnClose.setAttribute('aria-label', 'Close modal');
                setTimeout(() => {
                    btnClose.focus();
                }, 50)
            }

            setupFocusTrap(modal);
            modal.style.zIndex = MODAL_CONFIG.Z_INDEX_INCREMENT + modalIndex;
        }
        catch (error) {
            handleError('Failed to setup accessibility', error);
        }
    }

    const cleanupModalListeners = (modal) => {
        try {
            if (modal._closeHandler) {
                modal.removeEventListener('click', modal._closeHandler);
                delete modal._closeHandler;
            }

            if (modal._overlayHandler) {
                modal.removeEventListener('click', modal._overlayHandler);
                delete modal._overlayHandler;
            }

            const focusHandler = state.focusHandlers.get(modal);
            if (focusHandler) {
                modal.removeEventListener('keydown', focusHandler);
                state.focusHandlers.delete(modal);
            }
        }
        catch (error) {
            handleError('Failed to cleanup modal listeners', error);
        }
    }

    const restorePreviousFocus = (modal) => {
        try {
            const selector = modal.dataset.previousFocusSelector;
            if (!selector) return;
            
            const previousEl = $(selector);

            console.log(previousEl);
            if (previousEl && typeof previousEl.focus === 'function') {
                setTimeout(() => {
                    try {
                        previousEl.focus();
                    }
                    catch(error) {
                        console.warn('Could not restore focus to previous element: ', error);
                    }
                }, 100);
            }
        }
        catch(error) {
            handleError('Failed to restore focus', error)
        }
    }

    const closeModal = function (e) {
        const target = e?.target;
        if (!target.closest('.modal-close')) return;
        closeModalElement();
    }

    const handleOverlayClick = function (e) {
        const target = e?.target;
        if (!target || this !== target) return;
        closeModalElement();
    }

    const closeModalElement = () => {
        state.modalStack.pop();
        const modal = state.modals.pop();

        modal.classList.remove('show');
        cleanupModalListeners(modal);
        restorePreviousFocus(modal);

        setTimeout(() => {
            removeModalFromDOM(modal, state.body);
        }, MODAL_CONFIG.MODAL_HIDE_DELAY);
    }



    const showModal = (modalIdx) => {
        if (!state.initialized || !initialize()) return false;
        if (!validModalIndex(modalIdx)) return false;

        try {
            const modal = state.modals[modalIdx];
            console.log(modal);
            const previouslyFocused = document.activeElement;

            modal.dataset.previousFocusSelector = getPreviousFocusSelector(previouslyFocused);
            
            const closeHandler = (e) => closeModal(e);
            const overlayHandler = (e) => handleOverlayClick.call(modal, e);

            modal.addEventListener('click', closeHandler);
            modal.addEventListener('click', overlayHandler);

            modal._closeHandler = closeHandler;
            modal._overlayHandler = overlayHandler;

            // store previous focus
            state.modalStack.push(modalIdx)
            
            // setup event listeners
            renderModal(modal, state.body);

            animateModalShow(modal);
            setupModalAccessibility(modal, modalIdx);

            return true;

        }
        catch (error) {
            handleError(`Failed to show modal ${modal.id}`, error);
            return false;
        }
    }

    return {
        showModal,
        getState: () => ({...state}),
        initialize
    }
})();