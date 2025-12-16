import { DEXQuote, DEX, OrderRequest } from '../types/order';

export interface IDEXProvider {
  getQuote(request: OrderRequest): Promise<DEXQuote>;
  executeSwap(request: OrderRequest, quote: DEXQuote): Promise<{ txHash: string; executionPrice: string }>;
}

export class DEXRouter {
  private providers: Map<DEX, IDEXProvider>;

  constructor(providers: Map<DEX, IDEXProvider>) {
    this.providers = providers;
  }

  async getBestQuote(request: OrderRequest): Promise<DEXQuote | null> {
    const quotes: DEXQuote[] = [];

    // Fetch quotes from all providers concurrently
    const quotePromises = Array.from(this.providers.entries()).map(async ([dex, provider]) => {
      try {
        const quote = await provider.getQuote(request);
        return quote;
      } catch (error) {
        console.error(`Error fetching quote from ${dex}:`, error);
        return null;
      }
    });

    const results = await Promise.all(quotePromises);
    quotes.push(...results.filter((q): q is DEXQuote => q !== null));

    if (quotes.length === 0) {
      return null;
    }

    // Select best quote based on output amount (best price)
    const bestQuote = quotes.reduce((best, current) => {
      const bestAmount = parseFloat(best.amountOut);
      const currentAmount = parseFloat(current.amountOut);
      return currentAmount > bestAmount ? current : best;
    });

    console.log(`DEX Routing Decision: Selected ${bestQuote.dex} with output ${bestQuote.amountOut}`);
    console.log(`All quotes:`, quotes.map(q => `${q.dex}: ${q.amountOut}`).join(', '));

    return bestQuote;
  }

  async executeOnDEX(
    request: OrderRequest,
    dex: DEX
  ): Promise<{ txHash: string; executionPrice: string }> {
    const provider = this.providers.get(dex);
    if (!provider) {
      throw new Error(`Provider not found for DEX: ${dex}`);
    }

    const quote = await provider.getQuote(request);
    return await provider.executeSwap(request, quote);
  }
}

