import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, contractInterface } from '@/contracts/contractInterface';
import { Election, Candidate } from '@/types/election';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

interface AddCandidatePageProps {
  onElectionCreated: () => void;
}

export default function AddCandidatePage({ onElectionCreated }: AddCandidatePageProps) {
    const { electionId } = useParams<{ electionId: string }>();
    const navigate = useNavigate();
    const { isWalletConnected } = useAuth();
    const [election, setElection] = useState<Election | null>(null);
    const [candidateName, setCandidateName] = useState('');
    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
  
    useEffect(() => {
      if (!electionId) {
        toast.error('Invalid election ID');
        navigate('/admin/dashboard');
        return;
      }
      fetchElection();
    }, [electionId, navigate]);
  
    const fetchElection = async () => {
      try {
        if (!window.ethereum) {
          throw new Error('Please install MetaMask');
        }
  
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        
        if (network.chainId !== 6342) {
          throw new Error('Please switch to MegaETH network');
        }
  
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractInterface, signer);
        
        const [id, title, department, description, startTime, endTime, isActive, candidatesCount] = 
          await contract.getElection(parseInt(electionId!)); // Added ! to assert electionId is defined
  
        setElection({
          id: id.toString(),
          title,
          department,
          description,
          start_time: startTime.toNumber(),
          end_time: endTime.toNumber(),
          is_active: Boolean(isActive),
          candidates_count: candidatesCount.toNumber()
        });
        
        fetchCandidates();
      } catch (error) {
        console.error('Error fetching election:', error);
        toast.error('Error fetching election details');
      }
    };

  const fetchCandidates = async () => {
    if (!electionId) return;
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 6342) {
        throw new Error('Please switch to MegaETH network');
      }

      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractInterface, signer);
      
      const electionData = await contract.getElection(parseInt(electionId));
      const candidates: Candidate[] = [];
      
      for (let i = 1; i <= electionData.candidatesCount.toNumber(); i++) {
        const candidate = await contract.getCandidate(parseInt(electionId), i);
        candidates.push({
          id: candidate.id.toNumber(),
          name: candidate.name,
          voteCount: candidate.voteCount.toNumber()
        });
      }
      
      setCandidates(candidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Error fetching candidates');
    }
  };

  const addCandidate = async () => {
    if (!candidateName.trim()) {
      toast.error('Please enter a candidate name');
      return;
    }

    try {
      setLoading(true);
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 6342) {
        throw new Error('Please switch to MegaETH network');
      }

      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractInterface, signer);

      const tx = await contract.addCandidate(
        parseInt(electionId!),
        candidateName.trim()
      );
      
      await tx.wait();
      
      setCandidateName('');
      toast.success('Candidate added successfully');
      onElectionCreated();
      fetchCandidates();
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast.error('Error adding candidate');
    } finally {
      setLoading(false);
    }
  };

  if (!election) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Add Candidate</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Election Details</h2>
        <div className="space-y-4">
          <p className="text-gray-600">Title: {election.title}</p>
          <p className="text-gray-600">Department: {election.department}</p>
          <p className="text-gray-600">Description: {election.description}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Add New Candidate</h2>
        
        <div className="mb-6">
          <div className="mb-4">
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Enter candidate name"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          <button
            onClick={addCandidate}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !candidateName.trim()}
          >
            {loading ? 'Adding...' : 'Add Candidate'}
          </button>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Current Candidates</h3>
          {candidates.length === 0 ? (
            <p className="text-gray-600">No candidates added yet</p>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{candidate.name}</p>
                    <p className="text-sm text-gray-600">Votes: {candidate.voteCount}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}