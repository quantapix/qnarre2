# Copyright 2019 Quantapix Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# =============================================================================

import os

# import pathlib as pth
from datetime import datetime

import tensorflow as tf

from google.protobuf import struct_pb2
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import summary as hparams

from qnarre.neura import params
from qnarre.feeds.prep.tokenizer import Tokenizer
from qnarre.feeds.dset.bert_ds import dataset as bert_ds


def model_fn_builder(bert_config, init_checkpoint, learn_rate, train_steps,
                     warmup_steps, use_tpu, use_one_hot_embeddings):
    """Returns `model_fn` closure for TPUEstimator."""

    def model_fn(features, labels, mode, params):  # pylint: disable=unused-argument
        """The `model_fn` for TPUEstimator."""

        tf.logging.info("*** Features ***")
        for name in sorted(features.keys()):
            tf.logging.info(
                "  name = %s, shape = %s" % (name, features[name].shape))

        input_ids = features["input_ids"]
        input_mask = features["input_mask"]
        segment_ids = features["segment_ids"]
        masked_lm_positions = features["masked_lm_positions"]
        masked_lm_ids = features["masked_lm_ids"]
        masked_lm_weights = features["masked_lm_weights"]
        next_sentence_labels = features["next_sentence_labels"]

        is_training = (mode == tf.estimator.ModeKeys.TRAIN)

        model = modeling.BertModel(
            config=bert_config,
            is_training=is_training,
            input_ids=input_ids,
            input_mask=input_mask,
            token_type_ids=segment_ids,
            use_one_hot_embeddings=use_one_hot_embeddings)

        (masked_lm_loss, masked_lm_example_loss,
         masked_lm_log_probs) = get_masked_lm_output(
             bert_config, model.get_sequence_output(),
             model.get_embedding_table(), masked_lm_positions, masked_lm_ids,
             masked_lm_weights)

        (next_sentence_loss, next_sentence_example_loss,
         next_sentence_log_probs) = get_next_sentence_output(
             bert_config, model.get_pooled_output(), next_sentence_labels)

        total_loss = masked_lm_loss + next_sentence_loss

        tvars = tf.trainable_variables()

        initialized_variable_names = {}
        scaffold_fn = None
        if init_checkpoint:
            (assignment_map, initialized_variable_names
             ) = modeling.get_assignment_map_from_checkpoint(
                 tvars, init_checkpoint)
            if use_tpu:

                def tpu_scaffold():
                    tf.train.init_from_checkpoint(init_checkpoint,
                                                  assignment_map)
                    return tf.train.Scaffold()

                scaffold_fn = tpu_scaffold
            else:
                tf.train.init_from_checkpoint(init_checkpoint, assignment_map)

        tf.logging.info("**** Trainable Variables ****")
        for var in tvars:
            init_string = ""
            if var.name in initialized_variable_names:
                init_string = ", *INIT_FROM_CKPT*"
            tf.logging.info("  name = %s, shape = %s%s", var.name, var.shape,
                            init_string)

        output_spec = None
        if mode == tf.estimator.ModeKeys.TRAIN:
            train_op = optimization.create_optimizer(
                total_loss, learn_rate, train_steps, warmup_steps, use_tpu)

            output_spec = tf.contrib.tpu.TPUEstimatorSpec(
                mode=mode,
                loss=total_loss,
                train_op=train_op,
                scaffold_fn=scaffold_fn)
        elif mode == tf.estimator.ModeKeys.EVAL:

            def metric_fn(masked_lm_example_loss, masked_lm_log_probs,
                          masked_lm_ids, masked_lm_weights,
                          next_sentence_example_loss, next_sentence_log_probs,
                          next_sentence_labels):
                """Computes the loss and accuracy of the model."""
                masked_lm_log_probs = tf.reshape(
                    masked_lm_log_probs, [-1, masked_lm_log_probs.shape[-1]])
                masked_lm_predictions = tf.argmax(
                    masked_lm_log_probs, axis=-1, output_type=tf.int32)
                masked_lm_example_loss = tf.reshape(masked_lm_example_loss,
                                                    [-1])
                masked_lm_ids = tf.reshape(masked_lm_ids, [-1])
                masked_lm_weights = tf.reshape(masked_lm_weights, [-1])
                masked_lm_accuracy = tf.metrics.accuracy(
                    labels=masked_lm_ids,
                    predictions=masked_lm_predictions,
                    weights=masked_lm_weights)
                masked_lm_mean_loss = tf.metrics.mean(
                    values=masked_lm_example_loss, weights=masked_lm_weights)

                next_sentence_log_probs = tf.reshape(
                    next_sentence_log_probs,
                    [-1, next_sentence_log_probs.shape[-1]])
                next_sentence_predictions = tf.argmax(
                    next_sentence_log_probs, axis=-1, output_type=tf.int32)
                next_sentence_labels = tf.reshape(next_sentence_labels, [-1])
                next_sentence_accuracy = tf.metrics.accuracy(
                    labels=next_sentence_labels,
                    predictions=next_sentence_predictions)
                next_sentence_mean_loss = tf.metrics.mean(
                    values=next_sentence_example_loss)

                return {
                    "masked_lm_accuracy": masked_lm_accuracy,
                    "masked_lm_loss": masked_lm_mean_loss,
                    "next_sentence_accuracy": next_sentence_accuracy,
                    "next_sentence_loss": next_sentence_mean_loss,
                }

            eval_metrics = (metric_fn, [
                masked_lm_example_loss, masked_lm_log_probs, masked_lm_ids,
                masked_lm_weights, next_sentence_example_loss,
                next_sentence_log_probs, next_sentence_labels
            ])
            output_spec = tf.contrib.tpu.TPUEstimatorSpec(
                mode=mode,
                loss=total_loss,
                eval_metrics=eval_metrics,
                scaffold_fn=scaffold_fn)
        else:
            raise ValueError(
                "Only TRAIN and EVAL modes are supported: %s" % (mode))

        return output_spec

    return model_fn


