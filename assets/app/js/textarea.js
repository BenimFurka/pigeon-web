const textarea = document.querySelector('textarea');
const minHeight = 30;
const maxHeight = 120;

const adjustHeight = () => {
    const previousScrollTop = textarea.scrollTop;
    textarea.style.height = '0';
    const contentHeight = textarea.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight));
    textarea.style.height = `${newHeight}px`;
    textarea.scrollTop = previousScrollTop;
    textarea.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
};

const debouncedAdjustHeight = debounce(adjustHeight, 50);

document.addEventListener('DOMContentLoaded', adjustHeight);

textarea.addEventListener('input', debouncedAdjustHeight);
textarea.addEventListener('keyup', debouncedAdjustHeight);
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
        debouncedAdjustHeight();
    }
});
