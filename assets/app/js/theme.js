const toggleTheme = () => {
    const isDarkTheme = document.body.classList.toggle('dark-theme');
  
    localStorage.setItem('isDarkTheme', isDarkTheme);
};

const loadTheme = () => {
    const isDarkTheme = localStorage.getItem('isDarkTheme') === 'true';
  
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
    }
};

