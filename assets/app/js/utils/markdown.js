function parseMarkdown(content) {
    if (!content) return '';

    let html = '';
    
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        marked.setOptions({
            highlight: (code, lang) => {
                if (typeof hljs !== 'undefined') {
                    try {
                        return hljs.highlight(code, { 
                            language: lang || 'plaintext' 
                        }).value;
                    } catch (e) {
                        return hljs.highlightAuto(code).value;
                    }
                }
                return code;
            },
            langPrefix: 'hljs language-'
        });
        html = marked.parse(content);
    } 
    else {
        let safeText = sanitizeHTML(content);
        
        safeText = safeText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        safeText = safeText.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        safeText = safeText.replace(/`([^`]+)`/g, '<code>$1</code>');
        safeText = safeText.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g, 
            '<a href="$2" target="_blank" rel="noopener">$1</a>'
        );
        safeText = safeText.replace(
            /```(\w+)?\s*([\s\S]+?)```/g, 
            '<pre><code class="$1">$2</code></pre>'
        );
        safeText = safeText.replace(/\n/g, '<br>');
        
        html = safeText;
    }

    if (typeof hljs !== 'undefined') {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        temp.querySelectorAll('pre code').forEach((block) => {
            if (!block.className.includes('hljs')) {
                hljs.highlightElement(block);
            }
        });
        
        html = temp.innerHTML;
    }

    return html;
}