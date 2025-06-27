const User = require("../Models/User");
const jwt = require("jsonwebtoken");


//middleware to protect routes
const protect = async (req, res, next) => {
    try {
        let token = req.headers.authorization;
        if (token && token.startsWith("Bearer")) {
            token = token.split(" ")[1]; // extract token
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decode.id).select("-password");
            next()
        } else {
            res.status(401).json({ message: "Not authorized , no token" });
        }

    } catch (error) {
        res.status(401).json({ message: "Token Failed", error: error.message });
    }
}


// middleware for admin only access
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        res.status(403).json({ message: "Access denied,admin only" });
    }
}

module.exports = { protect, adminOnly }