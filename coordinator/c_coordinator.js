// To type the parameters
const { response, request } = require('express'); // Response de Express

const { addProcessor, deleteProcessor, updateBalancerList } = require('./functions');
const { createSFMPMessage, sendSFMPMessage } = require('../commons/commons')



// List of nodes registered with the coordinator
// each node has the form: {name:'nombre', capacity:number, url:'call_url', preference: number}

const processorsList = [
    
];

// Configuration for the balancer 
// List of processors
const balancerList = [
    
]

// Balancer message load, used to calculate the balancerList list 
// -1 indicates that no load data is available so balancerList = processorsList
var receivedMessages = -1;

// Variables to control AYA forwarding to the main coordinator
var coordinatorMainMaxAYA = Number(process.env.AYAMAXSENDS);
// Variable to control whether I am coordinatorSubstituteActive
var coordinatorSubsActive = false;

const { getInternal, internalConfig } = require('./coordinatorData');

const processCoordinatorSFMP = (req = request, res = response) => {

    const { UID, Type, Operation, Data } = req.body;

    if (Type == 'REQUEST') {

        // We create a default reply message
        var reply = createSFMPMessage('REPLY', 'RESULT', { info: 'Unmanaged operation', UID: UID });

        // This operation is for SFMP testing purposes.
        if (Operation == 'DEBUG') {
            reply = createSFMPMessage('REPLY', 'RESULT', { UID: UID, coordinatorSubsActive, coordinatorMainMaxAYA, receivedMessages, processorsList, balancerList, internalConfig })
            res.status(200).json(reply)
            return;
        }


        if (Operation == 'REGISTER') {
            const result = addProcessor(Data, processorsList);
            switch (result) {
                case 1:
                    reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID });
                    res.status(200).json(reply);

                    // You should now send a message to the balancer to request its status to update the list.
                    const messageGETSTATUS = createSFMPMessage('REQUEST', 'GETSTATUS', { urlCoordinator: process.env.LOCAL_URL + ':' + getInternal('port') });
                    sendSFMPMessage(getInternal('urlBalancerMain'), messageGETSTATUS);
                    sendSFMPMessage(getInternal('urlBalancerSubs'), messageGETSTATUS);
                    // If we have modified the list, we sort the list by preference and load and update the list of balancers.
                    //updateBalancerList(processorsList, balancerList, receivedMessages);
                    return;
                    break;
                case 0:
                    reply = createSFMPMessage('REPLY', 'RESULT', { info: 'ERROR processor already exists', UID: UID })
                    res.status(200).json(reply);
                    return;
                    break;

                default:
                    reply = createSFMPMessage('REPLY', 'RESULT', { info: 'ERROR processor could not be added, error:' + result, UID: UID })
                    res.status(200).json(reply);
                    return;
                    break;
            }

        }

        if (Operation == 'UNREGISTER') {
            const result = deleteProcessor(Data, processorsList);
            switch (result) {
                case 1:
                    reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID });
                    res.status(200).json(reply);

                    // If we have modified the list, we sort the list by preference and load and update the list of balancers.
                    updateBalancerList(processorsList, balancerList, receivedMessages);
                    return;
                    break;
                case 0:
                    reply = createSFMPMessage('REPLY', 'RESULT', { info: 'ERROR processor does not exist', UID: UID })
                    res.status(200).json(reply);
                    return;

                    break;

                default:
                    reply = createSFMPMessage('REPLY', 'RESULT', { info: 'ERROR processor could not be erased, error:' + result, UID: UID })
                    res.status(200).json(reply);
                    return;
                    break;
            }

        }

        if (Operation == 'INFOSTATUS') {
            // Receive infostatus from the balancer, we are interested in the total.
            reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID });
            res.status(200).json(reply);

            // this infostatus is received
            //  - from the balancer after a getstatus, and is to update the number of messages per second received by the balancer.
            //  and thus calculate the balancerList
            // - from a main coordinator, because I am the subs and I am updating my internal status, receive processorsList and balancerList

            // if the receivedMessages field is in the Data, it is the first case

            receivedMessages = Data.receivedMessages;// || -1;
            if (receivedMessages == undefined) {
                receivedMessages = Data.coordinatorReceivedMessages;
                // we delete the processorsList and balancerList and insert the one we have received.
                processorsList.splice(0, processorsList.length)
                for (i = 0; i < Data.processorsList.length; i++) {
                    processorsList.push(Data.processorsList[i]);
                }
                balancerList.splice(0, balancerList.length)
                for (i = 0; i < Data.balancerList.length; i++) {
                    balancerList.push(Data.balancerList[i]);
                }
                return;
            } else {
                updateBalancerList(processorsList, balancerList, receivedMessages);
            }
            // do a SETCONFIG to the balancer
            const messageSETCONFIG = createSFMPMessage('REQUEST', 'SETCONFIG', balancerList)
            // Send setconfig to the primary and surrogate balancers.
            sendSFMPMessage(getInternal('urlBalancerMain'), messageSETCONFIG);
            sendSFMPMessage(getInternal('urlBalancerSubs'), messageSETCONFIG);

            return;

        }

        if (Operation == 'AYA') {
            reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID });
            res.status(200).json(reply);
            const messsageINFOSTATUS = createSFMPMessage('REQUEST', 'INFOSTATUS', {coordinatorReceivedMessages:receivedMessages, processorsList:processorsList, balancerList:balancerList})
            sendSFMPMessage(Data.urlCoordinatorSubs, messsageINFOSTATUS);
            return;
        }

        if (Operation == 'GETSTATUS') {
            reply = createSFMPMessage('REPLY', 'RESULT', { info: 'OK', UID: UID })
            res.status(200).json(reply);

        }

        // The generated reply message is sent
        res.status(200).json(reply);
        return;
    }

    if (Type == 'REPLY') {
        // WE DO NOTHING
    }

    res.status(200).json(reply);
    return;
}

