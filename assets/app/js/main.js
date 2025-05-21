window._mainJsLoaded = true;
console.log('main.js загружен, platform: ' + (navigator.userAgent.match(/Android|iPhone|iPad|iPod/i) ? 'mobile' : 'desktop'));

(function() {
    const loadingScreen = document.getElementById('loading-screen');
    const progressElement = document.getElementById('progress');
    
    const STAGES = {
        SCRIPTS: {
            name: 'Загрузка скриптов',
            range: [0, 40]
        },
        AUTH: {
            name: 'Авторизация',
            range: [50, 60]
        },
        INIT: {
            name: 'Инициализация',
            range: [60, 70]
        },
        LOADING: {
            name: 'Загрузка данных',
            range: [70, 100]
        }
    };
    
    let currentStage = STAGES.SCRIPTS;
    let targetProgress = 0;
    let animationFrame = null;
    
    const loadingUI = {
        setStageProgress: (stagePercent) => {
            const [min, max] = currentStage.range;
            const rangeSize = max - min;
            targetProgress = min + (rangeSize * stagePercent / 100);
            
            progressElement.textContent = `${currentStage.name} (${Math.round(targetProgress)}%)`;
        },
        
        switchToStage: (stage, initialPercent = 0) => {
            currentStage = stage;
            const [min, max] = stage.range;
            const rangeSize = max - min;
            targetProgress = min + (rangeSize * initialPercent / 100);
        },
        
        hide: () => {
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
            
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
        }
    };
    
    const scriptGroups = [
        {
            name: 'Утилиты',
            scripts: [
                'assets/app/js/utils/sanitize.js',
                'assets/app/js/utils/debounce.js',
                'assets/app/js/utils/throttle.js',
                'assets/app/js/utils/format-datetime.js',
                'assets/app/js/utils/get-event-listeners.js',
                'assets/app/js/utils/create-message.js',
                'assets/app/js/utils/markdown.js',
                'assets/app/js/utils/themes.js',
                'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js',
                'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
            ]
        },
        {
            name: 'Базовые компоненты',
            scripts: [
                'assets/app/js/textarea.js',
                'assets/app/js/avatar.js',
                'assets/app/js/settings.js',
                'assets/app/js/theme.js',
                'assets/app/js/height.js'
            ]
        },
        {
            name: 'WebSocket компоненты',
            scripts: [
                'assets/app/js/websocket/new-message.js',
                'assets/app/js/websocket/online-status.js',
                'assets/app/js/websocket/online-list.js'
            ]
        },
        {
            name: 'Авторизация',
            scripts: [
                'assets/app/js/auth/auth.js',
                'assets/app/js/auth/profile.js',
                'assets/app/js/auth/ws.js'
            ]
        },
        {
            name: 'Основной модуль',
            scripts: [
                'assets/app/js/chat-module.js'
            ]
        }
    ];
    
    const scripts = scriptGroups.reduce((acc, group) => [...acc, ...group.scripts], []);
    
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

    let loadedScripts = 0;
    
    function loadScript(src) {
        console.log('Попытка загрузить скрипт: ' + src);
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            
            script.onload = () => {
                loadedScripts++;
                const percent = Math.round((loadedScripts / scripts.length) * 100);
                console.log(`Загружен скрипт ${loadedScripts}/${scripts.length}: ${src}`);
                
                loadingUI.setStageProgress(percent);
                
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`Не удалось загрузить скрипт: ${src}`, error);
                
                loadedScripts++;
                const percent = Math.round((loadedScripts / scripts.length) * 100);
                loadingUI.setStageProgress(percent);
                
                reject(new Error(`Не удалось загрузить скрипт: ${src}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    async function loadAllScripts() {
        console.log('Начало загрузки всех скриптов...');
        try {
            const isMobile = navigator.userAgent.match(/Android|iPhone|iPad|iPod/i);
            console.log('Определена платформа: ' + (isMobile ? 'mobile' : 'desktop'));
            
            loadingUI.switchToStage(STAGES.SCRIPTS, 0);
            
            for (const group of scriptGroups) {
                console.log(`Загрузка группы скриптов: ${group.name}`);
                
                await Promise.all(
                    group.scripts.map(scriptSrc => 
                        loadScript(scriptSrc).catch(error => {
                            console.error(`Ошибка загрузки скрипта ${scriptSrc}:`, error);
                        })
                    )
                );
                
                console.log(`Группа скриптов "${group.name}" загружена`);
            }
            
            setTimeout(() => {
                console.log('Инициализация приложения...');
                initializeApp();
            }, 50);
        } catch (error) {
            console.error('Общая ошибка загрузки скриптов:', error);
            
            loadingUI.switchToStage(STAGES.LOADING, 100);
            setTimeout(() => loadingUI.hide(), 1000);
        }
    }
    
    async function initializeApp() {
        console.log('Начало инициализации приложения...');
        try {
            loadingUI.switchToStage(STAGES.AUTH, 0);
            
            if (!window.ChatModule) {
                let attempts = 0;
                const maxAttempts = 5;
                
                await new Promise((resolve) => {
                    const checkChatModule = () => {
                        attempts++;
                        console.log(`Проверка наличия ChatModule: попытка ${attempts}/${maxAttempts}`);
                        
                        if (window.ChatModule) {
                            console.log('ChatModule найден!');
                            resolve();
                        } else if (attempts < maxAttempts) {
                            setTimeout(checkChatModule, 100);
                        } else {
                            console.warn('ChatModule не найден после нескольких попыток');
                            resolve();
                        }
                    };
                    
                    checkChatModule();
                });
            }
            
            console.log('Проверка наличия функций...');
            
            if (typeof refreshTokens === 'function') {
                console.log('Вызов refreshTokens()');
                refreshTokens();
                loadingUI.setStageProgress(50);
            } else {
                console.warn('Функция refreshTokens не найдена');
            }
            
            if (typeof checkAuth === 'function') {
                console.log('Вызов checkAuth()');
                checkAuth();
                loadingUI.setStageProgress(100);
            } else {
                console.warn('Функция checkAuth не найдена');
                loadingUI.setStageProgress(100);
            }
            
            loadingUI.switchToStage(STAGES.INIT, 0);
            
            if (typeof initSettings === 'function') {
                console.log('Вызов initSettings()');
                await initSettings();
                loadingUI.setStageProgress(40);
            } else {
                console.warn('Функция initSettings не найдена');
            }
            
            if (typeof loadHue === 'function') {
                console.log('Вызов loadHue()');
                loadHue();
                loadingUI.setStageProgress(70);
            } else {
                console.warn('Функция loadHue не найдена');
            }
            
            if (typeof loadTheme === 'function') {
                console.log('Вызов loadTheme()');
                loadTheme();
                loadingUI.setStageProgress(100);
            } else {
                console.warn('Функция loadTheme не найдена');
                loadingUI.setStageProgress(100);
            }
            
            loadingUI.switchToStage(STAGES.LOADING, 0);
            
            if (window.ChatModule) {
                console.log('Используем API ChatModule');
                
                if (typeof ChatModule.loadChats === 'function') {
                    console.log('Вызов ChatModule.loadChats()');
                    await ChatModule.loadChats();
                    loadingUI.setStageProgress(60);
                }
                
                if (typeof ChatModule.init === 'function') {
                    console.log('Вызов ChatModule.init()');
                    ChatModule.init();
                    loadingUI.setStageProgress(80);
                } else {
                    console.warn('Функция ChatModule.init не найдена');
                }
            } else {
                console.warn('ChatModule не найден, используем старый API');
                
                if (typeof loadChats === 'function') {
                    console.log('Вызов loadChats()');
                    await loadChats();
                    loadingUI.setStageProgress(60);
                } else {
                    console.error('Функция loadChats не найдена');
                }
            }
            
            if (typeof connect === 'function') {
                console.log('Вызов connect()');
                await connect();
                loadingUI.setStageProgress(100);
            } else {
                console.warn('Функция connect не найдена');
                loadingUI.setStageProgress(100);
            }
            
            setTimeout(() => loadingUI.hide(), 500);
            
            console.log('Приложение чата успешно инициализировано');
        } catch (error) {
            console.error('Ошибка инициализации приложения:', error);
            
            loadingUI.switchToStage(STAGES.LOADING, 100);
            setTimeout(() => loadingUI.hide(), 1000);
        }
    }
    
    if (document.readyState === 'loading') {
        console.log('DOM еще загружается, добавляем обработчик DOMContentLoaded');
        window.addEventListener('DOMContentLoaded', () => {
            console.log('DOM загружен, начинаем загрузку скриптов');
            loadAllScripts();
        });
    } else {
        console.log('DOM уже загружен, начинаем загрузку скриптов немедленно');
        loadAllScripts();
    }
})();