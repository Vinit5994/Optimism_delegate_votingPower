"use client"
import React, { useState, useEffect } from 'react';
import { gql, ApolloClient, InMemoryCache, NormalizedCacheObject, ApolloProvider } from '@apollo/client';

const GET_CANCELED_PROPOSALS = gql`
  query GetCanceledProposals($first: Int!, $skip: Int!) {
    proposalCanceleds(orderBy: blockTimestamp, orderDirection: desc, first: $first, skip: $skip) {
      proposalId
      blockTimestamp
    }
  }
`
const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
  uri: 'https://api.studio.thegraph.com/query/68573/v6_proxy/version/latest', // Replace with your GraphQL endpoint
  cache: new InMemoryCache(),
});

const CanceledProposals: React.FC = () => {
  const [canceledProposals, setCanceledProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCanceledProposals = async () => {
    let allProposals: any[] = [];
    let skip = 0;
    let shouldContinue = true;

    while (shouldContinue) {
      try {
        const { data } = await client.query({
          query: GET_CANCELED_PROPOSALS,
          variables: {
            first: 10,
            skip,
          },
        });

        const fetchedProposals = data.proposalCanceleds;

        if (fetchedProposals.length === 0) {
          shouldContinue = false;
        } else {
          allProposals = [...allProposals, ...fetchedProposals];
          skip += 10;
        }
      } catch (err:any) {
        setError(err.message);
        shouldContinue = false;
      }
    }

    setCanceledProposals(allProposals);
    setLoading(false);
  };

  useEffect(() => {
    fetchCanceledProposals();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Canceled Proposals</h1>
      <ul>
        {canceledProposals.map((proposal) => (
          <li key={proposal.proposalId}>
            <p>Proposal ID: {proposal.proposalId}</p>
            <p>Block Timestamp: {new Date(proposal.blockTimestamp * 1000).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CanceledProposals;
