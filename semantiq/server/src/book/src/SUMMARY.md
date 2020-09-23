# Cluster-Oriented Programming

[Cluster-Oriented Programming](title.md)
[Foreword](foreword.md)
[Introduction](00-introduction.md)

## Refactoring a compiler

- [Refactoring a compiler](01-refactoring.md)
  - [Stats of the Typescript 4.0 compiler](01-01-stats.md)
  - [Ways to reduce cognitive load](01-02-load.md)
  
- [Interfaces and type algebra for minimal expression](02-algebra.md)
  - [Opaque data with on-demand type views](02-01-views.md)
  - [Sum types and type extensions as context](02-02-context.md)

- ["Cluster OP": classes and prototypal inheritance](03-cluster.md)
  - [Encapsulating properties and contexts](03-01-properties.md)
  - [Dispatch through nesting and inheritance](03-02-dispatch.md)
  - [Shared configuration and options](03-03-config.md)
  
- [Modular composition to extend functionality](04-modules.md)
  - [Semantic function hierarchies vs. object networks](04-01-hierarchies.md)
  - [Custom instances of semantic frameworks](04-02-frames.md)

- [Optimization through “proto-collapse”](05-collapse.md)
  - [Performance analysis](05-01-perf.md)

## Structural morphing to preserve semantics

- [Structural morphing to preserve semantics](06-morphings.md)
  - [Current category theory highlights](06-01-theory.md)
  - [Type algebra continued](06-02-algebra.md)
  - [Functors and other morphisms](06-03-functors.md)
  
- [Existing Typescript to Javascript morphings](07-emit.md)
  - [Python morphing patterns and anti-patterns](07-01-python.md)
  - [Is Julia "categorically" similar?](07-02-julia.md)
  - [Systemic Rust morphings](07-03-rust.md)
  
- [Shared semantics and significant differences](08-diffs.md)
  - [Configurable morphing infrastructure](08-01-infra.md)
  - [Few implementation details and future work](08-02-details.md)

- [Integration with the Language Server framework](09-ls.md)
  - [Unified syntax-related services](09-01-syntax.md)
  - [Comparison metrics through morphings](09-02-metrics.md)

## From structural morphings to conflict graphs

- [From structural morphings to conflict graphs](10.md)
- [Is "understanding" necessary in state-of-the-art NLP?](10.md)
- ["Simplified" content to structurally morphable text](10.md)
- [Comparison metrics revisited and extended](10.md)
- [Visualizing differences: conflict graphs](10.md)
- [Applying the results to simple "bipolar" legal text](10.md)
- [Complexity and scaling issues considered](10.md)
- [Few implementation details and future work](10.md)
