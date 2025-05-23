import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, contractInterface } from '@/contracts/contractInterface';
import { Toaster } from 'sonner';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Candidate {
  id: string;
  name: string;
  voteCount: number;
  party: string;
}

interface ElectionResultsState {
  title: string;
  department: string;
  description: string;
}

const ElectionResults = () => {
  const { id: electionId } = useParams<{ id: string }>();
  const { state } = useLocation() as { state: ElectionResultsState };
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      if (!window.ethereum || !electionId) {
        setError('Please connect your wallet and ensure you have selected an election');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching results for election:', electionId);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractInterface, provider);

        // Get election details
        const election = await contract.getElection(electionId);
        console.log('Election data:', election);

        // The candidates count is the 8th element (index 7) in the returned array
        const candidatesCount = election[7]?.toNumber() || 0;
        console.log('Candidates count:', candidatesCount);

        // Fetch each candidate's details
        const candidatesList: Candidate[] = [];
        
        for (let i = 1; i <= candidatesCount; i++) {
          try {
            const candidate = await contract.getCandidate(electionId, i);
            console.log(`Candidate ${i}:`, candidate);
            
            // The candidate data is returned as an object: { id, name, voteCount }
            const candidateData = {
              id: candidate.id.toString(),
              name: candidate.name,
              voteCount: candidate.voteCount.toNumber(),
              party: 'Party' // Default value since party isn't in the contract
            };
            
            candidatesList.push(candidateData);
          } catch (err) {
            console.error(`Error fetching candidate ${i}:`, err);
          }
        }

        console.log('All candidates:', candidatesList);
        
        // Sort by vote count (descending)
        const sortedCandidates = [...candidatesList].sort((a, b) => b.voteCount - a.voteCount);
        setCandidates(sortedCandidates);
        
      } catch (err) {
        console.error('Error in fetchResults:', err);
        setError('Failed to load election results. Please check the console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [electionId]);

  // Prepare data for the chart
  const chartData = {
    labels: candidates.length > 0 
      ? candidates.map((c, i) => c.name || `Candidate ${i + 1}`)
      : ['No candidates'],
    datasets: [
      {
        label: 'Votes',
        data: candidates.length > 0 
          ? candidates.map(c => c.voteCount || 0) 
          : [0],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Vote Distribution',
        font: {
          size: 16
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          stepSize: 1
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">Election data not found. Please navigate from the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold mb-2">Election Results</h1>
        <h2 className="text-2xl text-gray-700 mb-6">{state.title}</h2>
        <p className="text-gray-600 mb-2">{state.department}</p>
        <p className="text-gray-700 mb-6">{state.description}</p>
      </div>

      {error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-semibold mb-4">Vote Distribution</h3>
            <div className="h-96">
              {candidates.length > 0 ? (
                <Bar data={chartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No voting data available
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Detailed Results</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Votes
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {candidates.length > 0 ? (
                    candidates.map((candidate, index) => {
                      const totalVotes = candidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
                      const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : '0';
                      
                      return (
                        <tr key={candidate.id} className={index === 0 ? 'bg-green-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {candidate.name}
                                  {index === 0 && candidate.voteCount > 0 && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Winner
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{candidate.party}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{candidate.voteCount || 0}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{percentage}%</div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No candidates found for this election.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <Toaster position="top-right" />
    </div>
  );
};

export default ElectionResults;
