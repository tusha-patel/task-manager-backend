const Task = require("../Models/Task");



// @des: Get all task (Admin:All , User:only assigned tasks  )
// @route: GET /api/tasks
// @access : Private
const getTasks = async (req, res) => {
    try {
        const { status } = req.query;
        // console.log(status);
        let filter = {};
        // console.log(status);   

        if (status) {
            filter.status = status
        }
        let tasks;

        if (req.user.role === "admin") {
            tasks = await Task.find(filter).populate(
                "assignedTo",
                "name email profileImageUrl"
            )
        } else {
            tasks = await Task.find({ ...filter, assignedTo: req.user._id }).populate(
                "assignedTo",
                "name email profileImageUrl"
            );
        }


        // Add completed todoChecklist count to each task

        tasks = await Promise.all(
            tasks.map(async (task) => {
                const completedCount = task.todoChecklist.filter((item) => item.completed).length
                return { ...task._doc, completedTodoCount: completedCount }
            })
        )

        // status summary counts
        const allTasks = await Task.countDocuments(
            req.user.role === "admin" ? {} : { assignedTo: req.user._id }
        );

        const pendingTasks = await Task.countDocuments({
            ...filter,
            status: "Pending",
            ...(req.user.role !== "admin" && { assignedTo: req.user._id }),
        });

        const inProgressTasks = await Task.countDocuments({
            ...filter,
            status: "In Progress",
            ...(req.user.role !== "admin" && { assignedTo: req.user._id })
        });


        const completedTasks = await Task.countDocuments({
            ...filter,
            status: "Completed",
            ...(req.user.role !== "admin" && { assignedTo: req.user._id })
        });


        res.json({
            tasks,
            statusSummary: {
                all: allTasks,
                pendingTasks,
                inProgressTasks,
                completedTasks,
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


// @des: Get task By Id
// @route: GET /api/tasks/:id
// @access : Private
const getTaskById = async (req, res) => {
    try {

        const task = await Task.findById(req.params.id)
            .populate("assignedTo", "name email profileImageUrl");

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


// @des: Create a new task (Admin only)
// @route: GET /api/tasks/
// @access : Private(Admin)
const createTask = async (req, res) => {
    try {

        const { title, description, priority, dueDate, assignedTo, attachments, todoChecklist } = req.body;
        if (!Array.isArray(assignedTo)) {
            return res.status(400).json({ message: "assignedTo Must ba an array of user IDS" })
        }


        const task = await Task.create({
            title,
            description,
            priority,
            dueDate,
            assignedTo,
            createdBy: req.user._id,
            todoChecklist,
            attachments,
        });

        res.status(201).json({ message: "Task  created successfully", task });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


// @des: Update task Details
// @route: GET /api/tasks/:id
// @access : Private
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" })
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attachments = req.body.attachments || task.attachments;

        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) {
                return res.status(400).json({ message: "assignedTo must be an array of user Ids " });
            }
            task.assignedTo = req.body.assignedTo;
        }

        const updatedTask = await task.save();

        res.status(200).json({ message: "Task updated successfully", updatedTask });


    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


// @des: Delete Task (Admin only)
// @route: GET /api/tasks/:id
// @access : Private(Admin)
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: "Task Not found" });
        }
        await task.deleteOne();
        res.status(200).json({ message: "Task Deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


// @des: Update task status
// @route: GET /api/tasks/:id/status
// @access : Private
const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        console.log(task);

        if (!task) return res.status(404).json({ message: "Task not found" });

        const isAssigned = task.assignedTo.
            some((userId) => userId.toString() === req.user._id.toString())
        // console.log(isAssigned);
        if (!isAssigned && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorize" })
        }

        task.status = req.body.status || task.status;


        if (task.status === "Completed") {
            task.todoChecklist.forEach((item) => (item.completed = true));
        }

        await task.save();
        res.json({ message: "Task status updated ", task });


    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


// @des: update task checklist
// @route: Put /api/tasks/:id/todo
// @access : Private
const updateTaskChecklist = async (req, res) => {
    try {
        const { todoChecklist } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task Not found" });
        }

        if (!task.assignedTo.includes(req.user._id) && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to update checklist" });
        }
        task.todoChecklist = todoChecklist; // Replace with updated checklist

        // auto-update progress based on checklist completion
        const completedCount = task.todoChecklist?.filter((item) => item.completed).length;

        const totalItems = task.todoChecklist.length;
        task.progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        // auto-mark task as completed if all items are checked

        if (task.progress === 100) {
            task.status = "Completed"
        } else if (task.progress > 0) {
            task.status = "In Progress"
        } else {
            task.status = "Pending"
        }

        await task.save();
        const updatedTask = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        );
        res.json({ message: "Task Checklist updated", task: updatedTask });


    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


// @des: Dashboard Data(Admin only)
// @route: GET /api/tasks/dashboard-data
// @access : Private
const getDashboardData = async (req, res) => {
    try {

        // fetch statistics
        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: "Pending" });
        const completedTasks = await Task.countDocuments({ status: "Completed" });
        const overdueTasks = await Task.countDocuments({
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() },
        });

        // Ensure all possible statuses are included
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRow = await Task.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                }
            }
        ]);


        // console.log(taskDistributionRow);

        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, "");   //Remove spaces for response 
            acc[formattedKey] = taskDistributionRow.find((item) => item._id === status)?.count || 0;
            return acc
        }, {});

        // console.log(taskDistribution);


        taskDistribution["All"] = totalTasks;


        // ensure All Priority levels are include 
        const taskPriority = ["Low", "Medium", "High"];

        const taskPriorityLevelRaw = await Task.aggregate([{
            $group: {

                _id: "$priority",
                count: { $sum: 1 }
            }
        }]);

        const taskPriorityLevel = taskPriority.reduce((acc, priority) => {
            acc[priority] = taskPriorityLevelRaw.find((item) => item._id === priority)?.count || 0
            return acc
        }, {});

        // fetch recent 10 tasks

        const recentTasks = await Task.find().sort({ createdAt: -1 }).limit(10).select("title status priority aueDate createdAt ")
        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevel,
            },
            recentTasks
        })

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


// @des: Dashboard Data (user-specific)
// @route: GET /api/tasks/user-dashboard-data
// @access : Private
const getUserDashboardData = async (req, res) => {
    try {

        const userId = req.user._id;  // Only fetch data for the logged-in user

        // fetch statistics for user-specific tasks
        const totalTasks = await Task.countDocuments({ assignedTo: userId });
        const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: "Pending" });
        const completedTasks = await Task.countDocuments({ assignedTo: userId, status: "Completed" });
        const overdueTasks = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() }
        });


        // Task distribution by status
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ])
        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, "");
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0
            return acc
        }, {});
        taskDistribution["All"] = totalTasks;

        // Task distribution Priority

        const taskPriorities = ["Low", "Medium", "High"];

        const taskPriorityLevelRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                }
            }
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] = taskPriorityLevelRaw.find((item) => item._id === priority)?.count || 0
            return acc;
        }, {});

        // fetch recent 10 tasks for the logged-in user
        const recentTasks = await Task.find({ assignedTo: userId })
            .sort({ createdAt: -1 }).limit(10).select("title status priority dueDate createdAt");

        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels
            },
            recentTasks
        })


    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


module.exports = {
    getTasks, getTaskById, createTask,
    updateTask, deleteTask, updateTaskStatus, updateTaskChecklist,
    getDashboardData, getUserDashboardData,
}