def get_masked_lm_output(bert_config, input_tensor, output_weights, positions,
                         label_ids, label_weights):
    """Get loss and log probs for the masked LM."""
    input_tensor = gather_indexes(input_tensor, positions)

    with tf.variable_scope("cls/predictions"):
        # We apply one more non-linear transformation before the output layer.
        # This matrix is not used after pre-training.
        with tf.variable_scope("transform"):
            input_tensor = tf.layers.dense(
                input_tensor,
                units=bert_config.hidden_size,
                activation=modeling.get_activation(bert_config.hidden_act),
                kernel_initializer=modeling.create_initializer(
                    bert_config.initializer_range))
            input_tensor = modeling.layer_norm(input_tensor)

        # The output weights are the same as the input embeddings, but there is
        # an output-only bias for each token.
        output_bias = tf.get_variable(
            "output_bias",
            shape=[bert_config.vocab_size],
            initializer=tf.zeros_initializer())
        logits = tf.matmul(input_tensor, output_weights, transpose_b=True)
        logits = tf.nn.bias_add(logits, output_bias)
        log_probs = tf.nn.log_softmax(logits, axis=-1)

        label_ids = tf.reshape(label_ids, [-1])
        label_weights = tf.reshape(label_weights, [-1])

        one_hot_labels = tf.one_hot(
            label_ids, depth=bert_config.vocab_size, dtype=tf.float32)

        # The `positions` tensor might be zero-padded (if the sequence is too
        # short to have the maximum number of predictions). The `label_weights`
        # tensor has a value of 1.0 for every real prediction and 0.0 for the
        # padding predictions.
        per_example_loss = -tf.reduce_sum(
            log_probs * one_hot_labels, axis=[-1])
        numerator = tf.reduce_sum(label_weights * per_example_loss)
        denominator = tf.reduce_sum(label_weights) + 1e-5
        loss = numerator / denominator

    return (loss, per_example_loss, log_probs)


def get_next_sentence_output(bert_config, input_tensor, labels):
    """Get loss and log probs for the next sentence prediction."""

    # Simple binary classification. Note that 0 is "next sentence" and 1 is
    # "random sentence". This weight matrix is not used after pre-training.
    with tf.variable_scope("cls/seq_relationship"):
        output_weights = tf.get_variable(
            "output_weights",
            shape=[2, bert_config.hidden_size],
            initializer=modeling.create_initializer(
                bert_config.initializer_range))
        output_bias = tf.get_variable(
            "output_bias", shape=[2], initializer=tf.zeros_initializer())

        logits = tf.matmul(input_tensor, output_weights, transpose_b=True)
        logits = tf.nn.bias_add(logits, output_bias)
        log_probs = tf.nn.log_softmax(logits, axis=-1)
        labels = tf.reshape(labels, [-1])
        one_hot_labels = tf.one_hot(labels, depth=2, dtype=tf.float32)
        per_example_loss = -tf.reduce_sum(one_hot_labels * log_probs, axis=-1)
        loss = tf.reduce_mean(per_example_loss)
        return (loss, per_example_loss, log_probs)


def gather_indexes(sequence_tensor, positions):
    """Gathers the vectors at the specific positions over a minibatch."""
    sequence_shape = modeling.get_shape_list(sequence_tensor, expected_rank=3)
    batch_size = sequence_shape[0]
    seq_length = sequence_shape[1]
    width = sequence_shape[2]

    flat_offsets = tf.reshape(
        tf.range(0, batch_size, dtype=tf.int32) * seq_length, [-1, 1])
    flat_positions = tf.reshape(positions + flat_offsets, [-1])
    flat_sequence_tensor = tf.reshape(sequence_tensor,
                                      [batch_size * seq_length, width])
    output_tensor = tf.gather(flat_sequence_tensor, flat_positions)
    return output_tensor


