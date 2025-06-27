
const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const { getTasks, getTaskById, createTask, getDashboardData, getUserDashboardData, updateTask, deleteTask, updateTaskStatus, updateTaskChecklist } = require("../controllers/taskController");


let router = express.Router();

router.get("/dashboard-data", getDashboardData);
router.get("/user-dashboard-data", protect, getUserDashboardData);
router.get("/", protect, getTasks); //Get all task (Admin all, user:assigned )
router.get("/:id", protect, getTaskById); // Get task by ID
router.post("/", protect, adminOnly, createTask); // create a task (Admin only)
router.put("/:id", protect, updateTask); // update task details
router.delete("/:id", protect, adminOnly, deleteTask); // Delete a task (Admin only)
router.put("/:id/status", protect, updateTaskStatus); // update task status
router.put("/:id/todo", protect, updateTaskChecklist);//update task checklist

module.exports = router;







