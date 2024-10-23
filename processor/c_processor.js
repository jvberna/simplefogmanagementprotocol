// To type the parameters
const { response, request } = require('express'); // Response from Express

const { createSFMPMessage } = require('../commons/commons')

const { internalConfig } = require('./processorData')

const processProcessorSFMP = (req = request, res = response) => {

    const { UID, Type, Operation, Data } = req.body;
    var reply = createSFMPMessage('REPLY', 'RESULT', { info: 'Operación no manejada', UID: UID });
    if (Type == 'REQUEST') { 

        if (Operation == 'DEBUG') {
            reply = createSFMPMessage('REPLY', 'RESULT', { UID: UID, internalConfig })
            res.status(200).json(reply)
            return;
        }

        if (Operation == 'AYA') {
            reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID }); 
        }

        // The generated reply message is sent
        res.status(200).json(reply);
        return;
    }

    res.status(200).json(reply);
    return;

}

// function that processes a message when it is received
const processMessage = (req = request, res = response) => {

    const msg = req.body.Data;
    console.log('We receive a message from the balancer:', msg);

    res.status(200).json({
        UID: 'sendBalancerMessage',
        Type: '',
        Operation: '',
        Data: ''
    })
}

module.exports = {processProcessorSFMP, processMessage}