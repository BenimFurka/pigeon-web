const defaultHue = 235;

function adjustHue() {
    const hueSlider = document.getElementById('hue-slider');
    const hueValue = document.getElementById('hue-value');
    
    if (!hueSlider || !hueValue) return;
    
    const currentHue = parseInt(hueSlider.value);
    hueValue.textContent = currentHue;

    localStorage.setItem('hueValue', currentHue);

    const colors = generateColorsFromHue(currentHue);
    updateCSSVariables(colors);
}

function loadHue() {
    const hueSlider = document.getElementById('hue-slider');
    const hueValue = document.getElementById('hue-value');
    
    if (!hueSlider || !hueValue) return;
    
    const storedHue = localStorage.getItem('hueValue');
    const hue = storedHue ? parseInt(storedHue) : defaultHue;
    
    hueSlider.value = hue;
    hueValue.textContent = hue;
    
    const colors = generateColorsFromHue(hue);
    updateCSSVariables(colors);
    
    hueSlider.addEventListener('input', adjustHue);
}

function updateCSSVariables(colors) {
    if (!colors || typeof document === 'undefined') return;
    
    let styleElement = document.getElementById('hue-styles');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'hue-styles';
        document.head.appendChild(styleElement);
    }
    
    const rootStyles = `
        :root {
            --primary-color: ${colors.lightPrimary};
            --secondary-color: ${colors.lightSecondary};
            --glass-color: ${colors.lightGlass};
            --border-color: ${colors.lightBorder};
            --text-color: black;
            --hover-color: brightness(1.05);
            --bg-glass: rgba(0, 0, 0, 0.05);
            --transition: color 0.3s, background-color 0.3s, border-color 0.3s, opacity 0.3s ease;
        }`
    ;

    const darkThemeStyles = `
        .dark-theme {
            --primary-color: ${colors.darkPrimary};
            --secondary-color: ${colors.darkSecondary};
            --glass-color: ${colors.darkGlass};
            --border-color: ${colors.darkBorder};
            --text-color: #E0E0E0;
            --hover-color: brightness(0.95);
            --bg-glass: rgba(255, 255, 255, 0.05);
            --transition: color 0.3s, background-color 0.3s, border-color 0.3s, opacity 0.3s ease;
        }`
    ;
    
    styleElement.textContent = rootStyles + darkThemeStyles;
}

function initializeTheme() {
    if (window.ThemeManager && window.ThemeManager.loadTheme) {
        window.ThemeManager.loadTheme();
    }
    
    const storedHue = localStorage.getItem('hueValue');
    const hue = storedHue ? parseInt(storedHue) : defaultHue;
    const colors = generateColorsFromHue(hue);
    updateCSSVariables(colors);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeTheme, 1);
} else {
    document.addEventListener('DOMContentLoaded', initializeTheme);
}

window.HueManager = {
    adjustHue,
    loadHue,
    initializeTheme
};

function generateColorsFromHue(hue) {
    hue = Math.max(0, Math.min(360, hue));
    
    return {
        darkPrimary: hsvToHex(hue, 0.53, 0.68),
        darkSecondary: hsvToHex(hue - 5, 0.33, 0.14),
        darkGlass: hsvToHex(hue - 5, 0.30, 0.15),
        darkBorder: hsvToHex(hue - 5, 0.45, 0.22),
        lightPrimary: hsvToHex(hue, 0.39, 0.82),
        lightSecondary: hsvToHex(hue - 1, 0.04, 0.93),
        lightGlass: hsvToHex(hue - 1, 0.03, 0.91),
        lightBorder: hsvToHex(hue - 1, 0.08, 0.86)
    };
}

function hsvToHex(h, s, v) {
    h = ((h % 360) + 360) % 360 / 360; 
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));
    
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    let r, g, b;
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

