import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { CONTRACT_ADDRESS, contractInterface } from '@/contracts/contractInterface';
import { Election } from '../../types/election';

const VotingPage = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<{id: number, name: string, voteCount: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const navigate = useNavigate();
  const { electionId } = useParams<{ electionId?: string }>();

  // Check if user has already voted in this election
  const checkIfVoted = (electionId: string): boolean => {
    if (typeof window === 'undefined') return false;
    const votedElections = JSON.parse(localStorage.getItem('votedElections') || '{}');
    return !!votedElections[electionId];
  };

  // Mark election as voted in local storage
  const markAsVoted = (electionId: string) => {
    if (typeof window === 'undefined') return;
    const votedElections = JSON.parse(localStorage.getItem('votedElections') || '{}');
    votedElections[electionId] = true;
    localStorage.setItem('votedElections', JSON.stringify(votedElections));
    setHasVoted(true);
  };

  // Fetch all elections and candidates for the selected election
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!window.ethereum) {
          throw new Error('Please install MetaMask to continue');
        }

        setLoading(true);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractInterface, provider);
        
        // Request account access if needed
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // First, find out how many elections we have by checking in chunks
        const maxElectionsToCheck = 100;
        const chunkSize = 10;
        let totalElections = 0;
        
        // Find the total number of elections
        for (let i = 1; i <= maxElectionsToCheck; i += chunkSize) {
          const chunkPromises: Promise<any>[] = [];
          for (let j = 0; j < chunkSize && (i + j) <= maxElectionsToCheck; j++) {
            chunkPromises.push(contract.getElection(i + j));
          }
          
          const chunkResults = await Promise.all(chunkPromises);
          const validElections = chunkResults.filter(
            ([id]: [ethers.BigNumber]) => id.toNumber() !== 0 && id.toNumber() <= maxElectionsToCheck
          );
          
          if (validElections.length === 0) break;
          totalElections = i + validElections.length - 1;
        }
        
        if (totalElections === 0) {
          setElections([]);
          return;
        }
        
        // Fetch all elections in parallel
        const electionPromises: Promise<{
          id: number;
          title: string;
          department: string;
          description: string;
          startTime: number;
          endTime: number;
          candidatesCount: number;
        } | null>[] = [];
        
        for (let i = 1; i <= totalElections; i++) {
          electionPromises.push(
            contract.getElection(i)
              .then(([
                id, 
                title, 
                department, 
                description, 
                startTime, 
                endTime, 
                , 
                candidatesCount
              ]: [
                ethers.BigNumber, 
                string, 
                string, 
                string, 
                ethers.BigNumber, 
                ethers.BigNumber, 
                any, 
                ethers.BigNumber
              ]) => ({
                id: id.toNumber(),
                title,
                department,
                description,
                startTime: startTime.toNumber(),
                endTime: endTime.toNumber(),
                candidatesCount: candidatesCount.toNumber()
              }))
              .catch((err: Error) => {
                console.error(`Error fetching election ${i}:`, err);
                return null;
              })
          );
        }
        
        const electionResults = await Promise.all(electionPromises);
        const now = Math.floor(Date.now() / 1000);
        
        // Process elections and filter out invalid ones
        const validElections = electionResults
          .filter((election): election is NonNullable<typeof election> => {
            if (!election) return false;
            
            // Skip known bad elections
            if ((election.department === "software engineering" && 
                 election.description === "hackahton" && 
                 election.title === "president") ||
                (election.department === "hello" && 
                 election.description === "eeee" && 
                 election.title === "new")) {
              return false;
            }
            
            return true;
          })
          .map(election => ({
            id: election.id.toString(),
            title: election.title,
            department: election.department,
            description: election.description,
            start_time: election.startTime * 1000,
            end_time: election.endTime * 1000,
            is_active: now >= election.startTime && now <= election.endTime,
            candidates_count: election.candidatesCount
          }));
        
        setElections(validElections);
        
        // If we have a selected election ID, fetch its candidates
        if (electionId) {
          const selectedElection = validElections.find(e => e.id === electionId);
          if (selectedElection) {
            setSelectedElection(selectedElection);
            
            // Fetch candidates in parallel
            const candidatePromises = [];
            for (let i = 1; i <= selectedElection.candidates_count; i++) {
              candidatePromises.push(
                contract.getCandidate(parseInt(selectedElection.id), i)
                  .then((candidate: any) => ({
                    id: candidate.id.toNumber(),
                    name: candidate.name,
                    voteCount: candidate.voteCount.toNumber()
                  }))
                  .catch((err: Error) => {
                    console.error(`Error fetching candidate ${i}:`, err);
                    return null;
                  })
              );
            }
            
            const candidates = await Promise.all(candidatePromises);
            setCandidates(candidates.filter((c): c is { id: number; name: string; voteCount: number } => c !== null));
            
            // Check if user has voted
            setHasVoted(checkIfVoted(electionId));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [electionId]);

  // Handle voting for a candidate
  const handleVote = async (candidateId: number) => {
    if (!selectedElection || hasVoted) return;
    
    try {
      setLoading(true);
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to continue');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractInterface, signer);
      
      const tx = await contract.vote(parseInt(selectedElection.id), candidateId);
      await tx.wait();
      
      // Mark this election as voted in local storage
      markAsVoted(selectedElection.id);
      
      // Update the candidate's vote count in the UI
      setCandidates(prevCandidates => 
        prevCandidates.map(candidate => 
          candidate.id === candidateId 
            ? { ...candidate, voteCount: candidate.voteCount + 1 } 
            : candidate
        )
      );
      
      // Update the selectedElection to maintain the view
      setSelectedElection(prev => prev ? { ...prev } : null);
      
      setHasVoted(true);
      toast.success('Vote cast successfully!');
    } catch (error) {
      console.error('Error casting vote:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cast vote');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (selectedElection) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={() => {
            setSelectedElection(null);
            navigate('/vote');
          }}
          className="mb-6 text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← Back to Elections
        </button>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold mb-4">{selectedElection.title}</h1>
          <p className="text-gray-600 mb-4">{selectedElection.description}</p>
          <div className="flex justify-between items-center text-sm text-gray-500 mb-6">
            <span>Department: {selectedElection.department}</span>
            <span>{candidates.length} Candidates</span>
            {hasVoted && (
              <span className="text-red-500 font-medium">
                You have already voted in this election
              </span>
            )}
          </div>
          
          <h2 className="text-2xl font-semibold mb-6">Candidates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-medium mb-2">{candidate.name}</h3>
                <p className="text-gray-600 mb-4">Votes: {candidate.voteCount}</p>
                <button
                  onClick={() => handleVote(candidate.id)}
                  disabled={loading || hasVoted}
                  className={`w-full py-2 px-4 rounded-md transition-colors ${
                    hasVoted 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {hasVoted 
                    ? 'Already Voted' 
                    : loading 
                      ? 'Processing...' 
                      : `Vote for ${candidate.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Vote in Elections</h1>
      
      {elections.filter(e => e.is_active).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No active elections available for voting at the moment.</p>
          
          {/* Show inactive elections section */}
          {elections.filter(e => !e.is_active).length > 0 && (
            <div className="mt-12 text-left">
              <h2 className="text-2xl font-semibold mb-6">Past Elections</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {elections
                  .filter(election => !election.is_active)
                  .sort((a, b) => {
                    // Convert timestamps to numbers and compare
                    const timeA = Number(a.start_time);
                    const timeB = Number(b.start_time);
                    return timeB - timeA; // Sort by newest start time first
                  })
                  .map((election) => (
                    <div 
                      key={election.id} 
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 opacity-75"
                    >
                      <div className="p-6">
                        <h2 className="text-xl font-semibold mb-2">{election.title}</h2>
                        <p className="text-gray-600 mb-4">{election.description}</p>
                        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                          <span>Department: {election.department}</span>
                          <span>{election.candidates_count} Candidates</span>
                        </div>
                        <div className="text-sm text-gray-500 mb-4">
                          Ended on: {new Date(election.end_time).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => navigate(`/vote/${election.id}`)}
                          className="w-full bg-gray-300 text-gray-600 py-2 px-4 rounded-md cursor-not-allowed"
                          disabled
                        >
                          Election Ended
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elections
            .filter(election => election.is_active)
            .map((election) => (
              <div 
                key={election.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2">{election.title}</h2>
                  <p className="text-gray-600 mb-4">{election.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <span>Department: {election.department}</span>
                    <span>{election.candidates_count} Candidates</span>
                  </div>
                  <button
                    onClick={() => navigate(`/vote/${election.id}`)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-300"
                  >
                    View Candidates & Vote
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default VotingPage;