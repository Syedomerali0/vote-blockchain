import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import './index.css';

// Create a query client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// MegaETH chain configuration
const megaethChain = {
  chain: "MEGAETH",
  chainId: 6342,
  name: "MegaETH Testnet",
  slug: "megaeth",
  shortName: "megaeth",
  testnet: true,
  nativeCurrency: {
    name: "MegaETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: ["https://carrot.megaeth.com/rpc"],
  queryClientConfig: {
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  },
  // Add custom chain configuration
  blockExplorerUrls: ["https://explorer.megaeth.com"],
  multicallAddress: "0x5ba1e12693dc8f9c48aad8770482f4739beed696",
  ensRegistryAddress: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider
        activeChain={megaethChain}
        clientId="fd5021cb857b5db21ed83ebec4b55307"
        supportedChains={[megaethChain]}
      >
        <App />
      </ThirdwebProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
