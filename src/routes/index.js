import { Router } from "express";
import videoRoutes from "./video.js";
import dashboardRoutes from "./dashboard.js";

const router = Router();

router.use(videoRoutes);
router.use(dashboardRoutes);

export default router;