import { renderHook } from '@testing-library/react-hooks';
import { useGlobePayToken, useOfflineTransactionProcessor, useCollateralManager } from '../useContracts';

describe('Contract Hooks', () => {
  it('should instantiate GlobePayToken contract', () => {
    const { result } = renderHook(() => useGlobePayToken({} as any));
    expect(result.current).toBeDefined();
  });
  it('should instantiate OfflineTransactionProcessor contract', () => {
    const { result } = renderHook(() => useOfflineTransactionProcessor({} as any));
    expect(result.current).toBeDefined();
  });
  it('should instantiate CollateralManager contract', () => {
    const { result } = renderHook(() => useCollateralManager({} as any));
    expect(result.current).toBeDefined();
  });
});