const axios = require('axios');

// Activate AYA, it is programmed to send AYA and resendAYA when there is a processor who has not answered before.
const activateAYA = () => {
    // If I am a substitute process I activate the AYA towards the main coordinator.
    if (getInternal('type') == 'subs') {
        setTimeout(coordinatorAYA, Number(process.env.AYASENDTIME))
        return;
    }
    // I am the main coordinator, I activate the AYAs to the processors.
    if (getInternal('type') == 'main') {
        setTimeout(processorsAYA, Number(process.env.AYASENDTIME));
        setTimeout(processorsResendAYA, Number(process.env.AYARESENDTIME))
    }
}



// Send message to main coordinator to check that he/she is still active.
function coordinatorAYA() {
    const data = { urlCoordinatorSubs: process.env.LOCAL_URL + ':' + getInternal('port') }
    const messageAYACoordinator = createSFMPMessage('REQUEST', 'AYA', data);

    axios.post(getInternal('urlCoordinatorlMain') + '/' + process.env.SFMPROUTE, messageAYACoordinator)
        .then(function (response) {
            // If I am an active subs and I have just been answered, I INFOSTATUS the main one.
            if (coordinatorSubsActive) {
                const messsageINFOSTATUS = createSFMPMessage('REQUEST', 'INFOSTATUS', {processorsList:processorsList, balancerList:balancerList})
                sendSFMPMessage(getInternal('urlCoordinatorlMain'), messsageINFOSTATUS);
            }

            coordinatorMainMaxAYA = Number(process.env.AYAMAXSENDS);
            coordinatorSubsActive = false;
            setTimeout(coordinatorAYA, Number(process.env.AYASENDTIME))
        })
        .catch(function (error) {
            coordinatorMainMaxAYA--;
            if (coordinatorMainMaxAYA <= 0) {
                if (getInternal('type') == 'subs') {
                    // I activate the SUBS coordinator, I activate updateconfig
                    coordinatorSubsActive = true;
                    activateUPDATECONFIG();
                }
                // We activate sending AYAs to processors.
                setTimeout(processorsAYA, Number(process.env.AYASENDTIME))

                // I leave the following AYA scheduled
                setTimeout(coordinatorAYA, Number(process.env.AYASENDTIME))

            } else {
                setTimeout(coordinatorAYA, Number(process.env.AYARESENDTIME))
            }
        });
}

