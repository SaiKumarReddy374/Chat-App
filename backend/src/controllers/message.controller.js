const {User} = require('../models/user.model.js');
const {Message} = require('../models/message.model.js');
const cloudinary = require('../lib/cloudinary.js'); // Ensure you have cloudinary configured
const { io, getReceiverSocketId } = require('../lib/socket.js');


exports.getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const users = await User.find({ _id: { $ne: loggedInUserId } }).select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users for sidebar:", error); 
        res.status(500).json({ error: "Error fetching users" });
    }
}

exports.getMessagesByUserId = async (req, res) => {
    // const userId = req.params.id;
    // const loggedInUserId = req.user._id;

    try {
        const {id:userToChatId}= req.params;
        const senderId = req.user._id;
        const messages = await Message.find({
            $or: [
                { senderId: senderId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: senderId}
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error.message);
        res.status(500).json({ error: "Error fetching messages" });
    }
}

exports.sendMessage = async (req, res) => {
    const { text, image} = req.body;
    const {id:receiverId} = req.params; 
    const senderId = req.user._id;

    try {
        let imageUrl;
        if(image){
            const uploadImage = await cloudinary.uploader.upload(image);
            imageUrl = uploadImage.secure_url;
        }
        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image:imageUrl,
        });
        const savedMessage = await newMessage.save();

        //realtime socket.io will be done here
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }
         
        res.status(201).json(savedMessage);
    } catch (error) {
        console.error("Error sending message:+65", error.message);
        res.status(500).json({ error: "Error sending message" });
    }
}