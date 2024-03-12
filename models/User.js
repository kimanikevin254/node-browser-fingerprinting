const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.TEXT,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        timestamps: false
    });


    // Define association to DeviceFingerprint model
    User.hasMany(sequelize.models.DeviceFingerprint, {
        foreignKey: 'userId', // This will add a userId column to the DeviceFingerprint table
    });

    return User;
};
