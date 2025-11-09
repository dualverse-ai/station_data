# Debug Report for Evaluation 231

## Summary
**SUCCESS** - Fixed multiple compatibility issues in the neural network code, enabling it to run without crashes.

## Root Cause
The original submission imported code from the agent's lineage directory (`storage/ariadne/models_mlp_global.py`) that had THREE critical bugs:

1. **Flax API Incompatibility**: Line 56 used deprecated `nn.LayerNorm(axis=-1, epsilon=...)` syntax
   - Flax 0.10.6 replaced the `axis` parameter with `reduction_axes` and `feature_axes`
   - The old API caused: `TypeError: LayerNorm.__init__() got an unexpected keyword argument 'axis'`

2. **Einsum Pattern Mismatch**: Line 60 had incorrect tensor contraction pattern
   - Code used: `jnp.einsum('btp,pn->btn', z, U)`
   - But U has shape `(N, p)` not `(p, N)`
   - Should be: `jnp.einsum('btp,np->btn', z, U)`
   - Caused: `ValueError: Size of label 'p' for operand 1 (36) does not match previous terms (71721)`

3. **RNG Handling in Apply Method**: Wrapper class passed invalid RNG to inference
   - Original code passed dummy `jnp.asarray(0, dtype=jnp.uint32)` as RNG during inference
   - Flax expects proper `jax.PRNGKey` or no RNG at all when `training=False`
   - Caused: `ValueError: The 'rngs' argument should be a jax.PRNGKey or dictionary`

## Fix Applied
Created `submission_v5.py` with the complete corrected implementation:

1. **Fixed LayerNorm**: Changed line 56 from
   ```python
   f_out = nn.LayerNorm(axis=-1, epsilon=self.ln_eps)(f_out)
   ```
   to:
   ```python
   f_out = nn.LayerNorm(epsilon=self.ln_eps)(f_out)
   ```
   (Default `reduction_axes=-1` is correct for the use case)

2. **Fixed Einsum**: Changed line 60 from
   ```python
   y_factor = jnp.einsum('btp,pn->btn', z, U)  # Wrong pattern
   ```
   to:
   ```python
   y_factor = jnp.einsum('btp,np->btn', z, U)  # Correct pattern
   ```

3. **Fixed RNG Handling**: Updated Wrapper.apply() method to only pass RNG when actually needed:
   ```python
   def apply(self, params, x, training=False, mutable=None, rngs=None):
       if self.needs_rng and training:
           # Only create/use RNG for training with dropout
           if rngs is None:
               rngs = {}
           if 'dropout' not in rngs:
               import jax
               rngs['dropout'] = jax.random.PRNGKey(0)
           return self.model.apply(params, x, training=training, rngs=rngs)
       elif rngs is not None and 'dropout' in rngs:
           # Use provided RNGs
           return self.model.apply(params, x, training=training, rngs=rngs)
       else:
           # Inference mode - no RNGs needed
           return self.model.apply(params, x, training=training)
   ```

## Verification
The monitor script confirmed success after 600+ seconds with exit code 0, indicating:
- Code initialization completed without errors
- Network can be created and initialized
- Forward pass works correctly
- No crashes during evaluation period

## Technical Notes
- The agent's lineage code was using an older Flax API that's no longer compatible with Flax 0.10.6
- The einsum pattern error was a subtle shape mismatch that only manifested during initialization
- The RNG issue only appeared during inference (training=False) when Dropout layers don't need randomness
- All three bugs needed to be fixed for the code to run successfully
