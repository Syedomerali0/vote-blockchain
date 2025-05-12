import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminDashboard from './components/admin/AdminDashboard';
import CreateElection from './components/admin/CreateElection';
import VotingPage from './components/voting/VotingPage';
import { Toaster } from 'sonner';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, contractInterface } from './contracts/contractInterface';
import './index.css';
import './App.css';
import { Election } from './types/election';
import { toast } from 'sonner';
import AddCandidatePage from './components/admin/AddCandidatePage';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const [elections, setElections] = useState<Election[]>([]);
  const { isWalletConnected } = useAuth();
  const fetchElections = async () => {
    if (!window.ethereum) {
      console.error('No ethereum object found');
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractInterface, provider);

      console.log('Fetching elections...');
      try {
        const maxElectionsToCheck = 100; // Limit to prevent infinite loop
        
        // First, find out how many elections we have by checking in chunks
        let totalElections = 0;
        const chunkSize = 10; // Check 10 elections at a time
        
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
          console.log('No elections found');
          setElections([]);
          return;
        }
        
        console.log(`Found ${totalElections} elections, fetching details...`);
        
        // Now fetch all elections in parallel with proper error handling
        const fetchPromises: Promise<{
          id: number;
          title: string;
          department: string;
          description: string;
          startTime: number;
          endTime: number;
          isActive: boolean;
          candidatesCount: number;
        } | null>[] = [];
        
        for (let i = 1; i <= totalElections; i++) {
          fetchPromises.push(
            contract.getElection(i)
              .then(([
                id, 
                title, 
                department, 
                description, 
                startTime, 
                endTime, 
                isActive, 
                candidatesCount
              ]: [
                ethers.BigNumber, 
                string, 
                string, 
                string, 
                ethers.BigNumber, 
                ethers.BigNumber, 
                boolean, 
                ethers.BigNumber
              ]) => ({
                id: id.toNumber(),
                title,
                department,
                description,
                startTime: startTime.toNumber(),
                endTime: endTime.toNumber(),
                isActive,
                candidatesCount: candidatesCount.toNumber()
              }))
              .catch((err: Error) => {
                console.error(`Error fetching election ${i}:`, err);
                return null;
              })
          );
        }
        
        const electionResults = await Promise.all(fetchPromises);
        
        // Process the fetched elections
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const validElections = electionResults
          .filter((election): election is NonNullable<typeof election> => {
            if (!election) return false;
            
            // Skip elections with known bad data
            if ((election.department === "software engineering" && 
                 election.description === "hackahton" && 
                 election.title === "president") ||
                (election.department === "hello" && 
                 election.description === "eeee" && 
                 election.title === "new")) {
              console.log(`Skipping known bad election ${election.id} with title: ${election.title}`);
              return false;
            }
            
            return true;
          })
          .map(election => ({
            id: election.id.toString(),
            title: election.title,
            department: election.department,
            description: election.description,
            start_time: new Date(election.startTime * 1000).toISOString(),
            end_time: new Date(election.endTime * 1000).toISOString(),
            is_active: currentTimestamp >= election.startTime && currentTimestamp <= election.endTime,
            candidates_count: election.candidatesCount
          }));
        
        console.log(`Successfully processed ${validElections.length} elections`);
        setElections(validElections);
      } catch (error) {
        console.error('Error in election processing:', error);
        setElections([]);
      }
    } catch (error) {
      console.error('Error in fetchElections:', error);
      setElections([]);
    }
  };

  useEffect(() => {
    if (isWalletConnected) {
      fetchElections();
    }
  }, [isWalletConnected]);
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <Routes>
          {/* Main Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard elections={elections} onElectionCreated={fetchElections} />} />
          <Route path="/admin/create-election" element={<CreateElection onElectionCreated={fetchElections} />} />
          <Route path="/admin/add-candidate/:electionId" element={<AddCandidatePage onElectionCreated={fetchElections} />} />
          
          {/* Voter Routes */}
          <Route path="/vote" element={<VotingPage />} />
          <Route path="/vote/:electionId" element={<VotingPage />} />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;