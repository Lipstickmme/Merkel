'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/projectsController');

router.get('/', ctrl.list);

module.exports = router;
