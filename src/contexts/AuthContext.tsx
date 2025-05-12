import { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';

interface AuthContextType {
  isWalletConnected: boolean;
  walletAddress: string | null;
  isCustUser: boolean;
  connectWallet: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCustUser, setIsCustUser] = useState(false);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsWalletConnected(true);
          
          // Check if connected to MegaETH network
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const network = await provider.getNetwork();
          if (network.chainId !== 6342) {
            throw new Error('Please switch to MegaETH network');
          }
        }
      } else {
        throw new Error('Please install MetaMask');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });
          
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setIsWalletConnected(true);
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkWalletConnection();
  }, []);

  return (
    <AuthContext.Provider value={{
      isWalletConnected,
      walletAddress,
      isCustUser,
      connectWallet,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
