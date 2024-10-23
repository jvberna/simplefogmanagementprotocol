// To type the parameters
const { response, request } = require('express'); // Response from Express

const { updateBalancerList } = require('./functions');
const { createSFMPMessage, sendSFMPMessage, createResendMessage } = require('../commons/commons')

// List of nodes handled by the balancer
// List of processors
const balancerList = [
    //    { name: 'example1', load: 50, url: 'http://localhost:3001' }
]

// Forwarding mechanism
var pivot = 0;


const { getInternal, internalConfig } = require('./balancerData');

// Variables to control AYA forwarding to the main coordinator
var balancerMainMaxAYA = Number(process.env.AYAMAXSENDS);

// Variable to control whether I am coordinatorSubstituteActive
var balancerSubsActive = false;
var receivedMessages = -1;

const axios = require('axios');

const processBalancerSFMP = (req = request, res = response) => {

    const { UID, Type, Operation, Data } = req.body;
    var reply = createSFMPMessage('REPLY', 'RESULT', { info: 'Operación no manejada', UID: UID })

    if (Type == 'REQUEST') {

        if (Operation == 'DEBUG') {
            reply = createSFMPMessage('REPLY', 'RESULT', { UID: UID, balancerSubsActive, balancerMainMaxAYA, receivedMessages, internalConfig, balancerList })
            res.status(200).json(reply)
            return;
        }

        // I receive an infostatus from the secondary balancer, I take the data
        if (Operation == 'INFOSTATUS') {
            receivedMessages = Data.receivedMessages;
            balancerList.splice(0, balancerList.length);
            for (i = 0; i < Data.balancerList.length; i++) {
                balancerList.push(Data.balancerList[i])
            }
            reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID })
            res.status(200).json(reply);
            return;
        }

        // If asked for the status of the system, we answer
        if (Operation == 'GETSTATUS') {
            reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID })
            res.status(200).json(reply);
            // if I am the subsitute balancer and I am not active, I do NOT answer.
            if (getInternal('type') == 'subs' && balancerSubsActive == false) return

            const urlCoordinator = Data.urlCoordinator;

            // load implies percentage, receivedMessages indicates quantity
            const newData = { receivedMessages: receivedMessages, balancerList: balancerList };
            const messageINFOSTATUS = createSFMPMessage('REQUEST', 'INFOSTATUS', newData)
            sendSFMPMessage(urlCoordinator, messageINFOSTATUS);

            return;
        }

        // A new configuration arrives and we save it
        if (Operation == 'SETCONFIG') {
            updateBalancerList(balancerList, Data);
            reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID })
            res.status(200).json(reply);

            return;

        }

        if (Operation == 'AYA') {
            reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID });
            res.status(200).json(reply);

            return;
        }

    }

    if (Type == 'REPLY') {
        // WE DO NOTHING
    }

    res.status(200).json(reply);
    return;
}


const activeAYA = () => {
    if (getInternal('type') == 'subs') {
        setTimeout(balancerAYA, process.env.AYASENDTIME);
    }
}

const balancerAYA = () => {
    // I send an AYA to the principal
    const messageAYABalancer = createSFMPMessage('REQUEST', 'AYA', {});
    axios.post(getInternal('urlMain') + '/' + process.env.SFMPROUTE, messageAYABalancer)
        .then(function (response) {

            // If I am an active subsitute and I have just received a reply, I INFOSTATUS the main one
            if (balancerSubsActive) {
                // Disable sending of messages from the balancer to the processors.
                // For this we simply close the connection to MQTT.
                disconnectMQTT();
                const messageINFOSTATUS = createSFMPMessage('REQUEST', 'INFOSTATUS', { receivedMessages, balancerList });
                sendSFMPMessage(getInternal('urlMain'), messageINFOSTATUS);
            }

            balancerMainMaxAYA = Number(process.env.AYAMAXSENDS);
            balancerSubsActive = false;
            setTimeout(balancerAYA, process.env.AYASENDTIME);
        })
        .catch(function (error) {
            balancerMainMaxAYA--;
            if (balancerMainMaxAYA <= 0) {
                // If I am subs and have not already taken over, I take over, connect to MQTT and keep throwing AYA at the balancer.
                if (getInternal('type') == 'subs' && balancerSubsActive == false) {

                    balancerSubsActive = true;
                    connectMQTT();

                }

                // I leave the next AYA scheduled 
                setTimeout(balancerAYA, Number(process.env.AYASENDTIME))


            } else {
                setTimeout(balancerAYA, Number(process.env.AYARESENDTIME))
            }
        })

}

// Connecting with MQTT
// We set up the MQTT connection to catch the TTN connection.
const config = require('./ttn/configTTN');
const mqtt = require('mqtt');
const { create } = require('domain');

var clientMQTT;

const disconnectMQTT = () => {
    clientMQTT.unsubscribe(config.mqttQue);
    clientMQTT.end();
}

const { addMessage, totalMeters} = require('./loadMeter');

// Function that forwards the message to the processor that plays according to its load.
const resendMessage = (message) => {
    console.log('Resend message')
    addMessage();
    receivedMessages = totalMeters();
    if (balancerList.length > 0) {
        console.log('We send to:',balancerList[pivot].url + '/' + process.env.MSGROUTE)
        const newMessage = createResendMessage(getInternal('type'), message.toString());
        axios.post(balancerList[pivot].url + '/' + process.env.MSGROUTE, newMessage)
            .then(function (response) {

            })

            .catch(function (error) {
            })

        // We advance pivot if not already there at the end
        pivot == balancerList.length - 1 ? pivot=0: pivot++;
    } else {
        console.log('There are no items in the balancerList')
    }
}

const connectMQTT = () => {

    clientMQTT = mqtt.connect((config.mqttQue), {
        username: config.appID,
        password: config.accessKey
    });

    clientMQTT.on('connect', () => {
        clientMQTT.subscribe(config.suscribe);
    });

    clientMQTT.on('message', async (topic, message) => {
        try {
            resendMessage(message)
        } catch (error) {
        }
    });
}

module.exports = { connectMQTT, processBalancerSFMP, activeAYA }

