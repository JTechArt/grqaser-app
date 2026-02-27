import {withTimeout} from '../../src/utils/timeout';

describe('withTimeout', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves when promise completes before timeout', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('rejects when promise exceeds timeout', async () => {
    jest.useFakeTimers();

    const pending = new Promise<string>(() => {});
    const timeoutPromise = withTimeout(pending, 500, 'Timed out');

    jest.advanceTimersByTime(500);
    await expect(timeoutPromise).rejects.toThrow('Timed out');
  });
});
