const express = require('express');
const path = require('path');
const { sequelize, Scenario, Line, Delta, Checkpoint } = require('./models');
const { Op } = require('sequelize');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '..', 'html')));


let locks = {};
let userLocks = {};

function wrapText(text, maxWords = 20) {
  if (!text || text.trim() === '') return [""];
  const words = text.trim().split(/\s+/);
  const lines = [];
  for (let i = 0; i < words.length; i += maxWords) {
    lines.push(words.slice(i, i + maxWords).join(" "));
  }
  return lines;
}


sequelize.sync({ force: true }).then(() => {
  console.log('Baza podataka sinhronizovana.');
}).catch(err => {
  console.error('Database sync error:', err);
});


app.get('/api/scenarios/all', async (req, res) => {
  try {
    const scenarios = await Scenario.findAll({
      attributes: ['id', 'title']
    });
    res.json(scenarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Problem sa bazom' });
  }
});


app.post('/api/scenarios', async (req, res) => {
  const title = req.body.title || "Unnamed scenario";
  try {
    const scenario = await Scenario.create({ title });
    await Line.create({
      lineId: 1,
      text: "",
      nextLineId: null,
      scenarioId: scenario.id
    });
    
    const lines = await Line.findAll({
      where: { scenarioId: scenario.id },
      attributes: ['lineId', 'text', 'nextLineId'],
      raw: true
    });
    
    res.status(200).json({
      id: scenario.id,
      title: scenario.title,
      content: lines
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Problem sa bazom' });
  }
});


app.get('/api/scenarios/:scenarioId', async (req, res) => {
  try {
    const scenario = await Scenario.findByPk(req.params.scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario ne postoji!" });
    }
    
    const lines = await Line.findAll({
      where: { scenarioId: req.params.scenarioId },
      attributes: ['lineId', 'text', 'nextLineId'],
      raw: true
    });
    
    res.status(200).json({
      id: scenario.id,
      title: scenario.title,
      content: lines
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Problem sa bazom' });
  }
});


app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', async (req, res) => {
  const { scenarioId, lineId } = req.params;
  const { userId } = req.body;
  const lid = parseInt(lineId);

  if (!userId) return res.status(400).json({ message: "userId required" });

  try {
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    const line = await Line.findOne({
      where: { scenarioId, lineId: lid }
    });
    if (!line) {
      return res.status(404).json({ message: "Linija ne postoji!" });
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Problem sa bazom" });
  }
});


app.put('/api/scenarios/:scenarioId/lines/:lineId', async (req, res) => {
  const scenarioId = req.params.scenarioId;
  const lineId = parseInt(req.params.lineId);
  const { userId, newText } = req.body;

  if (!newText || !Array.isArray(newText) || newText.length === 0) {
    return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });
  }

  try {
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

    const line = await Line.findOne({
      where: { scenarioId, lineId }
    });
    if (!line) return res.status(404).json({ message: "Linija ne postoji!" });

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

    const originalNextId = line.nextLineId;
    line.text = processedLines[0];


    delete locks[scenarioId].lines[lineId];
    if (userLocks[userId] && userLocks[userId].id === lineId) {
      delete userLocks[userId];
    }


    if (processedLines.length > 1) {
      const remainingTexts = processedLines.slice(1);
      const allLines = await Line.findAll({
        where: { scenarioId },
        attributes: ['lineId']
      });
      let maxLineId = Math.max(...allLines.map(l => l.lineId));

      let prevLineId = lineId;
      for (let i = 0; i < remainingTexts.length; i++) {
        maxLineId++;
        await Line.create({
          lineId: maxLineId,
          text: remainingTexts[i],
          nextLineId: i === remainingTexts.length - 1 ? originalNextId : maxLineId + 1,
          scenarioId
        });
        
        if (i === 0) {
          line.nextLineId = maxLineId;
        }
      }
    }

    await line.save();

   
    await Delta.create({
      scenarioId: parseInt(scenarioId),
      type: "line_update",
      lineId: lineId,
      nextLineId: line.nextLineId,
      content: processedLines[0],
      timestamp: Math.floor(Date.now() / 1000)
    });

    res.json({ message: "Linija je uspjesno azurirana!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Problem sa bazom" });
  }
});


app.post('/api/scenarios/:scenarioId/characters/lock', async (req, res) => {
  const { scenarioId } = req.params;
  const { userId, characterName } = req.body;

  if (!userId || !characterName) return res.status(400).json({ message: "Nedostaju podaci" });

  try {
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Problem sa bazom" });
  }
});


app.post('/api/scenarios/:scenarioId/characters/update', async (req, res) => {
  const { scenarioId } = req.params;
  const { userId, oldName, newName } = req.body;

  try {
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    const lines = await Line.findAll({
      where: { scenarioId }
    });

    for (let line of lines) {
      if (line.text.includes(oldName)) {
        line.text = line.text.split(oldName).join(newName);
        await line.save();
      }
    }

    if (locks[scenarioId] && locks[scenarioId].characters[oldName]) {
      delete locks[scenarioId].characters[oldName];
    }

    if (userLocks[userId] && userLocks[userId].id === oldName) {
      delete userLocks[userId];
    }

    await Delta.create({
      timestamp: Math.floor(Date.now() / 1000),
      type: "char_rename",
      scenarioId: scenarioId,
      oldName: oldName,
      newName: newName
    });

    res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Problem sa bazom" });
  }
});


app.get('/api/scenarios/:scenarioId/deltas', async (req, res) => {
  const { scenarioId } = req.params;
  const since = parseInt(req.query.since) || 0;

  try {
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    const deltas = await Delta.findAll({
      where: {
        scenarioId: scenarioId,
        timestamp: { [Op.gt]: since }
      },
      order: [['timestamp', 'ASC']],
      raw: true
    });

    res.status(200).json({ deltas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Problem sa bazom" });
  }
});


app.post('/api/scenarios/:scenarioId/checkpoint', async (req, res) => {
  const { scenarioId } = req.params;
  const { userId } = req.body;

  try {
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    await Checkpoint.create({
      scenarioId,
      timestamp: Math.floor(Date.now() / 1000)
    });

    res.status(200).json({ message: "Checkpoint je uspjesno kreiran!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Problem sa bazom" });
  }
});


app.get('/api/scenarios/:scenarioId/checkpoints', async (req, res) => {
  const { scenarioId } = req.params;

  try {
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    const checkpoints = await Checkpoint.findAll({
      where: { scenarioId },
      attributes: ['id', 'timestamp'],
      order: [['timestamp', 'ASC']],
      raw: true
    });

    res.status(200).json(checkpoints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Problem sa bazom" });
  }
});


app.get('/api/scenarios/:scenarioId/restore/:checkpointId', async (req, res) => {
  const { scenarioId, checkpointId } = req.params;

  try {
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario ne postoji!" });
    }

    const checkpoint = await Checkpoint.findByPk(checkpointId);
    if (!checkpoint || checkpoint.scenarioId != scenarioId) {
      return res.status(404).json({ message: "Checkpoint ne postoji!" });
    }

   
    let initialLines = await Line.findAll({
      where: { scenarioId },
      attributes: ['lineId', 'text', 'nextLineId'],
      raw: true
    });

  
    let linesMap = {};
    initialLines.forEach(line => {
      linesMap[line.lineId] = {
        lineId: line.lineId,
        text: line.text,
        nextLineId: line.nextLineId
      };
    });

   
    const deltas = await Delta.findAll({
      where: {
        scenarioId,
        timestamp: { [Op.lte]: checkpoint.timestamp }
      },
      order: [['timestamp', 'ASC']],
      raw: true
    });

    deltas.forEach(delta => {
      if (delta.type === 'line_update') {
        if (linesMap[delta.lineId]) {
          linesMap[delta.lineId].text = delta.content;
          linesMap[delta.lineId].nextLineId = delta.nextLineId;
        }
      } else if (delta.type === 'char_rename') {
        Object.values(linesMap).forEach(line => {
          if (line.text.includes(delta.oldName)) {
            line.text = line.text.split(delta.oldName).join(delta.newName);
          }
        });
      }
    });

    const content = Object.values(linesMap);

    res.status(200).json({
      id: scenario.id,
      title: scenario.title,
      content: content
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Problem sa bazom" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
