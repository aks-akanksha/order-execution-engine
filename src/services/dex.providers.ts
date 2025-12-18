import { IDEXProvider, DEXRouter } from './dex.router';
import { DEXQuote, DEX, OrderRequest } from '../types/order';

// Mock Raydium Provider
export class RaydiumProvider implements IDEXProvider {
  async getQuote(request: OrderRequest): Promise<DEXQuote> {
    // Simulate network latency (500-1500ms)
    await this.delay(Math.random() * 1000 + 500);

    // Mock price calculation with some variation
    const basePrice = parseFloat(request.amountIn) * 0.95; // 5% spread
    const priceVariation = 1 + (Math.random() * 0.02 - 0.01); // ±1% variation
    const amountOut = (basePrice * priceVariation).toFixed(18);

    return {
      dex: DEX.RAYDIUM,
      amountOut,
      price: (parseFloat(amountOut) / parseFloat(request.amountIn)).toFixed(18),
      liquidity: (Math.random() * 1000000 + 500000).toFixed(2),
      estimatedGas: '0.001',
    };
  }

  async executeSwap(
    _request: OrderRequest,
    quote: DEXQuote
  ): Promise<{ txHash: string; executionPrice: string }> {
    // Simulate transaction building and submission (1-2 seconds)
    await this.delay(Math.random() * 1000 + 1000);

    // Mock transaction hash
    const txHash = `raydium_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      txHash,
      executionPrice: quote.price,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Mock Meteora Provider
export class MeteoraProvider implements IDEXProvider {
  async getQuote(request: OrderRequest): Promise<DEXQuote> {
    // Simulate network latency (500-1500ms)
    await this.delay(Math.random() * 1000 + 500);

    // Mock price calculation with different variation than Raydium
    const basePrice = parseFloat(request.amountIn) * 0.96; // 4% spread (slightly better)
    const priceVariation = 1 + (Math.random() * 0.03 - 0.015); // ±1.5% variation
    const amountOut = (basePrice * priceVariation).toFixed(18);

    return {
      dex: DEX.METEORA,
      amountOut,
      price: (parseFloat(amountOut) / parseFloat(request.amountIn)).toFixed(18),
      liquidity: (Math.random() * 1200000 + 400000).toFixed(2),
      estimatedGas: '0.0012',
    };
  }

  async executeSwap(
    _request: OrderRequest,
    quote: DEXQuote
  ): Promise<{ txHash: string; executionPrice: string }> {
    // Simulate transaction building and submission (1-2 seconds)
    await this.delay(Math.random() * 1000 + 1000);

    // Mock transaction hash
    const txHash = `meteora_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      txHash,
      executionPrice: quote.price,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Factory function to create DEX router with all providers
export function createDEXRouter(): DEXRouter {
  const providers = new Map<DEX, IDEXProvider>();
  const useRealBlockchain = process.env.USE_REAL_BLOCKCHAIN === 'true';
  const network = (process.env.SOLANA_NETWORK as 'devnet' | 'mainnet-beta' | 'testnet') || 'devnet';

  if (useRealBlockchain) {
    // Use real blockchain providers
    const { SolanaConnection } = require('./blockchain/solana.connection');
    const { RealRaydiumProvider } = require('./blockchain/raydium.provider');
    const { RealMeteoraProvider } = require('./blockchain/meteora.provider');

    const solana = new SolanaConnection(network);
    providers.set(DEX.RAYDIUM, new RealRaydiumProvider(solana));
    providers.set(DEX.METEORA, new RealMeteoraProvider(solana));
  } else {
    // Use mock providers (default)
    providers.set(DEX.RAYDIUM, new RaydiumProvider());
    providers.set(DEX.METEORA, new MeteoraProvider());
  }

  return new DEXRouter(providers);
}

