const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;


app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); 
app.use(express.static(path.join(__dirname, '..', 'html')));


const DATA_DIR = path.join(__dirname, '..', 'data');
const SCENARIOS_DIR = path.join(DATA_DIR, 'scenarios');
const DELTAS_FILE = path.join(DATA_DIR, 'deltas.json');


if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(SCENARIOS_DIR)) fs.mkdirSync(SCENARIOS_DIR);
if (!fs.existsSync(DELTAS_FILE)) fs.writeFileSync(DELTAS_FILE, '[]');


let locks = {}; 
let userLocks = {}; 


function getNextScenarioId() {
    const files = fs.readdirSync(SCENARIOS_DIR);
    let maxId = 0;
    files.forEach(file => {
        const match = file.match(/scenario-(\d+)\.json/);
        if (match) {
            const id = parseInt(match[1]);
            if (id > maxId) maxId = id;
        }
    });
    return maxId + 1;
}


function writeDelta(delta) {
    let deltas = [];
    try {
        const data = fs.readFileSync(DELTAS_FILE, 'utf8');
        deltas = JSON.parse(data);
    } catch (e) { deltas = []; }
    
    deltas.push(delta);
    fs.writeFileSync(DELTAS_FILE, JSON.stringify(deltas, null, 2));
}


function getScenarioFilePath(id) {
    return path.join(SCENARIOS_DIR, `scenario-${id}.json`);
}


function wrapText(text, maxWords = 20) {
    if (!text || text.trim() === '') return [""];
    const words = text.trim().split(/\s+/);
    const lines = [];
    for (let i = 0; i < words.length; i += maxWords) {
        lines.push(words.slice(i, i + maxWords).join(" "));
    }
    return lines;
}





app.get('/api/scenarios/all', (req, res) => {
    const files = fs.readdirSync(SCENARIOS_DIR);
    const scenarios = [];
    
    files.forEach(file => {
        if (file.startsWith('scenario-') && file.endsWith('.json')) {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, file), 'utf8'));
                scenarios.push({ 
                    id: content.id, 
                    title: content.title || "Untitled" 
                });
            } catch (err) {
                console.error("Error reading file:", file);
            }
        }
    });
    
    res.json(scenarios);
});


app.post('/api/scenarios', (req, res) => {
    const title = req.body.title || "Unnamed scenario";
    const id = getNextScenarioId();
    
    const newScenario = {
        id: id,
        title: title,
        content: [
            { lineId: 1, text: "", nextLineId: null }
        ]
    };


    fs.writeFileSync(getScenarioFilePath(id), JSON.stringify(newScenario, null, 2));
    res.status(200).json(newScenario);
});


app.get('/api/scenarios/:scenarioId', (req, res) => {
    const filePath = getScenarioFilePath(req.params.scenarioId);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }


    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));


    const responseObj = {
        id: data.id,
        title: data.title,
        content: data.content 
    };


    res.status(200).json(responseObj);
});



app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', (req, res) => {
    const { scenarioId, lineId } = req.params;
    const { userId } = req.body;
    const lid = parseInt(lineId);


    if (!userId) return res.status(400).json({ message: "userId required" });



    const filePath = getScenarioFilePath(scenarioId);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }


    try {
        const scenario = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const lineExists = scenario.content.some(l => l.lineId === lid);
        if (!lineExists) {
            return res.status(404).json({ message: "Linija ne postoji!" });
        }
    } catch (e) {
        return res.status(500).json({ message: "Greška pri čitanju fajla" });
    }


    if (!locks[scenarioId]) locks[scenarioId] = { lines: {}, characters: {} };



    if (locks[scenarioId].lines[lid] && locks[scenarioId].lines[lid] !== userId) {
        return res.status(409).json({ message: "Linija je vec zakljucana!" });
    }


    if (userLocks[userId]) {
        const old = userLocks[userId];
        if (old.type === 'line' && locks[old.scenarioId]) {
            delete locks[old.scenarioId].lines[old.id];
        } else if (old.type === 'char' && locks[old.scenarioId]) {
            delete locks[old.scenarioId].characters[old.id];
        }
    }


    locks[scenarioId].lines[lid] = userId;
    userLocks[userId] = { type: 'line', scenarioId: scenarioId, id: lid };


    res.status(200).json({ message: "Linija je uspjesno zakljucana!" });
});




