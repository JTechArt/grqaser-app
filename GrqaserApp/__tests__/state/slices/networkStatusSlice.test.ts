import networkStatusReducer, {
  setConnected,
  dismissRestored,
} from '../../../src/state/slices/networkStatusSlice';

describe('networkStatusSlice', () => {
  it('starts with null isConnected and false showRestored', () => {
    const state = networkStatusReducer(undefined, {type: 'init'});
    expect(state.isConnected).toBeNull();
    expect(state.showRestored).toBe(false);
  });

  it('setConnected updates isConnected', () => {
    const state = networkStatusReducer(undefined, setConnected(true));
    expect(state.isConnected).toBe(true);
    expect(state.showRestored).toBe(false);
  });

  it('setConnected offline clears showRestored', () => {
    let state = networkStatusReducer(undefined, setConnected(false));
    state = networkStatusReducer(state, setConnected(true));
    expect(state.showRestored).toBe(true);
    state = networkStatusReducer(state, setConnected(false));
    expect(state.showRestored).toBe(false);
  });

  it('setConnected offline->online sets showRestored', () => {
    let state = networkStatusReducer(undefined, setConnected(false));
    state = networkStatusReducer(state, setConnected(true));
    expect(state.showRestored).toBe(true);
  });

  it('dismissRestored clears showRestored', () => {
    let state = networkStatusReducer(undefined, setConnected(false));
    state = networkStatusReducer(state, setConnected(true));
    expect(state.showRestored).toBe(true);
    state = networkStatusReducer(state, dismissRestored());
    expect(state.showRestored).toBe(false);
  });
});
