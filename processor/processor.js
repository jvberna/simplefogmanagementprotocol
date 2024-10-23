//Load environment variables
require('dotenv').config();

// We include the express library to build an API and CORS.
const express = require('express')
const cors = require('cors');

// We put body-parser to be able to parse the requests that will come to us through the API.
const bodyParser = require('body-parser');

// Auxiliary functions
const { parseArgs } = require('./functions')
   
// We obtain the parameters and validate them or error
const parameters = parseArgs(process.argv);
if (parameters==-1) return
  
// We create the APP and configure it to parse JSON in the request
const app = express()
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
   
// we attend only post request
app.use('/', require('./r_processor'));
  
// We lift the server on a port
app.listen(parameters.port, function () {
    console.log(`PROCESSOR ${parameters.name} LISTENING PORT ${parameters.port}`);
})
 
// registration at the main and substitute coordinators
const { createSFMPMessage, sendSFMPMessage } = require('../commons/commons');
const Data = {name:parameters.name, 
    url:process.env.LOCAL_URL+':'+parameters.port, 
    capacity: parameters.capacity, 
    preference: parameters.preference};
const registerMessage = createSFMPMessage('REQUEST','REGISTER',Data);

// It is registered in the main coordinator only
sendSFMPMessage(parameters.urlCoordinatorMain, registerMessage);

// function that the unregister does when an end-of-process is received
const unregister = ()=> {
    const unregisterMesage = createSFMPMessage('REQUEST','UNREGISTER',Data);
    sendSFMPMessage(parameters.urlCoordinatorMain, unregisterMesage);
    console.log('Terminado')
}
// If the process is completed, we unregister.
process.on('SIGINT', unregister)
  

