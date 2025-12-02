import express from "express";
import { getBillStats } from "../controllers/adminController";

const router = express.Router();

// GET /api/admin/bill-stats
router.get("/bill-stats", getBillStats);

export default router;