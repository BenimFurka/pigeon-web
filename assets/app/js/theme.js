const applyTheme = (theme) => {
    const tabs = document.querySelectorAll('#themes .tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    document.querySelector(`#themes .tab[data-tab="${theme}"]`).classList.add('active');
    document.body.classList.remove('dark-theme');
    
    if (theme === '0') {
        document.body.classList.add('dark-theme');
        localStorage.setItem('themePreference', 'dark');
    } else if (theme === '1') {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('themePreference', 'light');
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        localStorage.setItem('themePreference', 'system');
    }
};

const loadTheme = () => {
    const savedTheme = localStorage.getItem('themePreference') || 'system';
    const themeMap = { dark: '0', light: '1', system: '2' };
    applyTheme(themeMap[savedTheme]);
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('themePreference') === 'system') {
            applyTheme('2');
        }
    });
};
document.querySelectorAll('#themes .tab').forEach(tab => {
    tab.addEventListener('click', () => {
        applyTheme(tab.getAttribute('data-tab'));
    });
});