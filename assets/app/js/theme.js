const applyTheme = (theme) => {
    if (typeof document !== 'undefined') {
        const tabs = document.querySelectorAll('#themes .tab');
        if (tabs.length > 0) {
            tabs.forEach(tab => tab.classList.remove('active'));
            
            const selectedTab = document.querySelector(`#themes .tab[data-tab="${theme}"]`);
            if (selectedTab) {
                selectedTab.classList.add('active');
            }
        }
    }
    
    if (typeof document !== 'undefined' && document.body) {
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
    } else {
        if (theme === '0') {
            localStorage.setItem('themePreference', 'dark');
        } else if (theme === '1') {
            localStorage.setItem('themePreference', 'light');
        } else {
            localStorage.setItem('themePreference', 'system');
        }
    }
};

const loadTheme = () => {
    const savedTheme = localStorage.getItem('themePreference') || 'system';
    const themeMap = { dark: '0', light: '1', system: '2' };
    applyTheme(themeMap[savedTheme]);
    
    document.querySelectorAll('#themes .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            applyTheme(tab.getAttribute('data-tab'));
        });
    });
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('themePreference') === 'system') {
            applyTheme('2');
        }
    });
};

window.ThemeManager = {
    applyTheme,
    loadTheme
};
