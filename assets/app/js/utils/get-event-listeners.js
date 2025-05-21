if (!Element.prototype.getEventListeners) {
    Element.prototype.getEventListeners = function(eventName) {
        return [];
    };
}
