// Third-party libraries
// Router of Express
const { Router } = require('express');

const { validateFields, validateSFMPMessage } = require('../commons/commons')

// Controller to process the post of the balancer
const { processCoordinatorSFMP } = require('./c_coordinator');

// post Route 
const router = Router();


// SFMP protocol message handling
router.post('/'+process.env.SFMPROUTE, [
    validateSFMPMessage(),
    validateFields
],
processCoordinatorSFMP);
 
module.exports = router;