// Send AYA to processors on the list
function processorsAYA() {

    // If by any chance I were subs and I am no longer active, I exit the processorAYA because the main will already be doing it.
    if (getInternal('type') == 'subs' && coordinatorSubsActive == false) return;

    // send an AYA message to each element of the processorsList, subtract a number in the AYACOUNT and write down the UID
    processorsList.forEach(element => {
        const message = createSFMPMessage('REQUEST', 'AYA', {});
        element.AYACOUNT--;
        element.AYAUID = message.UID;

        axios.post(element.url + '/' + process.env.SFMPROUTE, message)
            .then(function (response) {
                if (response.data.Data.UID == element.AYAUID) {
                    element.AYACOUNT = Number(process.env.AYAMAXSENDS);
                    element.AYAUID = '';
                }
            })
            .catch(function (error) {
            });

    });
    // If I am the main coordinator or I am an active subs I schedule the following processorsAYA
    if (getInternal('type') == 'main' || coordinatorSubsActive) {
        setTimeout(processorsAYA, Number(process.env.AYASENDTIME))
    }
}

// Resend only to processors that are pending to answer.
function processorsResendAYA() {
    // remove from processorsList all those with AYACOUNT set to 0 because it means that all possible attempts have already been sent.

    var deleted = 0;
    for (let index = 0; index < processorsList.length; index++) {
        if (processorsList[index].AYACOUNT <= 0) {
            processorsList.splice(index, 1);
            deleted++;
        }
    }

    // If I have removed processors from the list, the list has to be updated by sending a GETINFO to the balancer.
    if (deleted > 0) {
        // The list is updated with the active processors and the current load.
        // You should now send a message to the balancer to request its status to update the list.
        const messageGETSTATUS = createSFMPMessage('REQUEST', 'GETSTATUS', { urlCoordinator: process.env.LOCAL_URL + ':' + getInternal('port') });
        sendSFMPMessage(getInternal('urlBalancerMain'), messageGETSTATUS);
        sendSFMPMessage(getInternal('urlBalancerSubs'), messageGETSTATUS);
    }

    const resendList = [];
    // send an AYA message to each element of the processorsList, subtract a number in the AYACOUNT and write down the UID
    processorsList.forEach(element => {
        // Only for items that are pending a reply, we send message
        if (element.AYACOUNT < Number(process.env.AYAMAXSENDS)) {
            resendList.push(element);
            const message = createSFMPMessage('REQUEST', 'AYA', {});
            element.AYACOUNT--;
            element.AYAUID = message.UID;
            axios.post(element.url + '/' + process.env.SFMPROUTE, message)
                .then(function (response) {
                    if (response.data.Data.UID == element.AYAUID) {
                        element.AYACOUNT = Number(process.env.AYAMAXSENDS);
                        element.AYAUID = '';
                    }
                })
                .catch(function (error) {
                });

        }
    });
    setTimeout(processorsResendAYA, Number(process.env.AYARESENDTIME))
}

// Schedule every UPDATECONFIG seconds to GETSTATUS the balancer to renew 
const activateUPDATECONFIG = () => {
    if (getInternal('type') == 'subs' && coordinatorSubsActive) {
        setTimeout(updateConfig, process.env.UPDATE_CONFIG)
        return;
    }
    // I am the main coordinator, I activate the AYAs to the processors.
    if (getInternal('type') == 'main') {
        setTimeout(updateConfig, process.env.UPDATE_CONFIG);
    }

}

const updateConfig = () => {
    // Send GETSTATUS message to main and subs balancers
    const messageGETSTATUS = createSFMPMessage('REQUEST', 'GETSTATUS', { urlCoordinator: process.env.LOCAL_URL + ':' + getInternal('port') });
    sendSFMPMessage(getInternal('urlBalancerMain'), messageGETSTATUS);
    sendSFMPMessage(getInternal('urlBalancerSubs'), messageGETSTATUS);
}

module.exports = { processCoordinatorSFMP, activateAYA, activateUPDATECONFIG }