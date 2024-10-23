/**
 * 
 * Component BALANCER
 * Arguments
 * node balancer.js port type url_substitute
 * 1.- PORT: port on which the component listens
 * 2.- TYPE: main/subs, indicates whether it is a major component or a substitute
 * 3.- URL: url of the main balancer
 * 
 * nodemon balancer.js 3100 substitute http://127.0.0.1:3000/
 * 
 */

// Load environment variables
require('dotenv').config();

// We include the "express" library to build an API and CORS.
const express = require('express')
const cors = require('cors');

// We add body-parser to be able to parse the requests that we receive through the API.
const bodyParser = require('body-parser');

// Auxiliary functions
const { parseArgs } = require('./functions')

// We obtain the parameters and validate them or error.
const parameters = parseArgs(process.argv);
if (parameters==-1) return

// We create the APP and configure it to parse JSON in the request
const app = express()
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// We attend only post request
app.use('/', require('./r_balancer'));

// We lift the server on a port
app.listen(parameters.port, function () {
    console.log(`BALANCER ${parameters.type} LISTENING PORT ${parameters.port}`);
})


// Activate AYAS messages
const {activeAYA, connectMQTT} = require('./c_balancer');
const { getInternal } = require('./balancerData');
activeAYA();

// If I am a principal, by default I activate connection to MQTT.
if (getInternal('type')=='main') connectMQTT();



