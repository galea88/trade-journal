import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tradesRouter from "./trades";
import strategiesRouter from "./strategies";
import dashboardRouter from "./dashboard";
import analyticsRouter from "./analytics";
import calendarRouter from "./calendar";
import brokersRouter from "./brokers";
import positionsRouter from "./positions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tradesRouter);
router.use(strategiesRouter);
router.use(dashboardRouter);
router.use(analyticsRouter);
router.use(calendarRouter);
router.use(brokersRouter);
router.use(positionsRouter);

export default router;
