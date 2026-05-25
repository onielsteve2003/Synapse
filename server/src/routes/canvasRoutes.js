const express = require("express");

const {
  runAICommand,
  createCanvas,
  deleteCanvas,
  generateInfrastructure,
  getAllCanvases,
  getCanvasById,
  updateCanvas,
} = require("../controllers/canvasController");

const router = express.Router();

router.get("/", getAllCanvases);
router.post("/", createCanvas);
router.post("/:id/ai-command", runAICommand);
router.post("/:id/generate-infra", generateInfrastructure);
router.delete("/:id", deleteCanvas);
router.get("/:id", getCanvasById);
router.put("/:id", updateCanvas);

module.exports = router;
