// Load environment variables
require('dotenv').config();

// We include the express library to build an API and CORS.
const express = require('express')
const cors = require('cors');

// We add body-parser to be able to parse the requests that we receive through the API.
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
app.use('/', require('./r_coordinator'));

// We lift the server on a port
app.listen(parameters.port, function () {
    console.log(`COORDINATOR ${parameters.type} LISTENING PORT ${parameters.port}`);
})

// We activate the AYA check
const { activateAYA, activateUPDATECONFIG } = require('./c_coordinator')

activateAYA();
activateUPDATECONFIG();

