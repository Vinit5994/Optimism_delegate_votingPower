import { connectToMongoDB,getCollection } from "../../config/connectDB";
import { NextRequest, NextResponse } from "next/server";
import { gql, ApolloClient, InMemoryCache } from '@apollo/client';
import { MongoClient} from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const clientMongo = new MongoClient("mongodb+srv://chora-club:VIsYV9nBcTpTDpme@choraclub.2uqnfpc.mongodb.net/chora-club");
    let collection: any;
       const connectToMongoDB = async () => {
        // const uri = process.env.MONGODB_URI;
        await  clientMongo.connect();
        console.log("connected to mongoDB");  
        const database = clientMongo.db('delegates-list'); // Replace with your database name
        collection = database.collection('op-delegates-list');
    };
    // Apollo Client setup
    connectToMongoDB();
    const client = new ApolloClient({
      uri: 'https://api.goldsky.com/api/public/project_clx4gqdt1qtw801u4gaxz1xh8/subgraphs/pooltogether/1.0.0/gn', // Replace with your GraphQL endpoint
      cache: new InMemoryCache(),
    });

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // First query to get list of delegates
    const GET_DELEGATE_VOTES_CHANGED = gql`
      query GetDelegateVotesChanged($first: Int, $skip: Int) {
        delegateChangeds(orderDirection: desc, orderBy: blockTimestamp, first: $first, skip: $skip) {
          fromDelegate
          toDelegate
          blockTimestamp
        }
      }
    `;

    // Third query to fetch the new balance for each delegate
    const GET_DELEGATE_NEW_BALANCE = gql`
      query GetDelegateNewBalance($delegate: String!) {
        delegateVotesChangeds(
          where: { delegate: $delegate }
          orderBy: newBalance
          orderDirection: desc
        ) {
          newBalance
        }
      }
    `;

    // Function to fetch the list of delegates
    const fetchDelegates = async (first: number, skip: number) => {
      const { data } = await client.query({
        query: GET_DELEGATE_VOTES_CHANGED,
        variables: { first, skip },
      });
      return data.delegateChangeds;
    };

    // Function to fetch the new balance for each delegate
    const fetchDelegateNewBalance = async (delegate: string) => {
      const { data } = await client.query({
        query: GET_DELEGATE_NEW_BALANCE,
        variables: { delegate },
      });
      await delay(1000); // Add delay to avoid rate limit issues
      return data.delegateVotesChangeds[0]?.newBalance || 0;
    };

    // Function to process the data
    const processDelegatesData = async () => {
      const first = 1000;
      let skip = 0;
      let hasMoreData = true;
      let allResults = new Map();
      let count1 = 0;

      while (hasMoreData) {
        const delegates = await fetchDelegates(first, skip);
        count1++;
        console.log("count1", count1);
        if (delegates.length ===0) {
          hasMoreData = false;
          break;
        }

        for (const delegate of delegates) {
          const { toDelegate, blockTimestamp } = delegate;

          if (
            !allResults.has(toDelegate) ||
            allResults.get(toDelegate).blockTimestamp < blockTimestamp
          ) {
            allResults.set(toDelegate, delegate);
          }
        }

        skip += first;
        await delay(200);
      }

      console.log("allResults", allResults);
      // Convert the Map to an array of objects
      const resultsArray = Array.from(allResults.entries()).map(([toDelegate, data]) => ({
        toDelegate,
        // ...data,
      }));
      console.log("resultsArray", resultsArray);
      console.log("collection", collection);
      await collection.insertMany(resultsArray);

      console.log("resultsArray", resultsArray);
      return resultsArray;
    };

    // Fetch and process data
    const results = await processDelegatesData();

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
