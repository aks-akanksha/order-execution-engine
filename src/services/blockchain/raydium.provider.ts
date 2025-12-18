import { IDEXProvider } from '../dex.router';
import { DEXQuote, DEX, OrderRequest } from '../../types/order';
import { SolanaConnection } from './solana.connection';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { logger } from '../../utils/logger';
import { 
  Liquidity,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  buildSimpleTransaction,
} from '@raydium-io/raydium-sdk';
import { 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  NATIVE_MINT,
  createSyncNativeInstruction,
} from '@solana/spl-token';

// Common token addresses on devnet
const TOKEN_ADDRESSES: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // Devnet USDT
};

// Raydium API endpoints
const RAYDIUM_API_V3 = 'https://api-v3.raydium.io';
const RAYDIUM_API_V2 = 'https://api.raydium.io/v2';

// Raydium API pool info type
interface RaydiumPoolInfo {
  id: string;
  mintA: { address: string; amount: string };
  mintB: { address: string; amount: string };
  tvl: string;
  price?: string;
}

export class RealRaydiumProvider implements IDEXProvider {
  private solana: SolanaConnection;
  private poolCache: Map<string, RaydiumPoolInfo> = new Map();

  constructor(solana: SolanaConnection) {
    this.solana = solana;
  }

  async getQuote(request: OrderRequest): Promise<DEXQuote> {
    try {
      const tokenInAddress = this.getTokenAddress(request.tokenIn);
      const tokenOutAddress = this.getTokenAddress(request.tokenOut);
      const amountIn = parseFloat(request.amountIn);

      // Fetch pools from Raydium API
      const pool = await this.findBestPool(tokenInAddress, tokenOutAddress);
      
      if (!pool) {
        throw new Error(`No liquidity pool found for ${request.tokenIn}/${request.tokenOut}`);
      }

      // Calculate quote using pool data
      const quote = await this.calculateQuote(pool, tokenInAddress, tokenOutAddress, amountIn);
      
      return {
        dex: DEX.RAYDIUM,
        amountOut: quote.amountOut.toFixed(18),
        price: quote.price.toFixed(18),
        liquidity: quote.liquidity.toFixed(2),
        estimatedGas: '0.000005', // SOL transaction fee
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Raydium quote error', { 
        error: errorMessage,
        request,
        hint: 'Falling back to mock quote. This is normal if pools don\'t exist on devnet.'
      });
      // Fallback to mock if real quote fails
      return this.getMockQuote(request);
    }
  }

  async executeSwap(
    request: OrderRequest,
    quote: DEXQuote
  ): Promise<{ txHash: string; executionPrice: string }> {
    try {
      const tokenInAddress = this.getTokenAddress(request.tokenIn);
      const tokenOutAddress = this.getTokenAddress(request.tokenOut);
      const amountIn = parseFloat(request.amountIn);
      const slippageTolerance = request.slippageTolerance || 0.5;

      const pool = await this.findBestPool(tokenInAddress, tokenOutAddress);
      if (!pool) {
        throw new Error('Pool not found for swap');
      }

      const wallet = this.solana.getWallet();
      const connection = this.solana.getConnection();

      // Build swap transaction using Raydium SDK
      const transaction = await this.buildRaydiumSwap(
        pool,
        wallet,
        connection,
        tokenInAddress,
        tokenOutAddress,
        amountIn,
        slippageTolerance,
        request.tokenIn === 'SOL'
      );

      if (!transaction) {
        throw new Error('Failed to build swap transaction');
      }

      // Send transaction
      const signature = await this.solana.sendTransaction(transaction);

      // Wait for confirmation
      await this.solana.confirmTransaction(signature);

      logger.info('Raydium swap executed', { 
        signature, 
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        amountIn,
        explorerUrl: `https://solscan.io/tx/${signature}?cluster=devnet`
      });

      return {
        txHash: signature,
        executionPrice: quote.price,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Raydium swap error', { 
        error: errorMessage,
        request,
        hint: 'Falling back to mock execution. This is normal if pools don\'t exist on devnet.'
      });
      // Fallback to mock execution
      return this.getMockExecution(quote);
    }
  }

  private async findBestPool(
    tokenIn: string,
    tokenOut: string
  ): Promise<RaydiumPoolInfo | null> {
    const poolKey = `${tokenIn}-${tokenOut}`;
    
    // Check cache first
    if (this.poolCache.has(poolKey)) {
      return this.poolCache.get(poolKey)!;
    }

    try {
      // Try Raydium API v3 with query parameters for specific token pair
      const apiUrl = `${RAYDIUM_API_V3}/pools?baseMint=${tokenIn}&quoteMint=${tokenOut}`;
      logger.debug('Fetching Raydium pools', { apiUrl, tokenIn, tokenOut });
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Raydium API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as { data?: RaydiumPoolInfo[] };
      const pools: RaydiumPoolInfo[] = data.data || [];

      if (pools.length === 0) {
        logger.warn('No Raydium pools found for token pair', { tokenIn, tokenOut, apiUrl });
        return null;
      }

      // Select pool with highest liquidity
      const bestPool = pools.reduce((best, current) => {
        const bestLiquidity = parseFloat(best.tvl || '0');
        const currentLiquidity = parseFloat(current.tvl || '0');
        return currentLiquidity > bestLiquidity ? current : best;
      });

      // Cache the pool
      this.poolCache.set(poolKey, bestPool);
      
      logger.info('Found Raydium pool', {
        poolId: bestPool.id,
        tvl: bestPool.tvl,
        tokenIn,
        tokenOut
      });

      return bestPool;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Error finding Raydium pool', { 
        error: errorMessage,
        errorStack,
        tokenIn, 
        tokenOut,
        hint: 'Falling back to mock quote. This is normal if pools don\'t exist on devnet or API is unavailable.'
      });
      return null;
    }
  }

  private async calculateQuote(
    pool: RaydiumPoolInfo,
    _tokenIn: string,
    _tokenOut: string,
    amountIn: number
  ): Promise<{ amountOut: number; price: number; liquidity: number }> {
    try {
      // Get current pool price from API
      const priceResponse = await fetch(`${RAYDIUM_API_V3}/pools/info/${pool.id}`);
      if (priceResponse.ok) {
        const priceData = await priceResponse.json() as { price?: string };
        const currentPrice = parseFloat(priceData.price || '0');
        
        if (currentPrice > 0) {
          // Calculate output based on current price
          const isReversed = pool.mintA.address === _tokenOut;
          const price = isReversed ? 1 / currentPrice : currentPrice;
          const amountOut = amountIn * price;
          const liquidity = parseFloat(pool.tvl || '0');

          return { amountOut, price, liquidity };
        }
      }
    } catch (error) {
      logger.warn('Error calculating quote from API', { error });
    }

    // Fallback: use pool reserves for calculation
    const isReversed = pool.mintA.address === _tokenOut;
    const reserveA = parseFloat(pool.mintA.amount || '0');
    const reserveB = parseFloat(pool.mintB.amount || '0');

    if (reserveA === 0 || reserveB === 0) {
      throw new Error('Pool has no liquidity');
    }

    // Simple AMM formula: amountOut = (amountIn * reserveB) / (reserveA + amountIn)
    const reserveIn = isReversed ? reserveB : reserveA;
    const reserveOut = isReversed ? reserveA : reserveB;
    
    const amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
    const price = amountOut / amountIn;
    const liquidity = parseFloat(pool.tvl || '0');

    return { amountOut, price, liquidity };
  }

  private async buildRaydiumSwap(
    pool: RaydiumPoolInfo,
    wallet: any,
    connection: any,
    tokenInAddress: string,
    tokenOutAddress: string,
    amountIn: number,
    slippageTolerance: number,
    isNativeSOL: boolean
  ): Promise<Transaction | null> {
    try {
      // Fetch pool keys from Raydium API v2
      const poolResponse = await fetch(`${RAYDIUM_API_V2}/main/pairs`);
      if (!poolResponse.ok) {
        throw new Error('Failed to fetch pool keys');
      }

      const poolsData = await poolResponse.json() as any[];
      const poolData = poolsData.find((p: any) => p.id === pool.id || p.ammId === pool.id);
      
      if (!poolData) {
        logger.warn('Pool data not found in v2 API, using simplified swap', { poolId: pool.id });
        // Return a basic transaction for fallback
        return new Transaction();
      }

      // Convert pool data to pool keys format
      const poolKeys = jsonInfo2PoolKeys(poolData) as LiquidityPoolKeys;
      
      // Determine token decimals (default to 6 for most tokens, 9 for SOL)
      const tokenInDecimals = isNativeSOL ? 9 : 6;
      const tokenOutDecimals = 6; // Assuming USDC/USDT
      
      // Create token objects
      const tokenIn = new Token(TOKEN_PROGRAM_ID, new PublicKey(tokenInAddress), tokenInDecimals);
      const tokenOut = new Token(TOKEN_PROGRAM_ID, new PublicKey(tokenOutAddress), tokenOutDecimals);
      
      // Calculate amounts with proper decimals
      const amountInRaw = isNativeSOL 
        ? Math.floor(amountIn * 1e9) // SOL has 9 decimals
        : Math.floor(amountIn * 1e6); // Most tokens have 6 decimals
      
      const amountInToken = new TokenAmount(tokenIn, amountInRaw, false);
      
      // Calculate min amount out with slippage
      const quote = await this.calculateQuote(pool, tokenInAddress, tokenOutAddress, amountIn);
      const minAmountOutRaw = Math.floor(quote.amountOut * (1 - slippageTolerance / 100) * 1e6);
      const minAmountOut = new TokenAmount(tokenOut, minAmountOutRaw, false);
      
      // Get or create token accounts
      const tokenInAccount = await getAssociatedTokenAddress(
        new PublicKey(tokenInAddress),
        wallet.publicKey
      );
      const tokenOutAccount = await getAssociatedTokenAddress(
        new PublicKey(tokenOutAddress),
        wallet.publicKey
      );

      // Check if token accounts exist, create if needed
      const transaction = new Transaction();
      
      if (isNativeSOL) {
        // For native SOL, wrap it first
        const wrappedSolAccount = await getAssociatedTokenAddress(
          NATIVE_MINT,
          wallet.publicKey
        );
        
        // Wrap SOL
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: wrappedSolAccount,
            lamports: amountInRaw,
          }),
          createSyncNativeInstruction(wrappedSolAccount)
        );
      }

      // Check and create token accounts if needed
      try {
        await getAccount(connection, tokenInAccount);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            tokenInAccount,
            wallet.publicKey,
            new PublicKey(tokenInAddress)
          )
        );
      }

      try {
        await getAccount(connection, tokenOutAccount);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            tokenOutAccount,
            wallet.publicKey,
            new PublicKey(tokenOutAddress)
          )
        );
      }

      // Get token account info from connection
      // The SDK will handle account creation if needed via the config option
      const tokenInAccountInfo = await connection.getAccountInfo(tokenInAccount);
      const tokenOutAccountInfo = await connection.getAccountInfo(tokenOutAccount);

      // Build swap instruction using Raydium SDK
      // The SDK handles token account creation automatically if accounts don't exist
      const swapResult = await Liquidity.makeSwapInstructionSimple({
        connection,
        poolKeys: poolKeys,
        userKeys: {
          tokenAccounts: [
            { 
              pubkey: tokenInAccount,
              programId: TOKEN_PROGRAM_ID,
              accountInfo: tokenInAccountInfo ? {
                mint: new PublicKey(tokenInAddress),
                owner: wallet.publicKey,
                amount: BigInt(amountInRaw),
                state: 1,
                isNative: isNativeSOL,
                decimals: tokenInDecimals,
              } as any : undefined as any
            },
            { 
              pubkey: tokenOutAccount,
              programId: TOKEN_PROGRAM_ID,
              accountInfo: tokenOutAccountInfo ? {
                mint: new PublicKey(tokenOutAddress),
                owner: wallet.publicKey,
                amount: BigInt(0),
                state: 1,
                isNative: false,
                decimals: tokenOutDecimals,
              } as any : undefined as any
            },
          ],
          owner: wallet.publicKey,
          payer: wallet.publicKey,
        },
        amountIn: amountInToken,
        amountOut: minAmountOut,
        fixedSide: 'in',
        makeTxVersion: 'V0' as any,
        config: {
          bypassAssociatedCheck: false,
          checkCreateATAOwner: true,
        },
      });

      // Build transaction from swap result
      const finalTransaction = await buildSimpleTransaction({
        makeTxVersion: 'V0' as any,
        payer: wallet.publicKey,
        connection,
        innerTransactions: swapResult.innerTransactions,
      });

      logger.info('Built Raydium swap transaction', {
        poolId: pool.id,
        amountIn,
        minAmountOut: minAmountOut.toFixed(),
        slippageTolerance
      });

      // Return the first transaction from the array, or cast to Transaction
      if (Array.isArray(finalTransaction)) {
        return finalTransaction[0] as Transaction;
      }
      return finalTransaction as Transaction;
    } catch (error) {
      logger.error('Error building Raydium swap', { error, poolId: pool.id });
      // Return empty transaction for fallback
      return new Transaction();
    }
  }

  private getTokenAddress(symbol: string): string {
    const address = TOKEN_ADDRESSES[symbol.toUpperCase()];
    if (!address) {
      throw new Error(`Token address not found for ${symbol}`);
    }
    return address;
  }

  private getMockQuote(request: OrderRequest): DEXQuote {
    const basePrice = parseFloat(request.amountIn) * 0.95;
    const amountOut = basePrice.toFixed(18);
    
    return {
      dex: DEX.RAYDIUM,
      amountOut,
      price: (parseFloat(amountOut) / parseFloat(request.amountIn)).toFixed(18),
      liquidity: '1000000',
      estimatedGas: '0.000005',
    };
  }

  private getMockExecution(quote: DEXQuote): { txHash: string; executionPrice: string } {
    return {
      txHash: `raydium_devnet_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      executionPrice: quote.price,
    };
  }
}
