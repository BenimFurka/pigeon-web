function updateBodyHeight() {
    const doc = document.documentElement;
    doc.style.setProperty('--window-height', `${window.innerHeight}px`);
}

window.addEventListener('resize', updateBodyHeight);
updateBodyHeight();