def input_fn_builder(xxx_input_files,
                     max_seq_len,
                     max_preds_per_seq,
                     is_training,
                     num_cpu_threads=4):
    """Creates an `input_fn` closure to be passed to TPUEstimator."""

    def input_fn(params):
        """The actual input function."""
        batch_size = params["batch_size"]

        name_to_features = {
            "input_ids":
            tf.FixedLenFeature([max_seq_len], tf.int64),
            "input_mask":
            tf.FixedLenFeature([max_seq_len], tf.int64),
            "segment_ids":
            tf.FixedLenFeature([max_seq_len], tf.int64),
            "masked_lm_positions":
            tf.FixedLenFeature([max_preds_per_seq], tf.int64),
            "masked_lm_ids":
            tf.FixedLenFeature([max_preds_per_seq], tf.int64),
            "masked_lm_weights":
            tf.FixedLenFeature([max_preds_per_seq], tf.float32),
            "next_sentence_labels":
            tf.FixedLenFeature([1], tf.int64),
        }

        # For training, we want a lot of parallel reading and shuffling.
        # For eval, we want no shuffling and parallel reading doesn't matter.
        if is_training:
            d = tf.data.Dataset.from_tensor_slices(
                tf.constant(xxx_input_files))
            d = d.repeat()
            d = d.shuffle(buffer_size=len(xxx_input_files))

            # `cycle_length` is the number of parallel files that get read.
            cycle_length = min(num_cpu_threads, len(xxx_input_files))

            # `sloppy` mode means that the interleaving is not exact. This adds
            # even more randomness to the training pipeline.
            d = d.apply(
                tf.contrib.data.parallel_interleave(
                    tf.data.TFRecordDataset,
                    sloppy=is_training,
                    cycle_length=cycle_length))
            d = d.shuffle(buffer_size=100)
        else:
            d = tf.data.TFRecordDataset(xxx_input_files)
            # Since we evaluate for a fixed number of steps we don't want to encounter
            # out-of-range exceptions.
            d = d.repeat()

        # We must `drop_remainder` on training because the TPU requires fixed
        # size dimensions. For eval, we assume we are evaluating on the CPU or GPU
        # and we *don't* want to drop the remainder, otherwise we wont cover
        # every sample.
        d = d.apply(
            tf.contrib.data.map_and_batch(
                lambda record: _decode_record(record, name_to_features),
                batch_size=batch_size,
                num_parallel_batches=num_cpu_threads,
                drop_remainder=True))
        return d

    return input_fn


def _decode_record(record, name_to_features):
    """Decodes a record to a TensorFlow example."""
    example = tf.parse_single_example(record, name_to_features)

    # tf.Example only supports tf.int64, but the TPU only supports tf.int32.
    # So cast all int64 to int32.
    for name in list(example.keys()):
        t = example[name]
        if t.dtype == tf.int64:
            t = tf.to_int32(t)
        example[name] = t

    return example


def main(_):
    result = estimator.evaluate(input_fn=eval_input_fn, steps=PS.eval_steps)

    output_eval_file = os.path.join(PS.dir_save, "eval_results.txt")
    with tf.gfile.GFile(output_eval_file, "w") as writer:
        tf.logging.info("***** Eval results *****")
        for key in sorted(result.keys()):
            tf.logging.info("  %s = %s", key, str(result[key]))
            writer.write("%s = %s\n" % (key, str(result[key])))

    for result in estimator.predict(input_fn, yield_single_examples=True):
        unique_id = int(result["unique_id"])
        feature = unique_id_to_feature[unique_id]
        output_json = collections.OrderedDict()
        output_json["linex_index"] = unique_id
        all_features = []
        for (i, token) in enumerate(feature.tokens):
            all_layers = []
            for (j, layer_index) in enumerate(layer_indexes):
                layer_output = result["layer_output_%d" % j]
                layers = collections.OrderedDict()
                layers["index"] = layer_index
                layers["values"] = [
                    round(float(x), 6) for x in layer_output[i:(i + 1)].flat
                ]
                all_layers.append(layers)
            features = collections.OrderedDict()
            features["token"] = token
            features["layers"] = all_layers
            all_features.append(features)
        output_json["features"] = all_features
        writer.write(json.dumps(output_json) + "\n")


if __name__ == '__main__':
    # tf.logging.set_verbosity(tf.logging.INFO)
    load_flags()
    from absl import app
    app.run(main)
