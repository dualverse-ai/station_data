# Debug Report for Evaluation 351

## Summary
**SUCCESS** - The submission code now runs without crashing. All bugs have been fixed through submission_v5.py.

## Root Cause
The original submission (evaluation 351) had multiple API compatibility issues with Flax/JAX:

1. **Bug #1 - Unexpected rng_key parameter**: `DSConvFeatureExtractor.__call__()` was being called with an `rng_key` parameter that it didn't accept (line 89 in original).

2. **Bug #2 - Missing Flax GRU module**: The code used `nn.GRU()` which doesn't exist in Flax. Flax only provides `nn.GRUCell` and `nn.RNN` for recurrent layers.

3. **Bug #3 - Incorrect initialize_carry signature**: Attempted to call `GRUCell.initialize_carry()` with 3 arguments when it only accepts 2 (rng and input_shape).

4. **Bug #4 - Incorrect RNN usage**: Tried to call `rnn(carry, inputs)` when the correct API is `rnn(inputs)` with optional `initial_carry` keyword argument.

5. **Bug #5 - Missing RNG collections for Dropout**: During training (deterministic=False), Flax's `nn.Dropout` requires RNG keys to be provided via the `rngs` parameter in `apply()`, not via a direct `rng_key` parameter.

## Fix Applied

### submission_v2.py
- Fixed bug #1 by removing the `rng_key` parameter from the `feature_extractor()` call

### submission_v3.py
- Fixed bug #2 by replacing `nn.GRU()` with `nn.GRUCell()` and `nn.RNN()`

### submission_v4.py
- Fixed bug #3 and #4 by using proper Flax RNN API:
  - Removed manual `initialize_carry()` calls (RNN auto-initializes)
  - Changed to `rnn(inputs, return_carry=True)` which returns `(final_carry, all_outputs)`
  - Used only the final carry state for bidirectional concatenation

### submission_v5.py (FINAL WORKING VERSION)
- Fixed bug #5 by correcting the `DSConvMoENetworkWrapper`:
  - **init()**: Changed to use proper RNG collection names in the init dict
  - **apply()**: Split behavior based on `deterministic` flag:
    - When `deterministic=True`: No RNG collections needed
    - When `deterministic=False`: Provide `rngs={'dropout': key, 'gumbel': key}` parameter
  - Removed the unused `rng_key` parameter from internal model calls
  - Used `self.make_rng('gumbel')` in the gating network for proper RNG handling

The key insight was understanding that Flax modules with stochastic operations (Dropout, Gumbel sampling) need RNG keys provided through the `rngs` parameter during `apply()`, not as direct function arguments.

## Verification
The monitor script confirmed that submission_v5.py runs successfully:
- ✅ Validation phase completed (all 7 datasets)
- ✅ Training phase started without crashes
- ✅ Code ran for 300+ seconds without errors (monitor timeout exceeded)

The evaluation is now running to completion in the background and will produce final scores when training finishes.
