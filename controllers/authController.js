
const jwt = require("jsonwebtoken");
const User = require("../Models/User");
const bcrypt = require("bcryptjs");

// generate Jwt Token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "168h" });
}


//@desc Register a new User
// @path POST/api/auth/register
// @access public

const registerUser = async (req, res) => {
    try {

        const { name, email, password, profileImageUrl, adminInviteToken } = req.body;

        // check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        let role = "member";
        if (adminInviteToken && adminInviteToken === process.env.ADMIN_INVITE_TOKEN) {
            role = "admin"
        }

        // hash password;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            profileImageUrl,
            role,
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImageUrl: user.profileImageUrl,
            token: generateToken(user._id),
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}


//@desc Login a new User
// @path POST/api/auth/login
// @access public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: "invalid email or password" });
        }
        // compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "invalid email or password" });
        }

        // Return user data with jwt

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImageUrl: user.profileImageUrl,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}

// //@desc Get User Profile
// @path GET/api/auth/profile
// @access Private(required jwt)


const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user)

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}

//@desc Update user profile
// @path PUT/api/auth/profile
// @access private(required jwt)

const updateUserProfile = async (req, res) => {
    try {

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            token: generateToken(updatedUser._id)
        })

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}









module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile }

