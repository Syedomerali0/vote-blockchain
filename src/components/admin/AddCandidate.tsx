
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, contractInterface } from '@/contracts/contractInterface';
import { Election, Candidate } from '@/types/election';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AddCandidateProps {
  election: Election;
  onCandidateAdded: () => void;
}

export default function AddCandidate({ election, onCandidateAdded }: AddCandidateProps) {
  const [candidateName, setCandidateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    fetchCandidates();
  }, [election.id]);
  const fetchCandidates = async () => {
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
      
      const electionData = await contract.getElection(parseInt(election.id));
      const candidates: Candidate[] = [];
      
      for (let i = 1; i <= electionData.candidatesCount.toNumber(); i++) {
        const candidate = await contract.getCandidate(parseInt(election.id), i);
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
        parseInt(election.id),
        candidateName.trim()
      );
      
      await tx.wait();
      
      setCandidateName('');
      toast.success('Candidate added successfully');
      onCandidateAdded();
      fetchCandidates();
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast.error('Error adding candidate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Candidates</h2>
      
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
  );
}