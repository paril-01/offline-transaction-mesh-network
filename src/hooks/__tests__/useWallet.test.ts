import { renderHook, act } from '@testing-library/react-hooks';
import { useWallet } from '../useWallet';

describe('useWallet', () => {
  it('should initialize wallet state', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current).toHaveProperty('provider');
    expect(result.current).toHaveProperty('signer');
    expect(result.current).toHaveProperty('address');
    expect(result.current).toHaveProperty('isConnected');
    expect(result.current).toHaveProperty('connect');
  });
});
