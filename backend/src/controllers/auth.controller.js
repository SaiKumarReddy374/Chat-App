const express = require('express');
const {User} = require('../models/user.model.js');
const bcrypt =require('bcryptjs');
const { generateTokens } = require('../lib/utils.js');
const router = express.Router();
const cloudinary = require('../lib/cloudinary.js'); // Ensure you have cloudinary configured    

exports.signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await newUser.save(); // ✅ Save user first

    generateTokens(newUser._id, res); // ✅ Then generate JWT

    return res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });

  } catch (error) {
    console.error("Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // 2. Check password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // 3. Generate JWT token and set cookie
    generateTokens(user._id, res);

    // 4. Respond with user data (excluding password)
    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Error logging in" });
  }
};


exports.logout = async (req, res) => {
    try {
        res.cookie('jwt',"",{maxAge:0}); // Clear the cookie by setting maxAge to 0
        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        res.status(500).json({ error: "Error logging out" });
    }
};

exports.updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ error: "Profile picture is required" });
    }

    // console.log("Received JWT:", req.cookies.jwt); // for debug
    // console.log("Updating profile for user:", userId); // for debug

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ error: "Error updating profile" });
  }
};



exports.checkAuth = async (req, res) => {
  try {
    if (!req.user) {
      console.log("cjeckAuth user is:> ", req.user);
    return res.status(401).json({ message: "Unauthorized" });
  }
  return res.status(201).json(req.user);
    return res.status(201).json(req.user);
  } catch (error) {
    console.log("error in checking auth controller  ", error.message);
    return res.status(400).json({ message: "error in checking authorisation" });
  }
};