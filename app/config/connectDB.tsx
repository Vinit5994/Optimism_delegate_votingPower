import { MongoClient} from "mongodb";


// export async function connectDB() {
//   const client = await MongoClient.connect(process.env.MONGODB_URI!, {
//     dbName: "delegates-list",
//   } );
const clientMongo = new MongoClient("mongodb+srv://chora-club:VIsYV9nBcTpTDpme@choraclub.2uqnfpc.mongodb.net/chora-club");
let collection: any;
  export const connectToMongoDB = async () => {
    // const uri = process.env.MONGODB_URI;
    await  clientMongo.connect();
    console.log("connected to mongoDB");  
    const database = clientMongo.db('delegates-list'); // Replace with your database name
     collection = collection('op-delegates-list');
};
export const getCollection = () => {
  if (!collection) {
    throw new Error("Collection is not initialized. Please connect to the database first.");
  }
  return collection;
}