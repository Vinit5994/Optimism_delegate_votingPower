"use client";
import { useState, useEffect } from 'react';
import { gql } from '@apollo/client';
import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://api.studio.thegraph.com/query/68573/v6_proxy/v0.0.3',
  cache: new InMemoryCache(),
});

const COMBINED_VOTE_QUERY = gql`
  query CombinedVoteQuery($proposalId: String!, $skip1: Int!, $skip2: Int!, $first: Int!) {
    voteCastWithParams: voteCastWithParams_collection(
      where: { proposalId: $proposalId }
      first: $first
      orderBy: blockTimestamp
      orderDirection: desc
      skip: $skip1
    ) {
      voter
      weight
      support
    }
    voteCasts(
      where: { proposalId: $proposalId }
      orderBy: blockTimestamp
      orderDirection: desc
      skip: $skip2
      first: $first
    ) {
      voter
      weight
      support
    }
  }
`;

interface VoteCast {
  voter: string;
  weight: string;
  support: number;
}

interface VotesComponentProps {
  proposalId: string;
}

const VotesComponent: React.FC<VotesComponentProps> = ({ proposalId }) => {
  const [support0Weight, setSupport0Weight] = useState(0);
  const [support1Weight, setSupport1Weight] = useState(0);
  const [support2Weight, setSupport2Weight] = useState(0);
  const [votersCount, setVotersCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weiToEther = (wei: string): number => {
    return Number(wei) / 1e18;
  };

  const formatWeight = (weight: number): string => {
    if (weight >= 1e9) {
      return (weight / 1e9).toFixed(2) + 'B';
    } else if (weight >= 1e6) {
      return (weight / 1e6).toFixed(2) + 'M';
    } else if (weight >= 1e3) {
      return (weight / 1e3).toFixed(2) + 'K';
    } else {
      return weight.toFixed(2);
    }
  };

  const fetchVotes = async () => {
    setLoading(true);
    setError(null);
    let allVotes: VoteCast[] = [];
    let skip1 = 0;
    let skip2 = 0;
    const first = 1000; // Batch size

    try {
      while (true) {
        const { data } = await client.query({
          query: COMBINED_VOTE_QUERY,
          variables: { proposalId, skip1, skip2, first },
        });

        const newVoteCastWithParams = data?.voteCastWithParams || [];
        const newVoteCasts = data?.voteCasts || [];

        if (newVoteCastWithParams.length === 0 && newVoteCasts.length === 0) {
          break;
        }

        allVotes = [...allVotes, ...newVoteCastWithParams, ...newVoteCasts];
        skip1 += newVoteCastWithParams.length;
        skip2 += newVoteCasts.length;
      }

      console.log("Fetched votes:", allVotes);

      let s0Weight = 0;
      let s1Weight = 0;
      let s2Weight = 0;

      allVotes.forEach((vote: VoteCast) => {
        const weightInEther = weiToEther(vote.weight);
        if (vote.support === 0) {
          s0Weight += weightInEther;
        } else if (vote.support === 1) {
          s1Weight += weightInEther;
        } else if (vote.support === 2) {
          s2Weight += weightInEther;
        }
      });

      console.log("Support 0 Weight:", s0Weight);
      console.log("Support 1 Weight:", s1Weight);
      console.log("Support 2 Weight:", s2Weight);

      setSupport0Weight(s0Weight);
      setSupport1Weight(s1Weight);
      setSupport2Weight(s2Weight);
      setVotersCount(allVotes.length);
    } catch (err: any) {
      console.error("Error fetching votes:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVotes();
  }, [proposalId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>Vote Results</h2>
      <p>Support 0 Weight: {formatWeight(support0Weight)}</p>
      <p>Support 1 Weight: {formatWeight(support1Weight)}</p>
      <p>Support 2 Weight: {formatWeight(support2Weight)}</p>
      <p>Total Voters: {votersCount}</p>
    </div>
  );
};

export default VotesComponent;