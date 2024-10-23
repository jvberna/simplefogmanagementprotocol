// Third-party libraries
const axios = require('axios');
const { response, request } = require('express'); // Response de Express
const { validationResult, check } = require('express-validator'); // ValidationResult of Express Validator

const permetedTypes = ['REQUEST', 'REPLY'];
const permetedOperations = ['DEBUG','GETSTATUS', 'INFOSTATUS', 'SETCONFIG', 'REGISTER', 'UNREGISTER', 'AREYOUALIVE','RESULT','AYA']

const {uid} = require('uid');



// Create a new unique UID
const newUID = ()=> {
    return uid(Number(25));
}

const defaultMessage = {UID:newUID(), Type:'REPLY', Operation:'RESULT', Data: {info:'INVALID MESSAGE', UID:-1}};

// Function that creates a SFMP message
const createSFMPMessage = (Type='REPLY', Operation='RESULT', Data={}) => {
    // We check the parameters passed and if they are not correct we return an empty message.
    Type = Type.toUpperCase();
    Operation = Operation.toUpperCase();
    if (!permetedTypes.includes(Type) || !permetedOperations.includes(Operation)) return defaultMessage;
    return {
        UID:newUID(),
        Type,
        Operation,
        Data
    };
}

const createResendMessage = (Origin='', Data={}) => {
    // We check the parameters passed and if they are not correct we return an empty message.
    return {
        UID:newUID(),
        Origin,
        Data
    };
}

// Function to send messages by SFMP
const sendSFMPMessage = async (url='', data={}) => { 
    if (url.length<=0) return 0;
    axios.post(url+'/'+process.env.SFMPROUTE, data)
        .then(function (response) {
            return 1;
        })
        .catch(function (error) {
            return -1;
        });
    return 0;
}

/**
* Checking for errors detected during route management 
*/

const validateFields = (req = request, res = response, next) => {

   const errorsVal = validationResult(req);
    if (!errorsVal.isEmpty()) {
        res.status(400).json({
            errors: errorsVal.mapped()
        });
        return;
    }  
    next();
}

// Función que comprueba que un mensaje cumple con la estructura de SFMP
const validateSFMPMessage = () => {
    return [
        check(['UID', 'Type', 'Operation', 'Data'], 'Field is missing or empty').notEmpty(),
        check('Type', 'Permited type are ' + String(permetedTypes)).isIn(permetedTypes),
        check('Operation', 'Permited operations are ' + String(permetedOperations)).isIn(permetedOperations),
    ]
}

// Mark for export.
module.exports = { createSFMPMessage, validateFields, validateSFMPMessage, sendSFMPMessage, createResendMessage }