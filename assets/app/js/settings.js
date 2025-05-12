const buttonToSettings = document.getElementById('to-settings-button');
const leftLayout = document.getElementById('left-layout');
const settingsLayout = document.getElementById('settings-layout');
const backButton = document.getElementById('from-settings-button');

async function initSettings() {
    leftLayout.classList.remove('hidden');

    buttonToSettings.addEventListener('click', () => {
        leftLayout.classList.add('hidden');
    });

    backButton.addEventListener('click', () => {
        leftLayout.classList.remove('hidden');
    });

}

async function mobileInitSettings() {
    leftLayout.classList.remove('hidden');
    settingsLayout.classList.add('hidden');

    buttonToSettings.addEventListener('click', () => {
        settingsLayout.classList.remove('hidden');
    });

    backButton.addEventListener('click', () => {
        settingsLayout.classList.add('hidden');
    });

}
