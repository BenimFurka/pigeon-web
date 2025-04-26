function parseContent(content) {
    
    const sanitized = content.trim()
        .replace(/</g, '&lt;')  
        .replace(/>/g, '&gt;'); 
    
    return marked.parse(sanitized);
}