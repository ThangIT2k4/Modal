import { $ } from '../utils/utils.js';

export const renderModal = (modal, nodeParent) => {
    try {
        const script = $('script');
        nodeParent.insertBefore(modal, script);
        return modal;
    }
    catch(error) {
        console.error('Failed to render modal: ', error);
        return null;
    }
}
