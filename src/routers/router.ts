import express from 'express'
import getController from '../controllers/getController'
import updateDataTypesController from '../controllers/updateDataTypesController';
const router = express.Router();

router.get("/", getController);
router.get("/updateDataTypes", updateDataTypesController);

export default router;
