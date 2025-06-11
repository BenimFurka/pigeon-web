window._mainJsLoaded = true;
console.log('[INIT] main.js loaded, platform: ' + (navigator.userAgent.match(/Android|iPhone|iPad|iPod/i) ? 'mobile' : 'desktop'));

class LoadingManager {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressElement = document.getElementById('progress');
        this.currentStage = null;
        this.targetProgress = 0;
        this.animationFrame = null;
        
        this.STAGES = {
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
    }

    setStageProgress(stagePercent) {
        const [min, max] = this.currentStage.range;
        const rangeSize = max - min;
        this.targetProgress = min + (rangeSize * stagePercent / 100);
        
        this.progressElement.textContent = `${this.currentStage.name} (${Math.round(this.targetProgress)}%)`;
    }

    switchToStage(stage, initialPercent = 0) {
        this.currentStage = stage;
        const [min, max] = stage.range;
        const rangeSize = max - min;
        this.targetProgress = min + (rangeSize * initialPercent / 100);
    }

    hide() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}

class ScriptLoader {
    constructor(loadingManager) {
        this.loadingManager = loadingManager;
        this.loadedScripts = 0;
        this.scriptGroups = [
            {
                name: 'Утилиты',
                scripts: [
                    '/assets/app/js/utils/debounce.js',
                    '/assets/app/js/utils/throttle.js',
                    '/assets/app/js/utils/format-datetime.js',
                    '/assets/app/js/utils/create-message.js',
                    '/assets/app/js/utils/markdown.js',
                    '/assets/app/js/utils/themes.js',
                    '/assets/app/js/utils/get-event-listeners.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js',
                    'https://cdn.jsdelivr.net/gh/BenimFurka/pigeon-markdown/dist/pigeon-markdown.js',
                ]
            },
            {
                name: 'Базовые компоненты',
                scripts: [
                    '/assets/app/js/textarea.js',
                    '/assets/app/js/avatar-manager.js',
                    '/assets/app/js/profile-manager.js',
                    '/assets/app/js/chat-manager.js',
                    '/assets/app/js/message-manager.js',
                    '/assets/app/js/settings.js',
                    '/assets/app/js/theme.js',
                    '/assets/app/js/height.js'
                ]
            },
            {
                name: 'WebSocket компоненты',
                scripts: [
                    '/assets/app/js/websocket/new-message.js',
                    '/assets/app/js/websocket/online-status.js',
                    '/assets/app/js/websocket/online-list.js',
                    '/assets/app/js/websocket/typing.js',
                    '/assets/app/js/websocket/message-updates.js'
                ]
            },
            {
                name: 'Авторизация',
                scripts: [
                    '/assets/app/js/auth/auth.js',
                    '/assets/app/js/auth/profile.js',
                    '/assets/app/js/auth/ws.js'
                ]
            },
            {
                name: 'Основной модуль',
                scripts: [
                    '/assets/app/js/context-menu.js',
                    '/assets/app/js/chat-module.js'
                ]
            }
        ];
    }

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            
            script.onload = () => {
                this.loadedScripts++;
                const percent = Math.round((this.loadedScripts / this.getAllScripts().length) * 100);
                this.loadingManager.setStageProgress(percent);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`[ERROR] Failed to load script: ${src}`, error);
                
                this.loadedScripts++;
                const percent = Math.round((this.loadedScripts / this.getAllScripts().length) * 100);
                this.loadingManager.setStageProgress(percent);
                
