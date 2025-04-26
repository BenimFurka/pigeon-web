const defaultHue = 235;

function adjustHue() {
    const currentHue = parseInt(document.getElementById('hue-slider').value);
    document.getElementById('hue-value').textContent = currentHue;

    localStorage.setItem('hueValue', currentHue);

    const colors = generateColorsFromHue(currentHue);
    updateCSSVariables(colors);
}

function loadHue() {
    const storedHue = localStorage.getItem('hueValue');

    if (storedHue) {
        document.getElementById('hue-slider').value = storedHue;
        document.getElementById('hue-value').textContent = storedHue;
        
        const colors = generateColorsFromHue(storedHue);
        updateCSSVariables(colors);
    } else {
        document.getElementById('hue-slider').value = defaultHue;
        document.getElementById('hue-value').textContent = defaultHue;

        const colors = generateColorsFromHue(defaultHue);
        updateCSSVariables(colors);
    }
}


function updateCSSVariables(colors) {
    const rootStyles = `
        :root {
            --primary-color: ${colors.lightPrimary};
            --secondary-color: ${colors.lightSecondary};
            --text-color: black;
            --hover-color: brightness(1.05);
            --border-color: #ccc;
            --bg-glass: rgba(0, 0, 0, 0.05);
            --transition: color 0.3s, background-color 0.3s, border-color 0.3s, opacity 0.3s ease;
        }`
    ;

    const darkThemeStyles = `
        .dark-theme {
            --primary-color: ${colors.darkPrimary};
            --secondary-color: ${colors.darkSecondary};
            --border-color: #282A36;
            --text-color: #E0E0E0;
            --hover-color: brightness(0.95);
            --bg-glass: rgba(255, 255, 255, 0.05);
            --transition: color 0.3s, background-color 0.3s, border-color 0.3s, opacity 0.3s ease;
        }`
    ;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = rootStyles + darkThemeStyles;
    document.head.appendChild(styleSheet);
}

function generateColorsFromHue(hue) {
    hue = Math.max(0, Math.min(360, hue));
    
    return {
        darkPrimary: hsvToHex(hue, 0.53, 0.68),    
        darkSecondary: hsvToHex(hue - 5, 0.33, 0.14), 
        lightPrimary: hsvToHex(hue, 0.39, 0.82),     
        lightSecondary: hsvToHex(hue - 1, 0.04, 0.93) 
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

