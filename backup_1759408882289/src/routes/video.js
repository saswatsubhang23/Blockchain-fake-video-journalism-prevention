import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { uploadVideo, checkVideo } from "../controllers/videoController.js";

const router = Router();

router.post("/uploadVideo", upload.single("video"), uploadVideo);
router.get("/checkVideo/:hash", checkVideo);

export default router;