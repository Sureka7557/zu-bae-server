import mongoose from "mongoose";

const connectDB = async () => {
  // Your .env uses MONGODB_URI; the old code read MONGOOSE_URI (undefined).
  const uri = process.env.MONGODB_URI ?? process.env.MONGOOSE_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");

  mongoose.connection.on("connected", () => {
    console.log("MongoDB Connected");
  });

  await mongoose.connect(uri);
};

export default connectDB;
