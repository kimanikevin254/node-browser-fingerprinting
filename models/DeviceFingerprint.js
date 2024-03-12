const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const DeviceFingerprint = sequelize.define('DeviceFingerprint', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        fingerprint: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        lastCreationTimestamp: {
            type: DataTypes.DATE
        }
    }, {
        timestamps: false
    });

    return DeviceFingerprint;
};