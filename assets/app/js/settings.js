const buttonToSettings = document.getElementById('to-settings-button');
const leftLayout = document.getElementById('left-layout');
const settingsLayout = document.getElementById('settings-layout');
const backButton = document.getElementById('from-settings-button');
const settingsList = document.getElementById('settings-list');
let currentSection = null;

const settingsSections = {
    profile: {
        title: 'Мой профиль',
        icon: '👤',
        templateId: 'settings-section-profile'
    },
    appearance: {
        title: 'Внешний вид',
        icon: '🎨',
        templateId: 'settings-section-appearance'
    },
    notifications: {
        title: 'Звуки и уведомления',
        icon: '🔔',
        templateId: 'settings-section-notifications'
    }
};

function initSettingsUI() {
    settingsList.innerHTML = '';
    
    const profilePreview = document.createElement('div');
    profilePreview.id = 'profile-preview';
    profilePreview.className = 'profile-preview';
    settingsList.appendChild(profilePreview);
    
    const listItemTemplate = document.getElementById('settings-list-item');
    for (const [id, section] of Object.entries(settingsSections)) {
        let sectionElement;
        if (listItemTemplate) {
            sectionElement = listItemTemplate.content.cloneNode(true).firstElementChild;
            sectionElement.querySelector('.section-icon').textContent = section.icon;
            sectionElement.querySelector('h3').textContent = section.title;
        } else {
            sectionElement = document.createElement('div');
            sectionElement.className = 'settings-section-item';
            sectionElement.innerHTML = `
                <div class="section-icon">${section.icon}</div>
                <div class="section-content">
                    <h3>${section.title}</h3>
                </div>
                <div class="section-arrow">›</div>
            `;
        }
        sectionElement.addEventListener('click', () => showSection(id));
        settingsList.appendChild(sectionElement);
    }
    
    loadSettings();
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('back-button')) {
            showMainSettings();
        }
    });
    
    document.addEventListener('change', (e) => {
        if (e.target.matches('#notifications-toggle, #sounds-toggle')) {
            saveSettings();
        }
    });
}

function showSection(sectionId) {
    if (!settingsSections[sectionId]) return;
    
    currentSection = sectionId;
    settingsList.innerHTML = '';
    const sectionData = settingsSections[sectionId];
    const template = document.getElementById(sectionData.templateId);
    if (template) {
        const clonedContent = template.content.cloneNode(true);
        settingsList.appendChild(clonedContent);
    }

    if (sectionId === 'appearance') {
        if (window.HueManager && window.HueManager.loadHue) {
            window.HueManager.loadHue();
        }
        if (window.ThemeManager && window.ThemeManager.loadTheme) {
            window.ThemeManager.loadTheme();
        }
    } else if (sectionId === 'profile') {
        loadProfilePreview();
    }
}

function showMainSettings() {
    currentSection = null;
    initSettingsUI();
    loadProfilePreview();
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    
    if (settings.notificationsEnabled !== undefined) {
        const toggle = document.getElementById('notifications-toggle');
        if (toggle) toggle.checked = settings.notificationsEnabled;
    }
    
    if (settings.soundsEnabled !== undefined) {
        const toggle = document.getElementById('sounds-toggle');
        if (toggle) toggle.checked = settings.soundsEnabled;
    }
}

function saveSettings() {
    const settings = {
        notificationsEnabled: document.getElementById('notifications-toggle')?.checked ?? true,
        soundsEnabled: document.getElementById('sounds-toggle')?.checked ?? true
    };
    
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

async function loadProfilePreview() {
    try {
        const profile = await waitForProfileLoaded();
        const preview = document.getElementById('profile-preview') || document.getElementById('profile');
        if (!preview) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', loadProfilePreview);
            } else {
                setTimeout(loadProfilePreview, 100);
            }
            return;
        }
        
        if (!preview.classList.contains('profile-element')) {
            preview.classList.add('profile-element');
        }
        
        const { user_id, display, username, created_at } = profile.data;
        
        preview.innerHTML = `
            <div class="profile-header">
                <div class="avatar-container" onclick="changeAvatar(${user_id})">
                    <img src="" 
                        class="avatar" 
                        style="width: 64px; height: 64px; border-radius: 10px">
                    <div class="avatar-overlay">Изменить</div>
                </div>
                <div class="profile-info">
                    <h2>${display || username}</h2>
                    <p>@${username}</p>
                </div>
            </div>
        `;
        
        try {
            const avatarBase64 = await getAvatar(user_id);
            const img = preview.querySelector('.avatar');
            if (img) {
                img.src = avatarBase64;
                img.onerror = () => {
                    console.warn('[WARN] Failed to load avatar');
                };
            }
        } catch (error) {
            console.error('[ERROR] Ошибка загрузки аватара:', error);
        }
    } catch (error) {
        console.error('[ERROR] Ошибка загрузки профиля:', error);
        setTimeout(loadProfilePreview, 1000);
    }
}

async function initSettings() {
    const isMobile = window.location.pathname.split('/').pop() === 'app_mobile';
    
    if (isMobile) {
        leftLayout.classList.remove('hidden');
        settingsLayout.classList.add('hidden');

        buttonToSettings.addEventListener('click', () => {
            settingsLayout.classList.remove('hidden');
            showMainSettings();
        });

        backButton.addEventListener('click', () => {
            if (currentSection) {
                showMainSettings();
            } else {
                settingsLayout.classList.add('hidden');
            }
        });
    } else {
        leftLayout.classList.remove('hidden');
        settingsLayout.classList.add('hidden');

        buttonToSettings.addEventListener('click', () => {
            leftLayout.classList.add('hidden');
            settingsLayout.classList.remove('hidden');
            showMainSettings();
        });

        backButton.addEventListener('click', () => {
            if (currentSection) {
                showMainSettings();
            } else {
                leftLayout.classList.remove('hidden');
                settingsLayout.classList.add('hidden');
            }
        });
    }
    
    initSettingsUI();
}
