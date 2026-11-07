import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Verify API Create
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ msg: "Unauthorized" });
  }

  // Split kore Bearer bad diye sudhu Token k access kora
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ msg: "Unauthorized" });
  }

  // JWKS endpoint for fetch
  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
  );

  // ekhon token valid ki na check korte hobe ( payload verify )
  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    res.status(500).send({ msg: "Internel Server Error" });
  }
};

// MongoDB Connected
const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You Successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("wanderlust");
const destinationCollection = db.collection("destination");
const bookingCollection = db.collection("bookings");

// Home API
app.get("/", (req, res) => {
  res.send({ message: "Server is running fine!" });
});

// Create Destination API
app.post("/add-destination",  verifyToken, async (req, res) => {
  const data = req.body;

  const result = await destinationCollection.insertOne(data);

  console.log(result);
  res.send(result);
});

// All Data get API
app.get("/destinations", async (req, res) => {
  const result = await destinationCollection.find().toArray();

  res.send(result);
});

// Featured section er jonno 5 data get API
app.get('/featured-destinations', async(req, res) => {
  const result = await destinationCollection.find().limit(5).toArray()
  res.send(result)
})

// One data update API
app.patch("/destinations/:id", verifyToken, async (req, res) => {
  if (authHeader !== "user logged in") {
    return res.status(401).send({ msg: "Unauthorized" });
  }

  const { id } = req.params;
  const updatedData = req.body;
  const result = await destinationCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData },
  );

  res.json(result);
});

// Delete API
app.delete("/destinations/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await destinationCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.json(result);
});

// Booking API
app.post("/booking", verifyToken, async (req, res) => {
  try {
    const data = req.body;

    const result = await bookingCollection.insertOne(data);

    res.send({
      success: true,
      message: "Booking successful!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error inserting booking:", error);

    res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Email diye data khoja
app.get("/my-bookings/:email", async (req, res) => {
  const { email } = req.params;
  const result = await bookingCollection.find({ email: email }).toArray();
  res.send(result);
});

// Single page data API
app.get(
  "/destinations/:id",

  verifyToken,

  async (req, res) => {
    const { id } = req.params;
    const result = await destinationCollection.findOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  },
);

// My booking cancle
app.delete("/my-bookings/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// http://localhost:5000/featured-destinations
app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});


export default app
