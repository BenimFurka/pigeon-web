const contextMenu = document.getElementById('context-menu');

function showContextMenu(e) {
    e.preventDefault();
    
    contextMenu.classList.remove('hidden');
    contextMenu.style.opacity = '0';
    
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let x = e.pageX + 15;
    let y = e.pageY - 30;
    let tailSide = 'left';
    
    if (x + menuWidth > windowWidth) {
        x = e.pageX - menuWidth - 15;
        tailSide = 'right';
    }
    
    if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight - 5;
    }
    
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.className = tailSide + '-tail';
    contextMenu.style.opacity = '1';
}

document.addEventListener('contextmenu', (e) => {
    const messageWidget = e.target.closest('.content-widget');
    if (!messageWidget) return;
    event.preventDefault();
    showContextMenu(e);

});


document.addEventListener('click', () => {
    contextMenu.classList.add('hidden-context');
});
