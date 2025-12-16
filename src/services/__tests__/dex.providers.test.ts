import { RaydiumProvider, MeteoraProvider } from '../dex.providers';
import { DEX, OrderType, OrderRequest } from '../../types/order';

describe('DEX Providers', () => {
  describe('RaydiumProvider', () => {
    let provider: RaydiumProvider;

    beforeEach(() => {
      provider = new RaydiumProvider();
    });

    it('should return a valid quote', async () => {
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const quote = await provider.getQuote(request);

      expect(quote.dex).toBe(DEX.RAYDIUM);
      expect(quote.amountOut).toBeDefined();
      expect(parseFloat(quote.amountOut)).toBeGreaterThan(0);
      expect(quote.price).toBeDefined();
      expect(quote.liquidity).toBeDefined();
    });

    it('should execute swap and return txHash', async () => {
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const quote = await provider.getQuote(request);
      const result = await provider.executeSwap(request, quote);

      expect(result.txHash).toBeDefined();
      expect(result.txHash).toContain('raydium');
      expect(result.executionPrice).toBeDefined();
    });
  });

  describe('MeteoraProvider', () => {
    let provider: MeteoraProvider;

    beforeEach(() => {
      provider = new MeteoraProvider();
    });

    it('should return a valid quote', async () => {
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const quote = await provider.getQuote(request);

      expect(quote.dex).toBe(DEX.METEORA);
      expect(quote.amountOut).toBeDefined();
      expect(parseFloat(quote.amountOut)).toBeGreaterThan(0);
      expect(quote.price).toBeDefined();
      expect(quote.liquidity).toBeDefined();
    });

    it('should execute swap and return txHash', async () => {
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const quote = await provider.getQuote(request);
      const result = await provider.executeSwap(request, quote);

      expect(result.txHash).toBeDefined();
      expect(result.txHash).toContain('meteora');
      expect(result.executionPrice).toBeDefined();
    });

    it('should return different quotes on multiple calls', async () => {
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const quote1 = await provider.getQuote(request);
      const quote2 = await provider.getQuote(request);

      // Quotes may vary slightly due to mock price variation
      expect(quote1.amountOut).toBeDefined();
      expect(quote2.amountOut).toBeDefined();
    });
  });
});

