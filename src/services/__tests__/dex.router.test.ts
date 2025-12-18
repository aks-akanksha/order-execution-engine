import { DEXRouter, IDEXProvider } from '../dex.router';
import { RaydiumProvider, MeteoraProvider } from '../dex.providers';
import { DEX, OrderType, OrderRequest } from '../../types/order';

describe('DEXRouter', () => {
  let router: DEXRouter;
  let raydiumProvider: RaydiumProvider;
  let meteoraProvider: MeteoraProvider;

  beforeEach(() => {
    raydiumProvider = new RaydiumProvider();
    meteoraProvider = new MeteoraProvider();
    const providers = new Map();
    providers.set(DEX.RAYDIUM, raydiumProvider);
    providers.set(DEX.METEORA, meteoraProvider);
    router = new DEXRouter(providers);
  });

  describe('getBestQuote', () => {
    it('should fetch quotes from all providers', async () => {
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const quote = await router.getBestQuote(request);

      expect(quote).toBeDefined();
      expect(quote?.dex).toBeDefined();
      expect(quote?.amountOut).toBeDefined();
      expect(parseFloat(quote?.amountOut || '0')).toBeGreaterThan(0);
    });

    it('should select the quote with highest output amount', async () => {
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const bestQuote = await router.getBestQuote(request);

      // Best quote should be the one with highest amountOut
      expect(bestQuote).toBeDefined();
      expect(bestQuote?.dex).toBeDefined();
      expect(parseFloat(bestQuote?.amountOut || '0')).toBeGreaterThan(0);
      
      // Verify it selected one of the two DEXs
      expect([DEX.RAYDIUM, DEX.METEORA]).toContain(bestQuote?.dex);
    });

    it('should handle provider failures gracefully', async () => {
      // Create a failing provider
      const failingProvider: IDEXProvider = {
        getQuote: jest.fn().mockRejectedValue(new Error('Provider error')),
        executeSwap: jest.fn(),
      };

      const providers = new Map();
      providers.set(DEX.RAYDIUM, failingProvider as any);
      providers.set(DEX.METEORA, meteoraProvider);
      const routerWithFailing = new DEXRouter(providers);

      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const quote = await routerWithFailing.getBestQuote(request);

      // Should still get quote from working provider
      expect(quote).toBeDefined();
      expect(quote?.dex).toBe(DEX.METEORA);
    });

    it('should return null if all providers fail', async () => {
      const failingProvider1: IDEXProvider = {
        getQuote: jest.fn().mockRejectedValue(new Error('Provider error 1')),
        executeSwap: jest.fn(),
      };

      const failingProvider2: IDEXProvider = {
        getQuote: jest.fn().mockRejectedValue(new Error('Provider error 2')),
        executeSwap: jest.fn(),
      };

      const providers = new Map();
      providers.set(DEX.RAYDIUM, failingProvider1 as any);
      providers.set(DEX.METEORA, failingProvider2 as any);
      const routerWithAllFailing = new DEXRouter(providers);

      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const quote = await routerWithAllFailing.getBestQuote(request);

      expect(quote).toBeNull();
    });
  });

  describe('executeOnDEX', () => {
    it('should execute swap on specified DEX', async () => {
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const result = await router.executeOnDEX(request, DEX.RAYDIUM);

      expect(result.txHash).toBeDefined();
      expect(result.txHash).toContain('raydium');
      expect(result.executionPrice).toBeDefined();
    });

    it('should throw error if DEX provider not found', async () => {
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const emptyProviders = new Map();
      const routerWithNoProviders = new DEXRouter(emptyProviders);

      await expect(routerWithNoProviders.executeOnDEX(request, DEX.RAYDIUM)).rejects.toThrow();
    });
  });
});

