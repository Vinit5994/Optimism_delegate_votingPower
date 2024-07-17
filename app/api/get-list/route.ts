import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';
import { MongoClient } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = process.env.MONGO_URI;
// Your MongoDB connection string
if (!uri) {
  throw new Error('MongoDB connection string is undefined.');
}
const client = new MongoClient(uri);

const apolloClient = new ApolloClient({
  link: createHttpLink({ uri: "https://api.goldsky.com/api/public/project_clx4gqdt1qtw801u4gaxz1xh8/subgraphs/pooltogether/1.0.0/gn", fetch }),
  cache: new InMemoryCache(),
});

//previous timestamp 1718081955
const DELEGATE_QUERY = gql`
  query MyQuery($delegate: String!) {
      delegateVotesChangeds(where: {delegate: $delegate , blockTimestamp_lte: "1721214200"}, 
      orderBy: blockTimestamp
      orderDirection: desc
      first: 1) {
        newBalance
      }
  }
`;

export const GET = async (req: NextRequest) => {
  try {
    // Connect to MongoDB
   await client.connect();
    const db = client.db('delegates-list'); // Replace with your database name
    const collection = db.collection('op-delegates-list');

    const batchSize = 1000;
    let skip = 0;
    let hasMoreData = true;
    let count = 0;
    let batchCount =1;

    while (hasMoreData) {
      // Fetch a batch of toDelegate data from MongoDB
      const toDelegates = await collection.find().skip(skip).limit(batchSize).toArray();
      if (toDelegates.length === 0) { 
        hasMoreData = false;
        break;
      }
      // Execute the GraphQL query for each delegate
      for (const toDelegate of toDelegates) {
        
        const delegate = toDelegate.toDelegate;

        const result = await apolloClient.query({
          query: DELEGATE_QUERY,
          variables: { delegate },
        });
        const fetchedData = result.data.delegateVotesChangeds[0];
        count++;
        console.log("count",count)
        console.log("batchCount",batchCount)
        if (fetchedData) {
          // Update MongoDB document with the fetched data
         
          await collection.updateOne(
            { toDelegate : delegate },
            { $set: { newBalance: fetchedData.newBalance } },
            { upsert: true }
          );
          
        }
      }
batchCount++;
      skip += batchSize;
    
    }

    return NextResponse.json({ message: 'Delegates data fetched successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An error occurred.' }, { status: 500 });
  }
};
