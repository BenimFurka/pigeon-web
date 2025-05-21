function formatDateTime(timestamp, options = {}) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    const defaultOptions = {
        time: { hour: '2-digit', minute: '2-digit' },
        date: { day: 'numeric', month: 'short' },
        full: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    };
    
    const format = options.format || 'time';
    
    return date.toLocaleString(
        options.locale || 'ru-RU', 
        options.custom || defaultOptions[format]
    );
}