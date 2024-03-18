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
        }
    }, {
        timestamps: true
    });

    // Define association to User model
    // One device fingerprint can belong to multiple Users
    DeviceFingerprint.hasMany(sequelize.models.User, {
        foreignKey: 'fingerprintId'
    })

    return DeviceFingerprint;
};