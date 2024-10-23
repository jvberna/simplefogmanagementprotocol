// Third-party libraries 
// Express Router
const { Router } = require('express');

const { validateFields, validateSFMPMessage } = require('../commons/commons')

// Controller to process the post of the balancer
const { processBalancerSFMP } = require('./c_balancer');

// post Route 
const router = Router();

// SFMP protocycle message handling
router.post('/' + process.env.SFMPROUTE, [
    validateSFMPMessage(),
    validateFields
],
    processBalancerSFMP);


module.exports = router;