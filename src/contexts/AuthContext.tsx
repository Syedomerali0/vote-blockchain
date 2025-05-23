import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

interface AuthContextType {
  isWalletConnected: boolean;
  walletAddress: string | null;
  isCustUser: boolean;
  connectWallet: () => Promise<void>;
  isAuthenticated: boolean;
  userType: 'admin' | 'voter' | null;
  login: (type: 'admin' | 'voter', password: string) => boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple password storage - in a real app, this would be handled by a backend
const PASSWORDS = {
  admin: 'admin123',
  voter: 'vote123'
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCustUser, setIsCustUser] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userType, setUserType] = useState<'admin' | 'voter' | null>(null);

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

  const login = (type: 'admin' | 'voter', password: string): boolean => {
    if (PASSWORDS[type] === password) {
      setIsAuthenticated(true);
      setUserType(type);
      localStorage.setItem('auth', JSON.stringify({ type, isAuthenticated: true }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    localStorage.removeItem('auth');
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
      isAuthenticated,
      userType,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
