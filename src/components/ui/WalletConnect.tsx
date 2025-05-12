import { ConnectWallet } from "@thirdweb-dev/react";
import { useAddress } from "@thirdweb-dev/react";

export default function WalletConnect() {
  const address = useAddress();
  
  if (!address) {
    return (
      <div className="flex justify-center my-4">
        <ConnectWallet
          theme="dark"
          // accentColor="#000000"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center my-4">
      <div className="text-green-600 text-lg font-semibold mb-2">Connected</div>
      <div className="text-sm text-gray-600">{address?.substring(0, 6)}...{address?.substring(address.length - 4)}</div>
    </div>
  );
}