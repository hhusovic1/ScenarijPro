const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('wt26', 'root', 'password', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

const Scenario = sequelize.define('Scenario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'Scenario',
  freezeTableName: true,
  timestamps: false
});

const Line = sequelize.define('Line', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lineId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  nextLineId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  scenarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Scenario',
      key: 'id'
    }
  }
}, {
  tableName: 'Line',
  freezeTableName: true,
  timestamps: false
});

const Delta = sequelize.define('Delta', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  scenarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Scenario',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lineId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  nextLineId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  oldName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'Delta',
  freezeTableName: true,
  timestamps: false
});

const Checkpoint = sequelize.define('Checkpoint', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  scenarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Scenario',
      key: 'id'
    }
  },
  timestamp: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'Checkpoint',
  freezeTableName: true,
  timestamps: false
});

Scenario.hasMany(Line, { foreignKey: 'scenarioId', onDelete: 'CASCADE' });
Line.belongsTo(Scenario, { foreignKey: 'scenarioId' });

Scenario.hasMany(Delta, { foreignKey: 'scenarioId', onDelete: 'CASCADE' });
Delta.belongsTo(Scenario, { foreignKey: 'scenarioId' });

Scenario.hasMany(Checkpoint, { foreignKey: 'scenarioId', onDelete: 'CASCADE' });
Checkpoint.belongsTo(Scenario, { foreignKey: 'scenarioId' });

module.exports = { sequelize, Scenario, Line, Delta, Checkpoint };
