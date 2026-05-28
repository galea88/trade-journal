import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tradesRouter from "./trades";
import strategiesRouter from "./strategies";
import dashboardRouter from "./dashboard";
import analyticsRouter from "./analytics";
import calendarRouter from "./calendar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tradesRouter);
router.use(strategiesRouter);
router.use(dashboardRouter);
router.use(analyticsRouter);
router.use(calendarRouter);

export default router;