app.put('/api/scenarios/:scenarioId/lines/:lineId', (req, res) => {
    const scenarioId = req.params.scenarioId; 
    const lineId = parseInt(req.params.lineId);
    const { userId, newText } = req.body;



    if (!newText || !Array.isArray(newText) || newText.length === 0) {
        return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });
    }


    const filePath = getScenarioFilePath(scenarioId);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Scenario ne postoji!" });


    let scenario = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let lineIndex = scenario.content.findIndex(l => l.lineId === lineId);


    if (lineIndex === -1) return res.status(404).json({ message: "Linija ne postoji!" });



    if (!locks[scenarioId] || !locks[scenarioId].lines[lineId]) {
         return res.status(409).json({ message: "Linija nije zakljucana!" });
    }


    if (locks[scenarioId].lines[lineId] !== userId) {
         return res.status(409).json({ message: "Linija je vec zakljucana!" });
    }
    let processedLines = [];
    newText.forEach(rawString => {
        const wrappedParts = wrapText(rawString, 20);
        processedLines.push(...wrappedParts);
    });


    const currentLine = scenario.content[lineIndex];


    currentLine.text = processedLines[0];



    delete locks[scenarioId].lines[lineId];
    if (userLocks[userId] && userLocks[userId].id === lineId) {
        delete userLocks[userId];
    }


    if (processedLines.length > 1) {
        const remainingTexts = processedLines.slice(1);
        let originalNextId = currentLine.nextLineId;
        
        let maxLineId = scenario.content.reduce((max, l) => Math.max(max, l.lineId), 0);


        const newElements = remainingTexts.map((txt) => {
            maxLineId++;
            return {
                lineId: maxLineId,
                text: txt,
                nextLineId: null 
            };
        });


        currentLine.nextLineId = newElements[0].lineId;
        
        for (let i = 0; i < newElements.length - 1; i++) {
            newElements[i].nextLineId = newElements[i+1].lineId;
        }


        newElements[newElements.length - 1].nextLineId = originalNextId;


        scenario.content.splice(lineIndex + 1, 0, ...newElements);
    }


    fs.writeFileSync(filePath, JSON.stringify(scenario, null, 2));


    writeDelta({
        scenarioId: parseInt(scenarioId),
        type: "line_update",
        lineId: lineId,
        nextLineId: currentLine.nextLineId,
        content: processedLines[0],
        timestamp: Math.floor(Date.now() / 1000)
    });


    res.json({ message: "Linija je uspjesno azurirana!" });
});




app.post('/api/scenarios/:scenarioId/characters/lock', (req, res) => {
    const { scenarioId } = req.params;
    const { userId, characterName } = req.body;


    if (!userId || !characterName) return res.status(400).json({ message: "Nedostaju podaci" });


    const filePath = getScenarioFilePath(scenarioId);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }


    if (!locks[scenarioId]) locks[scenarioId] = { lines: {}, characters: {} };



    if (locks[scenarioId].characters[characterName] && locks[scenarioId].characters[characterName] !== userId) {
        return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
    }


    if (userLocks[userId]) {
        const old = userLocks[userId];
        if (old.type === 'line' && locks[old.scenarioId]) {
            delete locks[old.scenarioId].lines[old.id];
        } else if (old.type === 'char' && locks[old.scenarioId]) {
            delete locks[old.scenarioId].characters[old.id];
        }
    }


    locks[scenarioId].characters[characterName] = userId;
    userLocks[userId] = { type: 'char', scenarioId: scenarioId, id: characterName };


    res.status(200).json({ message: "Ime lika je uspjesno zakljucano!" });
});



app.post('/api/scenarios/:scenarioId/characters/update', (req, res) => {
    const { scenarioId } = req.params;
    const { userId, oldName, newName } = req.body;


    const filePath = getScenarioFilePath(scenarioId);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }


    let scenario = JSON.parse(fs.readFileSync(filePath, 'utf8'));


    scenario.content.forEach(line => {
        if (line.text.includes(oldName)) {
            line.text = line.text.split(oldName).join(newName);
        }
    });


    fs.writeFileSync(filePath, JSON.stringify(scenario, null, 2));


    if (locks[scenarioId] && locks[scenarioId].characters[oldName]) {
        delete locks[scenarioId].characters[oldName];
    }
    
    if (userLocks[userId] && userLocks[userId].id === oldName) {
        delete userLocks[userId];
    }
    
    writeDelta({
        timestamp: Math.floor(Date.now() / 1000),
        type: "char_rename",
        scenarioId: scenarioId,
        oldName: oldName,
        newName: newName,
        userId: userId
    });


    res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
});



app.get('/api/scenarios/:scenarioId/deltas', (req, res) => {
    const { scenarioId } = req.params;
    const since = parseInt(req.query.since) || 0;
    const filePath = getScenarioFilePath(scenarioId);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Scenario ne postoji!" });
    }


    let allDeltas = [];
    try {
        allDeltas = JSON.parse(fs.readFileSync(DELTAS_FILE, 'utf8'));
    } catch(e) { allDeltas = []; }


    const filtered = allDeltas.filter(d => 
        d.scenarioId == scenarioId && d.timestamp > since
    );
    
    filtered.sort((a,b) => a.timestamp - b.timestamp);
    res.status(200).json({ deltas: filtered });
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
