import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, contractInterface } from '@/contracts/contractInterface';
import { Election } from '@/types/election';
import { useAuth } from '@/contexts/AuthContext';
import { Toaster, toast } from 'sonner';

interface CreateElectionProps {
  onElectionCreated: () => void;
}

export default function CreateElection({ onElectionCreated }: CreateElectionProps) {
  const { isWalletConnected } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    startTime: '',
    endTime: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isWalletConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);

      // Validate form data
      if (!formData.title || !formData.department || !formData.description || !formData.startTime || !formData.endTime) {
        throw new Error('Please fill in all fields');
      }

      const startTime = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(formData.endTime).getTime() / 1000);
      const currentTime = Math.floor(Date.now() / 1000);

      if (startTime >= endTime) {
        throw new Error('End time must be after start time');
      }

      // Get provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 6342) {
        throw new Error('Please switch to MegaETH network');
      }

      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractInterface, signer);

      // Create election
      const tx = await contract.createElection(
        formData.title,
        formData.department,
        formData.description,
        startTime,
        endTime,
        { gasLimit: 3000000 } // Add gas limit to ensure transaction goes through
      );

      const receipt = await tx.wait();
      
      // Wait for a short time to ensure the blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Election created successfully');
      
      // Call the callback to refresh the elections list
      onElectionCreated();
      
      // Reset form
      setFormData({
        title: '',
        department: '',
        description: '',
        startTime: '',
        endTime: ''
      });
    } catch (error) {
      console.error('Error creating election:', error);
      toast.error(error instanceof Error ? error.message : 'Error creating election');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Election</h1>
      
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? 'Creating...' : 'Create Election'}
          </button>
        </div>
      </form>

      {!isWalletConnected && (
        <div className="mt-8 text-center">
          <p className="text-red-500">Please connect your wallet to create elections</p>
        </div>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}