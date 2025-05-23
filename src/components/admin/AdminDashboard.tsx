import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@thirdweb-dev/react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, contractInterface } from '@/contracts/contractInterface';
import { Election } from '../../types/election';
import { Toaster, toast } from 'sonner';

interface AdminDashboardProps {
  elections: Election[];
  onElectionCreated?: () => void;
}

export default function AdminDashboard({ elections, onElectionCreated }: AdminDashboardProps) {
  const wallet = useWallet();
  const navigate = useNavigate();
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(false);

  // Convert election times to numbers if they're strings and calculate active status
  const processedElections = useMemo(() => {
    const now = Date.now();
    return elections.map(election => {
      const startTime = typeof election.start_time === 'string' 
        ? new Date(election.start_time).getTime() 
        : election.start_time;
      const endTime = typeof election.end_time === 'string'
        ? new Date(election.end_time).getTime()
        : election.end_time;
      
      const isActive = now >= startTime && now <= endTime;
      
      return {
        ...election,
        start_time: startTime,
        end_time: endTime,
        is_active: isActive,
        isActive // Alias for backward compatibility
      };
    });
  }, [elections]);

  const activeElections = useMemo(() => {
    return processedElections.filter(election => election.is_active);
  }, [processedElections]);

  const inactiveElections = useMemo(() => {
    return processedElections
      .filter(election => !election.is_active)
      .sort((a, b) => b.end_time - a.end_time);
  }, [processedElections]);


  const handleViewResults = (election: Election) => {
    navigate(`/admin/election/${election.id}/results`, { 
      state: { 
        title: election.title,
        department: election.department,
        description: election.description
      } 
    });
  };

  const handleCloseElection = async (electionId: string) => {
    try {
      // Check if wallet is connected
   
        // Try to connect the wallet
        try {
          await wallet?.connect();
        } catch (error) {
          console.error('Error connecting wallet:', error);
          toast.error('Failed to connect wallet');
          return;
        }
      

      setLoading(true);
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 6342) {
        throw new Error('Please switch to MegaETH network');
      }

      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractInterface, signer);

      // Add confirmation dialog
      if (!window.confirm('Are you sure you want to close this election? This action cannot be undone.')) {
        setLoading(false);
        return;
      }

      const tx = await contract.closeElection(electionId, { gasLimit: 3000000 });
      await tx.wait();
      
      // Update the election's end time to now to ensure it shows as inactive
      const now = Math.floor(Date.now() / 1000);
      const updatedElections = elections.map(election => {
        if (election.id === electionId) {
          return {
            ...election,
            end_time: now * 1000, // Convert to milliseconds
            is_active: false,
            isActive: false
          };
        }
        return election;
      });
      
      // Update the elections in the parent component
      if (onElectionCreated) {
        onElectionCreated();
      }
      
      toast.success('Election closed successfully');
    } catch (error) {
      console.error('Error closing election:', error);
      toast.error(error instanceof Error ? error.message : 'Error closing election');
    } finally {
      setLoading(false);
    }
  };

  const renderElectionCard = (election: Election, isActive: boolean) => {
    const startDate = new Date(election.start_time);
    const endDate = new Date(election.end_time);
    const now = new Date();
    
    // Calculate if the election should be active based on current time and not manually closed
    const shouldBeActive = now >= startDate && now <= endDate && election.is_active !== false;
    
    // If the election was manually closed, ensure it shows as inactive
    const isManuallyClosed = election.is_active === false;
    
    // If the displayed status doesn't match the calculated status, we might need to refresh
    if (isActive !== shouldBeActive && onElectionCreated) {
      // Schedule a refresh to update the status
      setTimeout(() => onElectionCreated(), 1000);
    }

    return (
      <div key={election.id} className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-2">{election.title}</h3>
        <p className="text-gray-600 mb-2">{election.department}</p>
        <p className="text-gray-700 mb-4">{election.description}</p>
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Starts: {startDate.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">
            Ends: {isManuallyClosed ? 'Closed' : endDate.toLocaleString()}
          </p>
          {isManuallyClosed && (
            <p className="text-sm text-red-500 mt-1">
              This election was manually closed
            </p>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            shouldBeActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {shouldBeActive ? 'Active' : 'Inactive'}
          </span>
          
          <div className="space-x-2">
            {shouldBeActive ? (
              <button
                onClick={() => navigate(`/admin/add-candidate/${election.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Manage Candidate
              </button>
            ) : (
              <button
                onClick={() => handleViewResults(election)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                View Results
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => navigate('/admin/create-election')}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Create New Election
        </button>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Active Elections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeElections.length > 0 ? (
              activeElections.map(election => renderElectionCard(election, true))
            ) : (
              <p className="text-gray-500">No active elections</p>
            )}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Inactive Elections</h2>
            {inactiveElections.length > 0 && (
              <p className="text-sm text-gray-500">
                {inactiveElections.length} inactive election{inactiveElections.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactiveElections.length > 0 ? (
              inactiveElections.map(election => renderElectionCard(election, false))
            ) : (
              <p className="text-gray-500">No inactive elections</p>
            )}
          </div>
        </section>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}