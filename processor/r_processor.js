// Third-party libraries 
// Express Router
const { Router } = require('express');

const { validateFields, validateSFMPMessage } = require('../commons/commons')

// Controller to process the balancer post
const { processProcessorSFMP, processMessage } = require('./c_processor');

// Route post
const router = Router();


// SFMP protocycle message handling
router.post('/'+process.env.SFMPROUTE, [
    validateSFMPMessage(),
    validateFields
],
processProcessorSFMP);

// SFMP protocycle message handling
router.post('/'+process.env.MSGROUTE,processMessage);
 
module.exports = router;