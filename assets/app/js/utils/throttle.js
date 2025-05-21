
function throttle(func, limit) {
    if (typeof limit === 'undefined') limit = 300;
    
    var inThrottle = false;
    var lastFunc;
    var lastRan;
    
    return function() {
        var context = this;
        var args = arguments;
        
        if (!inThrottle) {
            func.apply(context, args);
            lastRan = Date.now();
            inThrottle = true;
            
            setTimeout(function() {
                inThrottle = false;
            }, limit);
        } else {
            clearTimeout(lastFunc);
            
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, Math.max(0, limit - (Date.now() - lastRan)));
        }
    };
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { throttle: throttle };
} 