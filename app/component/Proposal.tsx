// components/Proposals.js
"use client"
import React, { useEffect, useState ,useCallback} from 'react';
import { gql, ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.studio.thegraph.com/query/68573/v6_proxy/version/latest', // replace with your GraphQL endpoint
  }),
  cache: new InMemoryCache(),
});

const GET_PROPOSALS = gql`
  query MyQuery {
    proposalCreated1S(orderDirection: desc, orderBy: blockTimestamp) {
      proposalId
      blockTimestamp
      description
      proposer
    }
    proposalCreated2S(orderDirection: desc, orderBy: blockTimestamp) {
      proposalId
      blockTimestamp
      proposer
    }
    proposalCreated3S(orderDirection: desc, orderBy: blockTimestamp) {
      proposalId
      blockTimestamp
      proposer
    }
    proposalCreateds(orderDirection: desc, orderBy: blockTimestamp) {
      proposalId
      blockTimestamp
      proposer
    }
  }
`;

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
interface Proposal {
  proposalId: string;
  blockTimestamp: number;
  description?: string;
  votesLoaded?: boolean;
  support0Weight?: number;
  support1Weight?: number;
  support2Weight?: number;
  votersCount?: number;
}

interface VoteCast {
  voter: string;
  weight: string;
  support: number;
}

const Proposals = () => {
  const [allProposals, setAllProposals] = useState<Proposal[]>([]);
  const [displayedProposals, setDisplayedProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const proposalsPerPage = 5;

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
      return weight?.toFixed(2);
    }
  };
  const fetchVotes = useCallback(async (proposal: Proposal): Promise<Proposal> => {
    if (proposal.votesLoaded) {
      return proposal;
    }

    let allVotes: VoteCast[] = [];
    let skip1 = 0;
    let skip2 = 0;
    const first = 1000; // Batch size

    try {
      while (true) {
        const { data } = await client.query({
          query: COMBINED_VOTE_QUERY,
          variables: { proposalId: proposal.proposalId, skip1, skip2, first },
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

      return {
        ...proposal,
        support0Weight: s0Weight,
        support1Weight: s1Weight,
        support2Weight: s2Weight,
        votersCount: allVotes.length,
        votesLoaded: true,
      };
    } catch (err: any) {
      console.error("Error fetching votes:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const result = await client.query({ query: GET_PROPOSALS });
        const {
          proposalCreated1S,
          proposalCreated2S,
          proposalCreated3S,
          proposalCreateds,
        } = result.data;

        const proposals: Proposal[] = [
          ...proposalCreated1S,
          ...proposalCreated2S,
          ...proposalCreated3S,
          ...proposalCreateds,
        ].sort((a, b) => b.blockTimestamp - a.blockTimestamp);

        setAllProposals(proposals);
        setDisplayedProposals(proposals.slice(0, proposalsPerPage));
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, []);

  useEffect(() => {
    const fetchVotesForDisplayedProposals = async () => {
      setLoading(true);
      try {
        const updatedProposals = await Promise.all(
          displayedProposals.map(async (proposal) => {
            if (!proposal.votesLoaded) {
              return await fetchVotes(proposal);
            }
            return proposal;
          })
        );
        setDisplayedProposals(updatedProposals);
      } catch (error: any) {
        console.error("Error fetching votes:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (displayedProposals.some(proposal => !proposal.votesLoaded)) {
      fetchVotesForDisplayedProposals();
    }
  }, [displayedProposals, fetchVotes]);

  const loadMoreProposals = useCallback(() => {
    const nextPage = currentPage + 1;
    const startIndex = (nextPage - 1) * proposalsPerPage;
    const endIndex = startIndex + proposalsPerPage;
    const newProposals = allProposals.slice(startIndex, endIndex);
    setDisplayedProposals(prevProposals => [...prevProposals, ...newProposals]);
    setCurrentPage(nextPage);
  }, [allProposals, currentPage, proposalsPerPage]);

  if (loading && displayedProposals.length === 0) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  return (
    <div>
      <h1>Proposals</h1>
      <ul>
        {displayedProposals.map((proposal: any) => (
          <li key={proposal.proposalId}>
            <p>Proposal ID: {proposal.proposalId}</p>
            <p>Block Timestamp: {new Date(proposal.blockTimestamp * 1000).toLocaleString()}</p>
            <p>Description: {proposal.description}</p>
            <p>{proposal.proposer}</p>
          
            {proposal.votersCount !== undefined && (
              <>
                <p>Total Voters: {proposal.votersCount}</p>
                <p>Support 0 Weight: {formatWeight(proposal.support0Weight)}</p>
                <p>Support 1 Weight: {formatWeight(proposal.support1Weight)}</p>
                <p>Support 2 Weight: {formatWeight(proposal.support2Weight)}</p>
              
              </>
            )}
          <br/>
          <br/>
          </li>
        ))}
          
      </ul>
      {displayedProposals.length < allProposals.length && (
        <button onClick={loadMoreProposals}>Load More</button>
      )}
    </div>
  );
};

export default Proposals;