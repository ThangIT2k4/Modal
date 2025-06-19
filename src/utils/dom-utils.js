import { $, handleError, createNodeFromString } from './utils.js';

export const getDOMElements = () => {
    try {
        return {
            body: $('body'),
            script: $('script'),
            groupActions: $('.group-actions')
        }
    }
    catch (error) {
        handleError('Failed to get DOM elements', error);
        return { body: null, script: null, groupActions: null };
    }
}

export const removeModalFromDOM = (modal, body) => {
    try {
        if (body && body.contains(modal)) {
            body.removeChild(modal);
        }
    }
    catch (error) {
        handleError(`Failed to remove modal form DOM`, error)
    }
}

export const createModal = (nodeItem, options = {}) => {
    const {
        modalId = '',
        closeBtnText = '&times;',
        cssClass = ''
    } = options;

    const modalString = `
        <div class="modal-backdrop ${cssClass}" ${modalId ? `id=${modalId}` : ''}>
            <div class="modal-container">
                <button class="modal-close">${closeBtnText}</button>
                <div class="modal-content">
                    ${nodeItem}
                </div>
            </div>
        </div>
    `;

    return createNodeFromString(modalString);
}
