const buttonToSettings = document.getElementById('buttonToSettings');
const leftLayout = document.getElementById('leftLayout');
const settingsLayout = document.getElementById('settingsLayout');
const backButton = document.getElementById('backButton');

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
