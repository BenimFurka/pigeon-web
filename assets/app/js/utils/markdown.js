function parseMarkdown(text) {
    if (!text) return '';

    try {
        let html = window.markdownParser.parse(text);

        if (typeof window.hljs !== 'undefined') {
            const temp = document.createElement('div');
            temp.innerHTML = html;

            temp.querySelectorAll('pre code').forEach((block) => {
                if (!block.className.includes('hljs')) {
                    window.hljs.highlightElement(block);
                }
            });

            html = temp.innerHTML;
        }

        return html;
    } catch (error) {
        console.error('Error parsing markdown:', error);
        return text;
    }
}
