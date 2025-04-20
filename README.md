# Offline Transaction Mesh Network dApp

A user-friendly, futuristic decentralized app (dApp) for sending and receiving payments, managing collateral, and tracking activity—even when offline—using a mesh network of validators.

---

## Features
- **Batch Payments:** Send multiple payments at once with a simple copy-paste.
- **Easy Collateral Management:** Deposit and withdraw collateral with one click.
- **Live Dashboard:** See your GPT token balance, network stats, and activity feed in real time.
- **Beginner-Friendly:** Clear instructions, examples, and tips at every step.
- **Futuristic UI:** Neon-glow, mesh backgrounds, and mobile-friendly design.

---
- **Mesh Network**: Peer-to-peer transaction propagation between nearby devices
- **Cryptographic Security**: EdDSA signatures to prevent tampering and ensure transaction integrity
- **Automatic Sync**: Background synchronization with blockchain when connectivity is restored
- **Responsive Design**: Works on mobile, tablet, and desktop devices

## Tech Stack

- **Frontend**: Next.js with React 18
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB via Dexie.js
- **QR Code**: react-qr-code (generation), @zxing/browser (scanning)
- **Mesh Network**: PeerJS (WebRTC-based P2P networking)
- **Cryptography**: tweetnacl for EdDSA signatures
- **Offline Detection**: react-offline
- **Blockchain Integration**: ethers.js (simulated in this version)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/offline-transaction-mesh-network.git
   cd offline-transaction-mesh-network
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to [http://localhost:3000](http://localhost:3000)

## Usage

### Send Money
1. Navigate to the "Send Money" page
2. Enter recipient address and amount
3. Submit the transaction
4. Show the generated QR code to the recipient
5. Transaction is automatically broadcast to nearby mesh network peers

### Receive Money
1. Navigate to the "Receive Money" page
2. Tap "Start Scanning"
3. Scan the sender's QR code
4. Confirm the transaction details
5. Transaction is automatically broadcast to nearby mesh network peers

### USSD Interface
1. Navigate to the "USSD Interface" page
2. Enter commands in the format `*123*amount*recipientID#`
3. Confirm transactions with `*123*CONFIRM#`
4. Cancel with `*123*CANCEL#`

### Transaction History
1. View all your transactions with status indicators
2. Manually sync pending transactions when online

### Mesh Network
1. On the home page, view your mesh network connection status
2. Click "Show Details" to see your Peer ID
3. Share your Peer ID with others to establish direct connections
4. Enter another user's Peer ID to connect to them
5. Once connected, transactions will automatically propagate between devices

## How It Works

### Mesh Network Architecture

1. **Peer Discovery**: Devices broadcast their presence and discover other peers
2. **Direct Connections**: WebRTC establishes peer-to-peer connections between devices
3. **Transaction Propagation**: Transactions are automatically shared with connected peers
4. **Multi-hop Delivery**: Messages can travel through multiple devices (up to 3 hops)
5. **Offline Resilience**: The network operates without requiring internet connectivity

### Offline Transaction Flow

1. **Initiation**: User creates a transaction in the app
2. **Local Storage**: Transaction is signed with the user's private key and stored locally
3. **Exchange**: Transaction details are encoded in a QR code, USSD command, or sent via mesh network
4. **Verification**: Recipient verifies the signature before accepting
5. **Propagation**: Transaction is shared with other peers in the mesh network
6. **Synchronization**: All devices sync to the blockchain when connectivity is restored

### Security Features

- **Digital Signatures**: Every transaction is cryptographically signed
- **Nonce Tracking**: Prevents double-spending and replay attacks
- **Local Validation**: Transactions are validated before local acceptance
- **Message Deduplication**: Prevents the same transaction from being processed multiple times

## Project Structure

```
src/
├── app/                # Next.js app router
│   ├── page.tsx        # Homepage
│   ├── send/           # Send money feature
│   ├── receive/        # Receive money feature
│   ├── ussd/           # USSD interface
│   └── transactions/   # Transaction history
├── components/         # Reusable UI components
│   └── MeshNetworkStatus.tsx # Mesh network UI component
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries (DB)
├── models/             # TypeScript interfaces and types
├── services/           # Business logic services
│   ├── meshService.ts  # Mesh network implementation
│   └── transactionService.ts # Transaction handling
└── utils/              # Helper functions
```

## Mesh Network Testing

To test mesh networking functionality:
1. Open the app on two or more devices/browsers
2. Make note of the Peer ID on each device (click "Show Details")
3. On one device, enter the Peer ID of the other device and click "Connect"
4. Once connected, perform a transaction on one device
5. Observe the transaction propagating to other connected devices

## Offline Mode Testing

To test offline functionality:
1. Load the app while online
2. Turn off your internet connection (airplane mode)
3. Complete transactions between devices using QR codes or the mesh network
4. Re-enable internet to test sync functionality

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- This project was created as a proof of concept for offline blockchain transactions
- Inspired by real-world challenges in regions with limited connectivity 