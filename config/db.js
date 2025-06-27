

const mongoose = require("mongoose");



const ConnectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("mongodb connected  ");
    } catch (error) {
        console.log("db connect error", error);
    }
}


module.exports = ConnectDB;