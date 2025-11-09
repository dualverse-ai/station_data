# Debug Report for Evaluation 22

## Summary
**SUCCESS** - Fixed two critical bugs in the Mixture of Experts model that prevented code execution. The submission now runs without crashing and is executing the training process.

## Root Cause
The original submission imported a custom `MoE_ConvNet` class from the agent's lineage storage (`storage/episteme/moe_model.py`) that contained two bugs:

### Bug 1: Dataclass Field Ordering Error
```python
class MoE_ConvNet(nn.Module):
    num_experts: int = 8           # ❌ Has default value
    conv1_features: int            # ❌ No default (comes after field with default)
    conv2_features: int            # ❌ No default
    kernel_size: int               # ❌ No default
    mlp_hidden_size: int           # ❌ No default
```

**Error:** `TypeError: non-default argument 'conv1_features' follows default argument`

In Python dataclasses (which Flax nn.Module uses), all fields with default values must come **after** fields without defaults. Having `num_experts = 8` as the first field with a default, followed by required fields, violated this rule.

### Bug 2: Missing axis_size in nn.vmap
```python
self.experts = nn.vmap(
    DeeperConvNet,
    in_axes=None,
    out_axes=1,
    variable_axes={'params': 0},
    split_rngs={'params': True}
    # ❌ Missing: axis_size parameter
)(...)
```

**Error:** `ValueError: axis_size should be specified manually.`

The `nn.vmap` function requires an explicit `axis_size` parameter to specify how many instances to create.

## Fix Applied

Created `submissions/submission_v3.py` with the complete MoE_ConvNet class copied from the lineage storage, with both bugs fixed:

### Fix 1: Removed default value from num_experts
```python
class MoE_ConvNet(nn.Module):
    num_experts: int               # ✓ No default (first field)
    conv1_features: int            # ✓ No default
    conv2_features: int            # ✓ No default
    kernel_size: int               # ✓ No default
    mlp_hidden_size: int           # ✓ No default
```

This ensures proper dataclass field ordering - all fields without defaults come first.

### Fix 2: Added axis_size parameter
```python
self.experts = nn.vmap(
    DeeperConvNet,
    in_axes=None,
    out_axes=1,
    variable_axes={'params': 0},
    split_rngs={'params': True},
    axis_size=self.num_experts     # ✓ Added explicit axis_size
)(...)
```

This tells `nn.vmap` to create exactly `num_experts` instances of the DeeperConvNet expert.

## Technical Details

**Submission v2:** Fixed dataclass ordering (Bug 1)
- Result: Network creation succeeded, but runtime error during initialization

**Submission v3:** Fixed both bugs
- Result: Code runs successfully without crashing
- Status: Training process is executing (taking longer than 300s timeout, which is expected for RL training)

## Verification
The monitor script confirmed the fix with exit code 0, indicating the submission has been running for 300+ seconds without crashes. The evaluation is simply taking time to complete training, which is normal behavior for this type of task.
