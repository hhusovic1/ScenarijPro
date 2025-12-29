const PoziviAjax = (() => {

    function ajaxRequest(method, url, data, fnCallback) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                let responseData = {};
                try {
                    responseData = JSON.parse(xhr.responseText);
                } catch (e) {
                    responseData = {};
                }
                fnCallback(xhr.status, responseData);
            }
        };

        xhr.send(data ? JSON.stringify(data) : null);
    }
   
    return {
        postScenario: function(title, fnCallback) {
            ajaxRequest('POST', '/api/scenarios', { title: title }, fnCallback);
        },

        getScenario: function(scenarioId, fnCallback) {
            ajaxRequest('GET', `/api/scenarios/${scenarioId}`, null, fnCallback);
        },

        lockLine: function(scenarioId, lineId, userId, fnCallback) {
            ajaxRequest('POST', `/api/scenarios/${scenarioId}/lines/${lineId}/lock`, { userId: userId }, fnCallback);
        },

        updateLine: function(scenarioId, lineId, userId, newText, fnCallback) {
            const data = { 
                userId: userId, 
                newText: Array.isArray(newText) ? newText : [newText] 
            };
            ajaxRequest('PUT', `/api/scenarios/${scenarioId}/lines/${lineId}`, data, fnCallback);
        },

        lockCharacter: function(scenarioId, characterName, userId, fnCallback) {
            ajaxRequest('POST', `/api/scenarios/${scenarioId}/characters/lock`, { 
                userId: userId, 
                characterName: characterName 
            }, fnCallback);
        },

        updateCharacter: function(scenarioId, userId, oldName, newName, fnCallback) {
            ajaxRequest('POST', `/api/scenarios/${scenarioId}/characters/update`, { 
                userId: userId, 
                oldName: oldName, 
                newName: newName 
            }, fnCallback);
        },

        getDeltas: function(scenarioId, since, fnCallback) {
            const timestamp = since ? since : 0;
            ajaxRequest('GET', `/api/scenarios/${scenarioId}/deltas?since=${timestamp}`, null, fnCallback);
        }
    };
})();
