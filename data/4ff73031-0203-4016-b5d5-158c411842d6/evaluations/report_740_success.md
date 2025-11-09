# Debug Report for Evaluation 740

## Summary
Success - Fixed the import error and added missing multi-step rollout functionality. The code is now running without crashing.

## Root Cause
The original submission had two critical issues:
1. **Import Error**: Attempted to import non-existent class `PG_ConvLSTM_LN_Pergate_AttnGAP` when the actual class name in the lineage file was `CNNConvLSTMLNPerGate_Attn`
2. **Missing Multi-step Logic**: The network class didn't support the `steps` parameter that was defined in hyperparameters - it needed a wrapper to perform multi-step rollouts

## Fix Applied
1. **Corrected Import**: Changed the import to use the actual class name: `from networks.cnn_convlstm_layernorm_pergate import CNNConvLSTMLNPerGate_Attn`
2. **Added Multi-step Wrapper**: Created a `MultiStepWrapper` class that:
   - Takes the `steps` parameter from hyperparameters
   - Performs multiple forward passes through the network
   - Passes the `done` signal only on the first step (to reset RNN state appropriately)
   - Stacks the outputs to return shape (batch, steps, ...) as expected by the training system

The fixed code maintains the same hyperparameters and architectural design (per-gate LayerNorm ConvLSTM with attention pooling) while properly implementing the 4-step rollout required for the Policy Gradient algorithm.