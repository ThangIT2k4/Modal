export const $ = document.querySelector.bind(document);
export const $$ = document.querySelectorAll.bind(document);

export const handleError = (message, error) => {
    console.error(`ModalManager Error: ${message}`, error);
    if (error) throw error;
}

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        } 
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    }
}

export const getPreviousFocusSelector = (el) => {
    if (!el) return;

    if (el.id) return `${el.id}`;
    if (el.className) {
        const firstClass = el.className.split(' ')[0];
        return `.${firstClass}`; 
    } 
    return el.tagName.toLowerCase();
} 

export const checkScrollContent = (element) => {
    if (!element) return;
    element.classList.toggle(
        'has-scroll', 
        element.scrollHeight > element.clientHeight
    );
}

export const createNodeFromString = (nodeString) => {
    try {
        const temp = document.createElement('div');
        temp.innerHTML = nodeString;
        console.dir(temp);
        return temp.firstElementChild;
        
    }
    catch (error) {
        console.error('Failed to create node from string:', error);
        return null;
    }
}