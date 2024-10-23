
/**
 * Messages to print when detect error
 */

const msg_common = `

    USE: node coordinator.js PORT urlBalancerMain urlBalancerSubs TYPE URL_COORDINATOR_MAIN

    ----------------------------------------------------------------------------------------------
    PORT: port on which the component listens, value > 0
    urlBalancerMain: URL to call main Balancer of the system
    urlBalancerSubs: URL to call substitute Balancer of the system
    TYPE: main/subs, indicates whether the component is a main component or a substitute
    URL_COORDINATOR_MAIN: OPTIONAL, url of the main coordinator, only for subs coordinator
    ----------------------------------------------------------------------------------------------

    `;

const msg = {
    error_port: `
    
    *****************************************
    Error, missing or incorrect PORT parameter
    *****************************************
    ${msg_common}`,
    error_url_balancer_main: `
    
    *****************************************
    Error, missing or incorrect urlBalancerMain parameter
    *****************************************
    ${msg_common}`,
    error_url_balancer_subs: `
    
    *****************************************
    Error, missing or incorrect urlBalancerSubs parameter
    *****************************************
    ${msg_common}`,
    error_type: `
    
    *****************************************
    Error, missing or incorrect TYPE parameter
    *****************************************
    ${msg_common}`,
    error_url_cordinator_main: `
    
    *****************************************
    Error, missing or incorrect URL_COORDINATOR_MAIN parameter
    ${msg_common}`,
}

// Permitted process types
const typePermeted = ['main', 'subs']

const { setInternal } = require('./coordinatorData');
/**
 * Receibe array or args and return object whith arguments validation or error
 */
const parseArgs = (args) => {
    //    "controlSubstitute": "nodemon control.js 3101 http://127.0.0.1:3000/ http://127.0.0.1:3100/ substitute http://127.0.0.1:3001/",
    // We get the port of the command input

    const port = Number(args[2] || 0);

    if (!port || port <= 0) {
        console.error(msg.error_port);
        return -1;
    }

    // we get url balancer so the type, must be main or subs
    const urlBalancerMain = String(args[3] || '');
    if (urlBalancerMain.length<=0) {
        console.error(msg.error_url_balancer_main);
        return -1;
    }
    const urlBalancerSubs = String(args[4] || '');
    if (urlBalancerSubs.length<=0) {
        console.error(msg.error_url_balancer_subs);
        return -1;
    }
    
    const type = String(args[5] || '');
    if (!typePermeted.includes(type.toLowerCase())) {
        console.error(msg.error_type);
        return -1;
    }

    const urlCoordinatorlMain = args[6] || '';
    if (type == 'subs' && urlCoordinatorlMain == '') {
        console.error(msg.error_url_cordinator_main);
        return -1;
    }

    setInternal('port',port);
    setInternal('type',type);
    setInternal('urlBalancerMain',urlBalancerMain);
    setInternal('urlBalancerSubs',urlBalancerSubs);
    setInternal('urlCoordinatorlMain',urlCoordinatorlMain);

    return { port, type, urlBalancerMain, urlBalancerSubs, urlCoordinatorlMain }

}

// Function that adds a new node to the list if it does not exist.
// each node has the form: {name:'nombre', capacity:numer, url:'call_url', preference:number}
const addProcessor = (processor, list) => {
    // we check that they have passed us the necessary data to register a node
    if (processor.name == undefined || String(processor.name).length <= 0) {
        return -1;
    }
    if (processor.url == undefined || String(processor.url).length <= 0) {
        return -2;
    }
    if (processor.capacity == undefined || Number(processor.capacity) <= 0) {
        return -3;
    }
    if (processor.preference == undefined || Number(processor.preference) < 0) {
        return -4;
    }
    // check if the node already exists in the list, cannot have a duplicate name
    const found = list.find((element => element.name == processor.name));
    if (found) {
        return 0;
    }
    list.push({ name: String(processor.name), capacity: Number(processor.capacity), 
        url: String(processor.url), preference: Number(processor.preference),
        AYACOUNT:3, AYAUID:'' })
    return 1;
}

// Remove a node from the list if it exists
const deleteProcessor = (processor, list) => {
    // we check that they have passed us the necessary data to register a node
    if (!processor.name || String(processor.name).length <= 0) {
        return -1;
    }
    // check if the node already exists in the list, cannot have a duplicate name
    const found = list.findIndex(element => element.name == processor.name);
    if (found < 0) return 0;
    list = list.splice(found, 1)
    return 1;
}

// Function that sorts the list of processors by preference and capacity factor
const orderProcessorList = (list) => {
    list.sort( (a,b) => {
        return b.preference-a.preference || b.capacity-a.capacity;
    })
}

// function that generates the new load list of the load balancer based on the list of processors
const updateBalancerList = (processorsList, balancerList, receivedMesagges) => {
    orderProcessorList(processorsList);
    // Empty the list of processors in the balancer.
    balancerList.splice(0,balancerList.length);
    // We add enough nodes to cover the load requirement of the balancer.
    var totalCapacity=0;
    // We create the balancedList
    for (i=0; i<processorsList.length && (totalCapacity<receivedMesagges || receivedMesagges==-1) ; i++) {
        balancerList.push({name:processorsList[i].name, capacity:processorsList[i].capacity, url:processorsList[i].url});
        totalCapacity += processorsList[i].capacity;
    }
    for (i=0; i<balancerList.length; i++) {
        balancerList[i].load = Number(Number((balancerList[i].capacity * 100) / totalCapacity).toFixed(2));
    }
}

module.exports = { parseArgs, addProcessor, deleteProcessor, updateBalancerList };