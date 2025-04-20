import { USSDCommand } from '@/models/types';

// Parse USSD command
export function parseUSSDCommand(command: string): USSDCommand | null {
  if (!command) return null;
  
  // Remove any whitespace and make lowercase
  command = command.trim().toLowerCase();
  
  // Check if it's a valid USSD command format: *123*<Amount>*<RecipientID>#
  const ussdPattern = /^\*123\*(\d+(\.\d+)?)\*([a-z0-9_]+)#$/;
  const match = command.match(ussdPattern);
  
  if (!match) {
    return null;
  }
  
  const amount = parseFloat(match[1]);
  const recipientId = match[3];
  
  if (isNaN(amount) || amount <= 0) {
    return null;
  }
  
  return {
    command,
    amount,
    recipientId,
  };
}

// Format USSD response
export function formatUSSDResponse(command: USSDCommand): string {
  return `
    Transaction Request
    ------------------
    Amount: ${command.amount}
    Recipient: ${command.recipientId}
    
    Reply with *123*CONFIRM# to confirm
    or *123*CANCEL# to cancel
  `;
}

// Process USSD confirmation
export function isUSSDConfirmation(command: string): boolean {
  return /^\*123\*confirm#$/i.test(command.trim());
}

// Process USSD cancellation
export function isUSSDCancellation(command: string): boolean {
  return /^\*123\*cancel#$/i.test(command.trim());
}

// Generate USSD command for an amount and recipient
export function generateUSSDCommand(amount: number, recipientId: string): string {
  return `*123*${amount}*${recipientId}#`;
} 