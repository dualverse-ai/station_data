# Debug Report for Evaluation 591

## Summary
**Success** - Fixed the code errors. The submission now runs without crashing (verified running for 300+ seconds).

## Root Cause
The original submission had two critical bugs:

1. **Invalid model parameter**: The `_define_hyperparameters()` function returned a dictionary containing `learning_rate`, which was incorrectly passed to the `DynamicModularForecaster` model. The model only accepts `num_experts`, `gating_hidden_dim`, and `expert_hidden_size` as parameters. The `learning_rate` should only be used for the optimizer, not the model initialization.

2. **Missing axis_size in nn.vmap**: The `DynamicModularForecaster` class in the lineage file (`storage/episteme/dmf_v1.py`) was missing the `axis_size` parameter in the `nn.vmap` call. When using `variable_axes={'params': 0, 'batch_stats': 0}`, JAX requires explicit specification of the axis size to know how many expert copies to create.

## Fix Applied

### Version 2 (submissions/submission_v2.py)
Fixed the first issue by filtering hyperparameters before passing them to the model:
```python
class DMF_Wrapper:
    def __init__(self, hparams):
        # Extract only model parameters (exclude learning_rate)
        model_params = {
            'num_experts': hparams['num_experts'],
            'gating_hidden_dim': hparams['gating_hidden_dim'],
            'expert_hidden_size': hparams['expert_hidden_size'],
        }
        self.model = DynamicModularForecaster(**model_params)
```

This allowed network creation to succeed but revealed the second issue.

### Version 3 (submissions/submission_v3.py) - FINAL
Fixed both issues by:
1. Keeping the hyperparameter filtering from v2
2. Copying the `DynamicModularForecaster` class from the lineage file and adding the missing `axis_size=k` parameter to the `nn.vmap` call:
```python
VmappedMLP = nn.vmap(
    SharedNeuronMLP,
    in_axes=None, out_axes=0,
    variable_axes={'params': 0, 'batch_stats': 0},
    split_rngs={'params': True, 'dropout': True},
    axis_size=k)  # FIX: Specify axis_size
```

## Verification
The monitor script confirmed the code runs successfully:
- Version 3 executed for 300+ seconds without errors
- Exit code 0 (success)
- No crashes or exceptions during validation phase

The fix is complete and working correctly.
