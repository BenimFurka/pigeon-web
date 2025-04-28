const textarea = document.querySelector('textarea');
const minHeight = 30;
const maxHeight = 120;


const adjustHeight = () => {
    const previousScrollTop = textarea.scrollTop;
    const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = `${newHeight}px`;
    textarea.scrollTop = previousScrollTop;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
};

textarea.addEventListener('input', adjustHeight);
textarea.addEventListener('keyup', adjustHeight);
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
        setTimeout(adjustHeight, 0);
    }
});
