'use client';

import { useState, useEffect } from 'react';
import { meshNetwork } from '@/services/meshService';

export default function MeshNetworkStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [inputPeerId, setInputPeerId] = useState('');
  const [connectStatus, setConnectStatus] = useState('');
  const [peerList, setPeerList] = useState<string[]>([]);

  useEffect(() => {
    const initialize = async () => {
      if (!meshNetwork.isReady()) {
        const success = await meshNetwork.initialize();
        setIsConnected(success);
        if (success) {
          setPeerId(meshNetwork.getPeerId());
        }
      } else {
        setIsConnected(true);
        setPeerId(meshNetwork.getPeerId());
      }
    };

    initialize();

    const connectionListener = () => {
      setIsConnected(true);
      setPeerId(meshNetwork.getPeerId());
    };

    const disconnectedListener = () => {
      setIsConnected(false);
    };

    const peerConnectedListener = () => {
      setPeerCount(meshNetwork.getConnectedPeersCount());
      setPeerList(meshNetwork.getConnectedPeers());
    };

    const peerDisconnectedListener = () => {
      setPeerCount(meshNetwork.getConnectedPeersCount());
      setPeerList(meshNetwork.getConnectedPeers());
    };

    // Register event listeners
    meshNetwork.on('connection-established', connectionListener);
    meshNetwork.on('disconnected', disconnectedListener);
    meshNetwork.on('peer-connected', peerConnectedListener);
    meshNetwork.on('peer-disconnected', peerDisconnectedListener);

    // Initial state
    if (meshNetwork.isReady()) {
      setIsConnected(true);
      setPeerId(meshNetwork.getPeerId());
      setPeerCount(meshNetwork.getConnectedPeersCount());
      setPeerList(meshNetwork.getConnectedPeers());
    }

    // Cleanup on unmount
    return () => {
      meshNetwork.off('connection-established', connectionListener);
      meshNetwork.off('disconnected', disconnectedListener);
      meshNetwork.off('peer-connected', peerConnectedListener);
      meshNetwork.off('peer-disconnected', peerDisconnectedListener);
    };
  }, []);

  const handleConnect = async () => {
    if (!inputPeerId || inputPeerId === peerId) {
      setConnectStatus('Please enter a valid Peer ID');
      return;
    }

    setConnectStatus('Connecting...');
    const success = await meshNetwork.connectToPeer(inputPeerId);
    
    if (success) {
      setConnectStatus('Connected successfully!');
      setPeerCount(meshNetwork.getConnectedPeersCount());
      setPeerList(meshNetwork.getConnectedPeers());
      setInputPeerId('');
    } else {
      setConnectStatus('Connection failed. Please try again.');
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <h3 className="text-lg font-medium">Mesh Network</h3>
        </div>
        <button 
          onClick={toggleDetails}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      {isConnected && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Status:</span> Connected with {peerCount} peers
        </div>
      )}

      {showDetails && (
        <div className="mt-4 space-y-4">
          {isConnected ? (
            <>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Your Peer ID:</span>
                  <div className="mt-1 p-2 bg-gray-100 rounded-md text-xs break-all">
                    {peerId}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Share this ID with others to let them connect to you
                  </p>
                </div>

                <div className="mt-4">
                  <span className="font-medium">Connect to a peer:</span>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={inputPeerId}
                      onChange={(e) => setInputPeerId(e.target.value)}
                      placeholder="Enter peer ID"
                      className="flex-1 p-2 text-sm border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleConnect}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Connect
                    </button>
                  </div>
                  {connectStatus && (
                    <p className={`mt-1 text-xs ${connectStatus.includes('failed') ? 'text-red-500' : connectStatus.includes('success') ? 'text-green-500' : 'text-gray-500'}`}>
                      {connectStatus}
                    </p>
                  )}
                </div>

                {peerList.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium">Connected Peers:</span>
                    <ul className="mt-1 space-y-1">
                      {peerList.map((peer) => (
                        <li key={peer} className="p-2 bg-gray-100 rounded-md text-xs break-all">
                          {peer}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-red-500">Not connected to the mesh network</p>
              <button
                onClick={() => meshNetwork.initialize()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Connect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 