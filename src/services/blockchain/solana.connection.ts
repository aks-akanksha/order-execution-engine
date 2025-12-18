import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { logger } from '../../utils/logger';
import bs58 from 'bs58';

export class SolanaConnection {
  private connection: Connection;
  private wallet: Keypair | null = null;
  private network: 'devnet' | 'mainnet-beta' | 'testnet';

  constructor(network: 'devnet' | 'mainnet-beta' | 'testnet' = 'devnet') {
    this.network = network;
    const rpcUrl = process.env.SOLANA_RPC_URL || this.getDefaultRpcUrl(network);
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    // Initialize wallet from private key if provided
    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    if (privateKey) {
      try {
        const privateKeyBytes = bs58.decode(privateKey);
        this.wallet = Keypair.fromSecretKey(privateKeyBytes);
        logger.info('Solana wallet initialized', { 
          publicKey: this.wallet.publicKey.toBase58(),
          network 
        });
      } catch (error) {
        logger.error('Failed to initialize Solana wallet', { error });
      }
    } else {
      logger.warn('No SOLANA_PRIVATE_KEY provided. Using mock wallet for testing.');
      // Generate a random keypair for devnet testing (not for real funds)
      this.wallet = Keypair.generate();
      logger.info('Generated temporary wallet for devnet', { 
        publicKey: this.wallet.publicKey.toBase58() 
      });
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  getWallet(): Keypair {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    return this.wallet;
  }

  getNetwork(): string {
    return this.network;
  }

  async getBalance(publicKey?: PublicKey): Promise<number> {
    const address = publicKey || this.wallet?.publicKey;
    if (!address) {
      throw new Error('No address provided and wallet not initialized');
    }
    const balance = await this.connection.getBalance(address);
    return balance / 1e9; // Convert lamports to SOL
  }

  async sendTransaction(transaction: Transaction): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.wallet],
        {
          commitment: 'confirmed',
          skipPreflight: false,
        }
      );
      return signature;
    } catch (error) {
      logger.error('Transaction failed', { error });
      throw error;
    }
  }

  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      return confirmation.value.err === null;
    } catch (error) {
      logger.error('Transaction confirmation failed', { error, signature });
      return false;
    }
  }

  private getDefaultRpcUrl(network: string): string {
    switch (network) {
      case 'devnet':
        return 'https://api.devnet.solana.com';
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      default:
        return 'https://api.devnet.solana.com';
    }
  }
}
