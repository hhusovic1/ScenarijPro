const fs = require('fs');
const { sequelize, Scenario, Line } = require('./models');

async function seedDatabase() {
  try {
 
    const data = JSON.parse(fs.readFileSync('./data/seed-data.json', 'utf8'));
    

    await Scenario.create({
      id: data.id,
      title: data.title
    });
    

    const linesToCreate = data.content.map(line => ({
      lineId: line.lineId,
      text: line.text,
      nextLineId: line.nextLineId,
      scenarioId: data.id
    }));
    
    await Line.bulkCreate(linesToCreate);
    
    process.exit(0);
  } catch (error) {

    process.exit(1);
  }
}

seedDatabase();
