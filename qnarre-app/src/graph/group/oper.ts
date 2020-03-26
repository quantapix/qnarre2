import * as qg from './graph';
import * as qs from './slim';
import * as qp from './params';

export interface CompatibilityProvider {
  valid: (n: qg.Noper) => boolean;
}

export class TpuCompatibility implements CompatibilityProvider {
  static readonly WHITELIST = [
    'Abs',
    'Acos',
    'Acosh',
    'Add',
    'AddN',
    'AdjustContrastv2',
    'AdjustHue',
    'AdjustSaturation',
    'All',
    'Angle',
    'Any',
    'ApproximateEqual',
    'ArgMax',
    'ArgMin',
    'Asin',
    'Asinh',
    'Assert',
    'AssignAddVariableOp',
    'AssignSubVariableOp',
    'AssignVariableOp',
    'Atan',
    'Atan2',
    'Atanh',
    'AvgPool',
    'AvgPool3D',
    'AvgPool3DGrad',
    'AvgPoolGrad',
    'BatchMatMul',
    'BatchToSpace',
    'BatchToSpaceND',
    'BiasAdd',
    'BiasAddGrad',
    'BiasAddV1',
    'Bitcast',
    'BitwiseAnd',
    'BitwiseOr',
    'BitwiseXor',
    'BroadcastArgs',
    'BroadcastGradientArgs',
    'Bucketize',
    'Cast',
    'Ceil',
    'CheckNumerics',
    'Cholesky',
    'ClipByValue',
    'Complex',
    'ComplexAbs',
    'Concat',
    'ConcatOffset',
    'ConcatV2',
    'Conj',
    'ConjugateTranspose',
    'Const',
    'ControlTrigger',
    'Conv2D',
    'Conv2DBackpropFilter',
    'Conv2DBackpropInput',
    'Conv3D',
    'Conv3DBackpropFilterV2',
    'Conv3DBackpropInputV2',
    'Cos',
    'Cosh',
    'Cross',
    'CrossReplicaSum',
    'Cumprod',
    'Cumsum',
    'DepthToSpace',
    'DepthwiseConv2dNative',
    'DepthwiseConv2dNativeBackpropFilter',
    'DepthwiseConv2dNativeBackpropInput',
    'Diag',
    'DiagPart',
    'Digamma',
    'Div',
    'DynamicStitch',
    'Elu',
    'EluGrad',
    'Empty',
    'Equal',
    'Erf',
    'Erfc',
    'Exp',
    'ExpandDims',
    'Expm1',
    'ExtractImagePatches',
    'FFT',
    'FFT2D',
    'FFT3D',
    'FakeQuantWithMinMaxArgs',
    'FakeQuantWithMinMaxArgsGradient',
    'FakeQuantWithMinMaxVars',
    'FakeQuantWithMinMaxVarsGradient',
    'Fill',
    'Floor',
    'FloorDiv',
    'FloorMod',
    'FusedBatchNorm',
    'FusedBatchNormGrad',
    'FusedBatchNormGradV2',
    'FusedBatchNormV2',
    'Gather',
    'GatherNd',
    'GatherV2',
    'GetItem',
    'Greater',
    'GreaterEqual',
    'HSVToRGB',
    'IFFT',
    'IFFT2D',
    'IFFT3D',
    'IRFFT',
    'IRFFT2D',
    'IRFFT3D',
    'Identity',
    'IdentityN',
    'If',
    'Imag',
    'InfeedDequeue',
    'InfeedDequeueTuple',
    'InplaceAdd',
    'InplaceUpdate',
    'Inv',
    'Invert',
    'InvertPermutation',
    'IsFinite',
    'IsInf',
    'IsNan',
    'L2Loss',
    'LRN',
    'LRNGrad',
    'LeftShift',
    'Less',
    'LessEqual',
    'Lgamma',
    'LinSpace',
    'ListDiff',
    'Log',
    'Log1p',
    'LogSoftmax',
    'LogicalAnd',
    'LogicalNot',
    'LogicalOr',
    'MatMul',
    'MatrixBandPart',
    'MatrixDiag',
    'MatrixDiagPart',
    'MatrixSetDiag',
    'MatrixTriangularSolve',
    'Max',
    'MaxPool',
    'MaxPool3D',
    'MaxPool3DGrad',
    'MaxPool3DGradGrad',
    'MaxPoolGrad',
    'MaxPoolGradGrad',
    'MaxPoolGradGradV2',
    'MaxPoolGradV2',
    'MaxPoolV2',
    'Maximum',
    'Mean',
    'Min',
    'Minimum',
    'MirrorPad',
    'Mod',
    'Mul',
    'Multinomial',
    'Neg',
    'NoOp',
    'NonMaxSuppressionV4',
    'NotEqual',
    'OneHot',
    'OnesLike',
    'OutfeedEnqueue',
    'OutfeedEnqueueTuple',
    'Pack',
    'Pad',
    'PadV2',
    'ParallelDynamicStitch',
    'PlaceholderWithDefault',
    'Pow',
    'PreventGradient',
    'Prod',
    'Qr',
    'QuantizeAndDequantizeV2',
    'QuantizeAndDequantizeV3',
    'RFFT',
    'RFFT2D',
    'RFFT3D',
    'RGBToHSV',
    'RandomShuffle',
    'RandomStandardNormal',
    'RandomUniform',
    'RandomUniformInt',
    'Range',
    'Rank',
    'ReadVariableOp',
    'Real',
    'RealDiv',
    'Reciprocal',
    'ReciprocalGrad',
    'RecvTPUEmbeddingActivations',
    'Relu',
    'Relu6',
    'Relu6Grad',
    'ReluGrad',
    'Reshape',
    'ResizeBilinear',
    'ResizeBilinearGrad',
    'ResourceApplyAdaMax',
    'ResourceApplyAdadelta',
    'ResourceApplyAdagrad',
    'ResourceApplyAdagradDA',
    'ResourceApplyAdam',
    'ResourceApplyAddSign',
    'ResourceApplyCenteredRMSProp',
    'ResourceApplyFtrl',
    'ResourceApplyFtrlV2',
    'ResourceApplyGradientDescent',
    'ResourceApplyMomentum',
    'ResourceApplyPowerSign',
    'ResourceApplyProximalAdagrad',
    'ResourceApplyProximalGradientDescent',
    'ResourceApplyRMSProp',
    'ResourceGather',
    'ResourceScatterAdd',
    'ResourceScatterDiv',
    'ResourceScatterMax',
    'ResourceScatterMin',
    'ResourceScatterMul',
    'ResourceScatterNdAdd',
    'ResourceScatterNdUpdate',
    'ResourceScatterSub',
    'ResourceScatterUpdate',
    'ResourceStridedSliceAssign',
    'Reverse',
    'ReverseSequence',
    'ReverseV2',
    'RightShift',
    'Rint',
    'Round',
    'Rsqrt',
    'RsqrtGrad',
    'ScatterNd',
    'Select',
    'Selu',
    'SeluGrad',
    'SendTPUEmbeddingGradients',
    'Shape',
    'ShapeN',
    'Sigmoid',
    'SigmoidGrad',
    'Sign',
    'Sin',
    'Sinh',
    'Size',
    'Slice',
    'Snapshot',
    'Softmax',
    'SoftmaxCrossEntropyWithLogits',
    'Softplus',
    'SoftplusGrad',
    'Softsign',
    'SoftsignGrad',
    'SpaceToBatch',
    'SpaceToBatchND',
    'SpaceToDepth',
    'SparseMatMul',
    'SparseSoftmaxCrossEntropyWithLogits',
    'SparseToDense',
    'Split',
    'SplitV',
    'Sqrt',
    'SqrtGrad',
    'Square',
    'SquaredDifference',
    'Squeeze',
    'StackCloseV2',
    'StackPopV2',
    'StackPushV2',
    'StackV2',
    'StatelessIf',
    'StatelessRandomNormal',
    'StatelessRandomUniform',
    'StatelessTruncatedNormal',
    'StatelessWhile',
    'StopGradient',
    'StridedSlice',
    'StridedSliceGrad',
    'Sub',
    'Sum',
    'SymbolicGradient',
    'TPUEmbeddingActivations',
    'Tan',
    'Tanh',
    'TanhGrad',
    'TensorArrayCloseV3',
    'TensorArrayConcatV3',
    'TensorArrayGatherV3',
    'TensorArrayGradV3',
    'TensorArrayReadV3',
    'TensorArrayScatterV3',
    'TensorArraySizeV3',
    'TensorArraySplitV3',
    'TensorArrayV3',
    'TensorArrayWriteV3',
    'Tile',
    'TopKV2',
    'Transpose',
    'TruncateDiv',
    'TruncateMod',
    'TruncatedNormal',
    'Unpack',
    'UnsortedSegmentMax',
    'UnsortedSegmentMin',
    'UnsortedSegmentProd',
    'UnsortedSegmentSum',
    'VarIsInitializedOp',
    'VariableShape',
    'While',
    'XlaDynamicUpdateSlice',
    'XlaHostCompute',
    'XlaIf',
    'XlaRecv',
    'XlaReduceWindow',
    'XlaSend',
    'XlaSort',
    'XlaWhile',
    'ZerosLike',

    // Ops below are manually whitelisted and should not be evaluated for
    // compatibility for various reasons.

    // Control flow ops.
    'Enter',
    'Exit',
    'LoopCond',
    'Merge',
    'NextIteration',
    'Switch',
    // Ops below are inserted by the compiler.
    '_Arg',
    '_ParallelConcatUpdate',
    '_Retval',
    '_TPUCompile',
    '_TPUExecute',
    // Distributed TPU ops.
    'TPUCompilationResult',
    'TPUReplicatedInput',
    'TPUReplicatedOutput',
    'TPUReplicateMetadata',
    // Checkpointing ops.
    'MergeV2Checkpoints',
    'RestoreV2',
    'SaveV2',
    // Miscellaneous CPU ops.
    'Abort',
    'Assert',
    'Assign',
    'Placeholder',
    'PlaceholderV2',
    'ShardedFilename',
    'StringJoin',
    'Variable',
    'VariableV2',
    'VarHandleOp',
    // Summary ops.
    'AudioSummary',
    'AudioSummaryV2',
    'DebugNumericSummary',
    'HistogramSummary',
    'ImageSummary',
    'MergeSummary',
    'ScalarSummary',
    'StatsAggregatorSummary'
  ];

  private notTpuOp(d: string) {
    if (d.toLowerCase().search('cpu:') != -1) return true;
    if (d.toLowerCase().search('gpu:') != -1) return true;
    return d.toLowerCase().search('tpu') == -1;
  }

  valid(n: qg.Noper) {
    if (n.name.search(qp.LIB_PRE) == 0) return true;
    if (!n.op) return true;
    if (n.device && this.notTpuOp(n.device)) return true;
    if (n.device && n.device.search('TPU_SYSTEM') != -1) return true;
    return _.includes(TpuCompatibility.WHITELIST, n.op);
  }
}

export function checkOpsForCompatibility(
  g: qs.SlimGraph,
  p: CompatibilityProvider
) {
  if (p === null) throw new Error('Compatibility provider required, : ' + p);
  _.each(g.opers, n => {
    n.compatible = p.valid(n);
    n.embeds.in.forEach(n2 => {
      n2.compatible = p.valid(n2);
    });
    n.embeds.out.forEach(n2 => {
      n2.compatible = p.valid(n2);
    });
  });
}