                reject(new Error(`[ERROR] Failed to load script: ${src}`));
            };
            
            document.head.appendChild(script);
        });
    }

    getAllScripts() {
        return this.scriptGroups.reduce((acc, group) => [...acc, ...group.scripts], []);
    }

    async loadAllScripts() {
        try {
            const isMobile = navigator.userAgent.match(/Android|iPhone|iPad|iPod/i);
            this.loadingManager.switchToStage(this.loadingManager.STAGES.SCRIPTS, 0);
            
            for (const group of this.scriptGroups) {
                
                await Promise.all(
                    group.scripts.map(scriptSrc => 
                        this.loadScript(scriptSrc).catch(error => {
                            console.error(`[ERROR] Failed to load script ${scriptSrc}:`, error);
                        })
                    )
                );
            }
            
            setTimeout(() => {
                this.initializeApp();
            }, 50);
        } catch (error) {
            console.error('[ERROR] General error loading scripts:', error);
            
            this.loadingManager.switchToStage(this.loadingManager.STAGES.LOADING, 100);
            setTimeout(() => this.loadingManager.hide(), 1000);
        }
    }

    async initializeApp() {
        try {
            this.loadingManager.switchToStage(this.loadingManager.STAGES.AUTH, 0);
            
            if (window.HueManager && window.HueManager.initializeTheme) {
                window.HueManager.initializeTheme();
            }
            
            await this.waitForMarkdown();
            await this.waitForChatModule();
            await this.initializeAuth();
            await this.initializeSettings();
            await this.initializeChat();
            
            setTimeout(() => this.loadingManager.hide(), 500);
        } catch (error) {
            console.error('[ERROR] Error initializing app:', error);
            this.loadingManager.switchToStage(this.loadingManager.STAGES.LOADING, 100);
            setTimeout(() => this.loadingManager.hide(), 1000);
        }
    }



    async waitForChatModule() {
        if (!window.ChatModule) {
            let attempts = 0;
            const maxAttempts = 5;
            
            await new Promise((resolve) => {
                const checkChatModule = () => {
                    attempts++;
                    
                    if (window.ChatModule) {
                        resolve();
                    } else if (attempts < maxAttempts) {
                        setTimeout(checkChatModule, 100);
                    } else {
                        console.warn('[WARN] ChatModule not found after several attempts');
                        resolve();
                    }
                };
                
                checkChatModule();
            });
        }
    }

    async waitForMarkdown() {
        if (!window.PigeonMarkdown) {
            let attempts = 0;
            const maxAttempts = 5;
            
            await new Promise((resolve) => {
                const checkMarkdown = () => {
                    attempts++;
                    
                    if (window.PigeonMarkdown) {
                        const parser = new PigeonMarkdown({
                            features: {
                                headings: false 
                            }
                        });              
                        window.markdownParser = parser;
                        resolve();
                    } else if (attempts < maxAttempts) {
                        setTimeout(checkMarkdown, 100);
                    } else {
                        console.warn('[WARN] PigeonMarkdown not found after several attempts');
                        resolve();
                    }
                };
                
                checkMarkdown();
            });
        } else {
            window.markdownParser = new PigeonMarkdown({
                features: {
                    headings: false 
                }
            });
        }
    }

    async initializeAuth() {
        if (typeof refreshTokens === 'function') {
            refreshTokens();
            this.loadingManager.setStageProgress(50);
        } else {
            console.warn('[WARN] Function refreshTokens not found');
        }
        
        if (typeof checkAuth === 'function') {
            checkAuth();
            this.loadingManager.setStageProgress(100);
        } else {
            console.warn('[WARN] Function checkAuth not found');
            this.loadingManager.setStageProgress(100);
        }
    }

    async initializeSettings() {
        this.loadingManager.switchToStage(this.loadingManager.STAGES.INIT, 0);
        
        if (typeof initSettings === 'function') {
            await initSettings();
            this.loadingManager.setStageProgress(40);
        } else {
            console.warn('[WARN] Function initSettings not found');
        }
        
        if (typeof loadHue === 'function') {
            loadHue();
            this.loadingManager.setStageProgress(70);
        } else {
            console.warn('[WARN] Function loadHue not found');
        }
        
        if (typeof loadTheme === 'function') {
            loadTheme();
            this.loadingManager.setStageProgress(100);
        } else {
            console.warn('[WARN] Function loadTheme not found');
            this.loadingManager.setStageProgress(100);
        }
    }

    async initializeChat() {
        this.loadingManager.switchToStage(this.loadingManager.STAGES.LOADING, 0);
        
        if (window.waitForProfileLoaded) {
            try {
                await window.waitForProfileLoaded();
                this.loadingManager.setStageProgress(40);
            } catch (error) {
                console.error('[ERROR] Error loading profile:', error);
            }
        } else {
            console.warn('[WARN] Function waitForProfileLoaded not found');
        }
        
        if (window.ChatModule) {
            try {
                const chatModule = window.ChatModule.init();
                
                if (chatModule.loadChats) {
                    await chatModule.loadChats();
                    this.loadingManager.setStageProgress(60);
                }
                
                this.loadingManager.setStageProgress(80);
            } catch (error) {
                console.error('[ERROR] Error initializing ChatModule:', error);
            }
        } else {
            console.warn('[WARN] ChatModule not found');
            this.loadingManager.setStageProgress(100);
        }
        
        if (typeof connect === 'function') {
            await connect();
            this.loadingManager.setStageProgress(100);
        } else {
            console.warn('[WARN] Function connect not found');
            this.loadingManager.setStageProgress(100);
        }
    }
}

const loadingManager = new LoadingManager();
const scriptLoader = new ScriptLoader(loadingManager);

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        scriptLoader.loadAllScripts();
    });
} else {
    scriptLoader.loadAllScripts();
}
