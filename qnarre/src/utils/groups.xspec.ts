var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.append(…) returns a selection', function(test) {
  const document = jsdom();
  test.ok(d3.select(document.body).append('h1') instanceof d3.selection);
  test.end();
});

tape(
  'selection.append(name) appends a new element of the specified name as the last child of each selected element',
  function(test) {
    const document = jsdom(
        "<div id='one'><span class='before'></span></div><div id='two'><span class='before'></span></div>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).append('span'),
      three = one.querySelector('span:last-child'),
      four = two.querySelector('span:last-child');
    test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
    test.end();
  }
);

tape(
  'selection.append(name) observes the specified namespace, if any',
  function(test) {
    const document = jsdom("<div id='one'></div><div id='two'></div>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).append('svg:g'),
      three = one.querySelector('g'),
      four = two.querySelector('g');
    test.equal(three.namespaceURI, 'http://www.w3.org/2000/svg');
    test.equal(four.namespaceURI, 'http://www.w3.org/2000/svg');
    test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
    test.end();
  }
);

tape(
  'selection.append(name) uses createElement, not createElementNS, if the implied namespace is the same as the document',
  function(test) {
    let pass = 0,
      document = jsdom("<div id='one'></div><div id='two'></div>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      createElement = document.createElement;

    document.createElement = function() {
      ++pass;
      return createElement.apply(this, arguments);
    };

    const selection = d3.selectAll([one, two]).append('P'),
      three = one.querySelector('p'),
      four = two.querySelector('p');
    test.equal(pass, 2);
    test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
    test.end();
  }
);

tape('selection.append(name) observes the implicit namespace, if any', function(
  test
) {
  const document = jsdom("<div id='one'></div><div id='two'></div>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3.selectAll([one, two]).append('svg'),
    three = one.querySelector('svg'),
    four = two.querySelector('svg');
  test.equal(three.namespaceURI, 'http://www.w3.org/2000/svg');
  test.equal(four.namespaceURI, 'http://www.w3.org/2000/svg');
  test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
  test.end();
});

tape(
  'selection.append(name) observes the inherited namespace, if any',
  function(test) {
    const document = jsdom("<div id='one'></div><div id='two'></div>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3
        .selectAll([one, two])
        .append('svg')
        .append('g'),
      three = one.querySelector('g'),
      four = two.querySelector('g');
    test.equal(three.namespaceURI, 'http://www.w3.org/2000/svg');
    test.equal(four.namespaceURI, 'http://www.w3.org/2000/svg');
    test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
    test.end();
  }
);

tape('selection.append(name) observes a custom namespace, if any', function(
  test
) {
  try {
    d3.namespaces.d3js = 'https://d3js.org/2016/namespace';
    const document = jsdom("<div id='one'></div><div id='two'></div>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).append('d3js'),
      three = one.querySelector('d3js'),
      four = two.querySelector('d3js');
    test.equal(three.namespaceURI, 'https://d3js.org/2016/namespace');
    test.equal(four.namespaceURI, 'https://d3js.org/2016/namespace');
    test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
    test.end();
  } finally {
    delete d3.namespaces.d3js;
  }
});

tape(
  'selection.append(function) appends the returned element as the last child of each selected element',
  function(test) {
    const document = jsdom(
        "<div id='one'><span class='before'></span></div><div id='two'><span class='before'></span></div>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).append(function() {
        return document.createElement('SPAN');
      }),
      three = one.querySelector('span:last-child'),
      four = two.querySelector('span:last-child');
    test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
    test.end();
  }
);

tape(
  'selection.append(function) passes the creator function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .append(function(d, i, nodes) {
        results.push([this, d, i, nodes]);
        return document.createElement('SPAN');
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);

tape(
  'selection.append(…) propagates data if defined on the originating element',
  function(test) {
    const document = jsdom('<parent><child>hello</child></parent>'),
      parent = document.querySelector('parent');
    parent.__data__ = 0; // still counts as data even though falsey
    test.equal(
      d3
        .select(parent)
        .append('child')
        .datum(),
      0
    );
    test.end();
  }
);

tape(
  'selection.append(…) will not propagate data if not defined on the originating element',
  function(test) {
    const document = jsdom('<parent><child>hello</child></parent>'),
      parent = document.querySelector('parent'),
      child = document.querySelector('child');
    child.__data__ = 42;
    d3.select(parent).append(function() {
      return child;
    });
    test.equal(child.__data__, 42);
    test.end();
  }
);

tape(
  'selection.append(…) propagates parents from the originating selection',
  function(test) {
    const document = jsdom('<parent></parent><parent></parent>'),
      parents = d3.select(document).selectAll('parent'),
      childs = parents.append('child');
    test.deepEqual(parents, {
      _groups: [document.querySelectorAll('parent')],
      _parents: [document]
    });
    test.deepEqual(childs, {
      _groups: [document.querySelectorAll('child')],
      _parents: [document]
    });
    test.ok(parents._parents === childs._parents); // Not copied!
    test.end();
  }
);

tape(
  'selection.append(…) can select elements when the originating selection is nested',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child></child></parent><parent id='two'><child></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3
        .selectAll([one, two])
        .selectAll('child')
        .append('span'),
      three = one.querySelector('span'),
      four = two.querySelector('span');
    test.deepEqual(selection, {
      _groups: [[three], [four]],
      _parents: [one, two]
    });
    test.end();
  }
);

tape('selection.append(…) skips missing originating elements', function(test) {
  const document = jsdom('<h1></h1>'),
    h1 = document.querySelector('h1'),
    selection = d3.selectAll([, h1]).append('span'),
    span = h1.querySelector('span');
  test.deepEqual(selection, {_groups: [[, span]], _parents: [null]});
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.attr(name) returns the value of the attribute with the specified name on the first selected element',
  function(test) {
    const document = jsdom("<h1 class='c1 c2'>hello</h1><h1 class='c3'></h1>");
    test.equal(
      d3
        .select(document)
        .select('h1')
        .attr('class'),
      'c1 c2'
    );
    test.equal(
      d3
        .selectAll([null, document])
        .select('h1')
        .attr('class'),
      'c1 c2'
    );
    test.end();
  }
);

tape('selection.attr(name) coerces the specified name to a string', function(
  test
) {
  const document = jsdom("<h1 class='c1 c2'>hello</h1><h1 class='c3'></h1>");
  test.equal(
    d3
      .select(document)
      .select('h1')
      .attr({
        toString: function() {
          return 'class';
        }
      }),
    'c1 c2'
  );
  test.end();
});

tape('selection.attr(name) observes the namespace prefix, if any', function(
  test
) {
  const selection = d3.select({
    getAttribute: function(name) {
      return name === 'foo' ? 'bar' : null;
    },
    getAttributeNS: function(url, name) {
      return url === 'http://www.w3.org/2000/svg' && name === 'foo'
        ? 'svg:bar'
        : null;
    }
  });
  test.equal(selection.attr('foo'), 'bar');
  test.equal(selection.attr('svg:foo'), 'svg:bar');
  test.end();
});

tape(
  'selection.attr(name) observes a custom namespace prefix, if any',
  function(test) {
    const selection = d3.select({
      getAttributeNS: function(url, name) {
        return url === 'https://d3js.org/2016/namespace' && name === 'pie'
          ? 'tasty'
          : null;
      }
    });
    try {
      d3.namespaces.d3js = 'https://d3js.org/2016/namespace';
      test.equal(selection.attr('d3js:pie'), 'tasty');
    } finally {
      delete d3.namespaces.d3js;
    }
    test.end();
  }
);

tape(
  'selection.attr(name, value) observes the namespace prefix, if any',
  function(test) {
    let result,
      selection = d3.select({
        setAttribute: function(name, value) {
          result = name === 'foo' ? value : null;
        },
        setAttributeNS: function(url, name, value) {
          result =
            url === 'http://www.w3.org/2000/svg' && name === 'foo'
              ? value
              : null;
        }
      });
    test.equal(
      ((result = undefined), selection.attr('foo', 'bar'), result),
      'bar'
    );
    test.equal(
      ((result = undefined), selection.attr('svg:foo', 'svg:bar'), result),
      'svg:bar'
    );
    test.equal(
      ((result = undefined),
      selection.attr('foo', function() {
        return 'bar';
      }),
      result),
      'bar'
    );
    test.equal(
      ((result = undefined),
      selection.attr('svg:foo', function() {
        return 'svg:bar';
      }),
      result),
      'svg:bar'
    );
    test.end();
  }
);

tape(
  'selection.attr(name, null) observes the namespace prefix, if any',
  function(test) {
    let result,
      selection = d3.select({
        removeAttribute: function(name) {
          result = name === 'foo' ? 'foo' : null;
        },
        removeAttributeNS: function(url, name) {
          result =
            url === 'http://www.w3.org/2000/svg' && name === 'foo'
              ? 'svg:foo'
              : null;
        }
      });
    test.equal(
      ((result = undefined), selection.attr('foo', null), result),
      'foo'
    );
    test.equal(
      ((result = undefined), selection.attr('svg:foo', null), result),
      'svg:foo'
    );
    test.equal(
      ((result = undefined),
      selection.attr('foo', function() {
        return null;
      }),
      result),
      'foo'
    );
    test.equal(
      ((result = undefined),
      selection.attr('svg:foo', function() {
        return null;
      }),
      result),
      'svg:foo'
    );
    test.end();
  }
);

tape(
  'selection.attr(name, value) sets the value of the attribute with the specified name on the selected elements',
  function(test) {
    const document = jsdom(
        "<h1 id='one' class='c1 c2'>hello</h1><h1 id='two' class='c3'></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]);
    test.equal(selection.attr('foo', 'bar'), selection);
    test.equal(one.getAttribute('foo'), 'bar');
    test.equal(two.getAttribute('foo'), 'bar');
    test.end();
  }
);

tape(
  'selection.attr(name, null) removes the attribute with the specified name on the selected elements',
  function(test) {
    const document = jsdom(
        "<h1 id='one' foo='bar' class='c1 c2'>hello</h1><h1 id='two' foo='bar' class='c3'></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]);
    test.equal(selection.attr('foo', null), selection);
    test.equal(one.hasAttribute('foo'), false);
    test.equal(two.hasAttribute('foo'), false);
    test.end();
  }
);

tape(
  'selection.attr(name, function) sets the value of the attribute with the specified name on the selected elements',
  function(test) {
    const document = jsdom(
        "<h1 id='one' class='c1 c2'>hello</h1><h1 id='two' class='c3'></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]);
    test.equal(
      selection.attr('foo', function(d, i) {
        return i ? 'bar-' + i : null;
      }),
      selection
    );
    test.equal(one.hasAttribute('foo'), false);
    test.equal(two.getAttribute('foo'), 'bar-1');
    test.end();
  }
);

tape(
  'selection.attr(name, function) passes the value function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .attr('foo', function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.call(function) calls the specified function, passing the selection',
  function(test) {
    let result,
      document = jsdom(),
      selection = d3.select(document);
    test.equal(
      selection.call(function(selection) {
        result = selection;
      }),
      selection
    );
    test.equal(result, selection);
    test.end();
  }
);

tape(
  'selection.call(function, arguments…) calls the specified function, passing the additional arguments',
  function(test) {
    const result = [],
      foo = {},
      bar = {},
      document = jsdom(),
      selection = d3.select(document);
    test.equal(
      selection.call(
        function(selection, a, b) {
          result.push(selection, a, b);
        },
        foo,
        bar
      ),
      selection
    );
    test.deepEqual(result, [selection, foo, bar]);
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.classed(classes) returns true if and only if the first element has the specified classes',
  function(test) {
    const document = jsdom("<h1 class='c1 c2'>hello</h1><h1 class='c3'></h1>");
    test.equal(
      d3
        .select(document)
        .select('h1')
        .classed(''),
      true
    );
    test.equal(
      d3
        .select(document)
        .select('h1')
        .classed('c1'),
      true
    );
    test.equal(
      d3
        .select(document)
        .select('h1')
        .classed('c2'),
      true
    );
    test.equal(
      d3
        .select(document)
        .select('h1')
        .classed('c3'),
      false
    );
    test.equal(
      d3
        .select(document)
        .select('h1')
        .classed('c1 c2'),
      true
    );
    test.equal(
      d3
        .select(document)
        .select('h1')
        .classed('c2 c1'),
      true
    );
    test.equal(
      d3
        .select(document)
        .select('h1')
        .classed('c1 c3'),
      false
    );
    test.equal(
      d3
        .selectAll([null, document])
        .select('h1')
        .classed('c1'),
      true
    );
    test.equal(
      d3
        .selectAll([null, document])
        .select('h1')
        .classed('c2'),
      true
    );
    test.equal(
      d3
        .selectAll([null, document])
        .select('h1')
        .classed('c3'),
      false
    );
    test.end();
  }
);

tape(
  'selection.classed(classes) coerces the specified classes to a string',
  function(test) {
    const document = jsdom("<h1 class='c1 c2'>hello</h1><h1 class='c3'></h1>");
    test.equal(
      d3
        .select(document)
        .select('h1')
        .classed({
          toString: function() {
            return 'c1 c2';
          }
        }),
      true
    );
    test.end();
  }
);

tape(
  'selection.classed(classes) gets the class attribute if classList is not supported',
  function(test) {
    const node = new Node('c1 c2');
    test.equal(d3.select(node).classed(''), true);
    test.equal(d3.select(node).classed('c1'), true);
    test.equal(d3.select(node).classed('c2'), true);
    test.equal(d3.select(node).classed('c3'), false);
    test.equal(d3.select(node).classed('c1 c2'), true);
    test.equal(d3.select(node).classed('c2 c1'), true);
    test.equal(d3.select(node).classed('c1 c3'), false);
    test.end();
  }
);

tape(
  'selection.classed(classes, value) sets whether the selected elements have the specified classes',
  function(test) {
    const document = jsdom(''),
      selection = d3.select(document.body);
    test.equal(selection.classed('c1'), false);
    test.equal(selection.attr('class'), null);
    test.equal(selection.classed('c1', true), selection);
    test.equal(selection.classed('c1'), true);
    test.equal(selection.attr('class'), 'c1');
    test.equal(selection.classed('c1 c2', true), selection);
    test.equal(selection.classed('c1'), true);
    test.equal(selection.classed('c2'), true);
    test.equal(selection.classed('c1 c2'), true);
    test.equal(selection.attr('class'), 'c1 c2');
    test.equal(selection.classed('c1', false), selection);
    test.equal(selection.classed('c1'), false);
    test.equal(selection.classed('c2'), true);
    test.equal(selection.classed('c1 c2'), false);
    test.equal(selection.attr('class'), 'c2');
    test.equal(selection.classed('c1 c2', false), selection);
    test.equal(selection.classed('c1'), false);
    test.equal(selection.classed('c2'), false);
    test.equal(selection.attr('class'), '');
    test.end();
  }
);

tape(
  'selection.classed(classes, function) sets whether the selected elements have the specified classes',
  function(test) {
    const document = jsdom(''),
      selection = d3.select(document.body);
    test.equal(
      selection.classed('c1 c2', function() {
        return true;
      }),
      selection
    );
    test.equal(selection.attr('class'), 'c1 c2');
    test.equal(
      selection.classed('c1 c2', function() {
        return false;
      }),
      selection
    );
    test.equal(selection.attr('class'), '');
    test.end();
  }
);

tape(
  'selection.classed(classes, function) passes the value function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .classed('c1 c2', function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);

tape(
  'selection.classed(classes, value) sets the class attribute if classList is not supported',
  function(test) {
    const node = new Node(null),
      selection = d3.select(node);
    test.equal(selection.classed('c1'), false);
    test.equal(selection.attr('class'), null);
    test.equal(selection.classed('c1', true), selection);
    test.equal(selection.classed('c1'), true);
    test.equal(selection.attr('class'), 'c1');
    test.equal(selection.classed('c1 c2', true), selection);
    test.equal(selection.classed('c1'), true);
    test.equal(selection.classed('c2'), true);
    test.equal(selection.classed('c1 c2'), true);
    test.equal(selection.attr('class'), 'c1 c2');
    test.equal(selection.classed('c1', false), selection);
    test.equal(selection.classed('c1'), false);
    test.equal(selection.classed('c2'), true);
    test.equal(selection.classed('c1 c2'), false);
    test.equal(selection.attr('class'), 'c2');
    test.equal(selection.classed('c1 c2', false), selection);
    test.equal(selection.classed('c1'), false);
    test.equal(selection.classed('c2'), false);
    test.equal(selection.attr('class'), '');
    test.end();
  }
);

tape(
  'selection.classed(classes, value) coerces the specified classes to a string',
  function(test) {
    const document = jsdom('<h1>hello</h1>'),
      selection = d3.select(document).select('h1');
    test.equal(selection.classed('c1 c2'), false);
    test.equal(
      selection.classed(
        {
          toString: function() {
            return 'c1 c2';
          }
        },
        true
      ),
      selection
    );
    test.equal(selection.classed('c1 c2'), true);
    test.end();
  }
);

function Node(classes) {
  this._classes = classes;
}

Node.prototype = {
  getAttribute: function(name) {
    return name === 'class' ? this._classes : null;
  },
  setAttribute: function(name, value) {
    if (name === 'class') this._classes = value;
  }
};
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.data(values) binds the specified values to the selected elements by index',
  function(test) {
    const body = jsdom(
        "<div id='one'></div><div id='two'></div><div id='three'></div>"
      ).body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      three = body.querySelector('#three'),
      selection = d3
        .select(body)
        .selectAll('div')
        .data(['foo', 'bar', 'baz']);
    test.equal(one.__data__, 'foo');
    test.equal(two.__data__, 'bar');
    test.equal(three.__data__, 'baz');
    test.deepEqual(selection, {
      _groups: [[one, two, three]],
      _parents: [body],
      _enter: [[, ,]],
      _exit: [[, ,]]
    });
    test.end();
  }
);

tape(
  'selection.data(values) puts unbound data in the enter selection',
  function(test) {
    const body = jsdom("<div id='one'></div><div id='two'></div>").body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      selection = d3
        .select(body)
        .selectAll('div')
        .data(['foo', 'bar', 'baz']);
    test.equal(one.__data__, 'foo');
    test.equal(two.__data__, 'bar');
    test.deepEqual(selection, {
      _groups: [[one, two]],
      _parents: [body],
      _enter: [
        [
          ,
          ,
          {
            __data__: 'baz',
            _next: null,
            _parent: body,
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            ownerDocument: body.ownerDocument
          }
        ]
      ],
      _exit: [[, ,]]
    });
    test.end();
  }
);

tape(
  'selection.data(values) puts unbound elements in the exit selection',
  function(test) {
    const body = jsdom(
        "<div id='one'></div><div id='two'></div><div id='three'></div>"
      ).body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      three = body.querySelector('#three'),
      selection = d3
        .select(body)
        .selectAll('div')
        .data(['foo', 'bar']);
    test.equal(one.__data__, 'foo');
    test.equal(two.__data__, 'bar');
    test.deepEqual(selection, {
      _groups: [[one, two]],
      _parents: [body],
      _enter: [[, , ,]],
      _exit: [[, , three]]
    });
    test.end();
  }
);

tape(
  'selection.data(values) binds the specified values to each group independently',
  function(test) {
    const body = jsdom(
        "<div id='zero'><span id='one'></span><span id='two'></span></div><div id='three'><span id='four'></span><span id='five'></span></div>"
      ).body,
      zero = body.querySelector('#zero'),
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      three = body.querySelector('#three'),
      four = body.querySelector('#four'),
      five = body.querySelector('#five'),
      selection = d3
        .select(body)
        .selectAll('div')
        .selectAll('span')
        .data(['foo', 'bar']);
    test.equal(one.__data__, 'foo');
    test.equal(two.__data__, 'bar');
    test.equal(four.__data__, 'foo');
    test.equal(five.__data__, 'bar');
    test.deepEqual(selection, {
      _groups: [
        [one, two],
        [four, five]
      ],
      _parents: [zero, three],
      _enter: [[,], [,]],
      _exit: [[,], [,]]
    });
    test.end();
  }
);

tape(
  'selection.data(function) binds the specified return values to the selected elements by index',
  function(test) {
    const body = jsdom(
        "<div id='one'></div><div id='two'></div><div id='three'></div>"
      ).body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      three = body.querySelector('#three'),
      selection = d3
        .select(body)
        .selectAll('div')
        .data(function() {
          return ['foo', 'bar', 'baz'];
        });
    test.equal(one.__data__, 'foo');
    test.equal(two.__data__, 'bar');
    test.equal(three.__data__, 'baz');
    test.deepEqual(selection, {
      _groups: [[one, two, three]],
      _parents: [body],
      _enter: [[, ,]],
      _exit: [[, ,]]
    });
    test.end();
  }
);

tape(
  'selection.data(function) passes the values function datum, index and parents',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child></child><child></child></parent><parent id='two'><child></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i, nodes) {
        results.push([this, d, i, nodes]);
        return ['foo', 'bar'];
      });

    test.deepEqual(results, [
      [one, 'parent-0', 0, [one, two]],
      [two, 'parent-1', 1, [one, two]]
    ]);
    test.end();
  }
);

tape(
  'selection.data(values, function) joins data to element using the computed keys',
  function(test) {
    const body = jsdom(
        "<node id='one'></node><node id='two'></node><node id='three'></node>"
      ).body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      three = body.querySelector('#three'),
      selection = d3
        .select(body)
        .selectAll('node')
        .data(['one', 'four', 'three'], function(d) {
          return d || this.id;
        });
    test.deepEqual(selection, {
      _groups: [[one, , three]],
      _parents: [body],
      _enter: [
        [
          ,
          {
            __data__: 'four',
            _next: three,
            _parent: body,
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            ownerDocument: body.ownerDocument
          }
        ]
      ],
      _exit: [[, two]]
    });
    test.end();
  }
);

tape(
  'selection.data(values, function) puts elements with duplicate keys into update or exit',
  function(test) {
    const body = jsdom(
        "<node id='one' name='foo'></node><node id='two' name='foo'></node><node id='three' name='bar'></node>"
      ).body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      three = body.querySelector('#three'),
      selection = d3
        .select(body)
        .selectAll('node')
        .data(['foo'], function(d) {
          return d || this.getAttribute('name');
        });
    test.deepEqual(selection, {
      _groups: [[one]],
      _parents: [body],
      _enter: [[,]],
      _exit: [[, two, three]]
    });
    test.end();
  }
);

tape(
  'selection.data(values, function) puts elements with duplicate keys into exit',
  function(test) {
    const body = jsdom(
        "<node id='one' name='foo'></node><node id='two' name='foo'></node><node id='three' name='bar'></node>"
      ).body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      three = body.querySelector('#three'),
      selection = d3
        .select(body)
        .selectAll('node')
        .data(['bar'], function(d) {
          return d || this.getAttribute('name');
        });
    test.deepEqual(selection, {
      _groups: [[three]],
      _parents: [body],
      _enter: [[,]],
      _exit: [[one, two]]
    });
    test.end();
  }
);

tape(
  'selection.data(values, function) puts data with duplicate keys into update and enter',
  function(test) {
    const body = jsdom(
        "<node id='one'></node><node id='two'></node><node id='three'></node>"
      ).body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      three = body.querySelector('#three'),
      selection = d3
        .select(body)
        .selectAll('node')
        .data(['one', 'one', 'two'], function(d) {
          return d || this.id;
        });
    test.deepEqual(selection, {
      _groups: [[one, , two]],
      _parents: [body],
      _enter: [
        [
          ,
          {
            __data__: 'one',
            _next: two,
            _parent: body,
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            ownerDocument: body.ownerDocument
          },
          ,
        ]
      ],
      _exit: [[, , three]]
    });
    test.end();
  }
);

tape(
  'selection.data(values, function) puts data with duplicate keys into enter',
  function(test) {
    const body = jsdom(
        "<node id='one'></node><node id='two'></node><node id='three'></node>"
      ).body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      three = body.querySelector('#three'),
      selection = d3
        .select(body)
        .selectAll('node')
        .data(['foo', 'foo', 'two'], function(d) {
          return d || this.id;
        });
    test.deepEqual(selection, {
      _groups: [[, , two]],
      _parents: [body],
      _enter: [
        [
          {
            __data__: 'foo',
            _next: two,
            _parent: body,
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            ownerDocument: body.ownerDocument
          },
          {
            __data__: 'foo',
            _next: two,
            _parent: body,
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            ownerDocument: body.ownerDocument
          }
        ]
      ],
      _exit: [[one, , three]]
    });
    test.end();
  }
);

tape(
  'selection.data(values, function) passes the key function datum, index and nodes or data',
  function(test) {
    const body = jsdom("<node id='one'></node><node id='two'></node>").body,
      one = body.querySelector('#one'),
      two = body.querySelector('#two'),
      results = [];

    d3.select(one).datum('foo');

    d3.select(body)
      .selectAll('node')
      .data(['foo', 'bar'], function(d, i, nodes) {
        results.push([this, d, i, nodes]);
        return d || this.id;
      });

    test.deepEqual(results, [
      [one, 'foo', 0, [one, two]],
      [two, undefined, 1, [one, two]],
      [body, 'foo', 0, ['foo', 'bar']],
      [body, 'bar', 1, ['foo', 'bar']]
    ]);
    test.end();
  }
);

tape('selection.data(values, function) applies the order of the data', function(
  test
) {
  const body = jsdom(
      "<div id='one'></div><div id='two'></div><div id='three'></div>"
    ).body,
    one = body.querySelector('#one'),
    two = body.querySelector('#two'),
    three = body.querySelector('#three'),
    selection = d3
      .select(body)
      .selectAll('div')
      .data(['four', 'three', 'one', 'five', 'two'], function(d) {
        return d || this.id;
      });
  test.deepEqual(selection, {
    _groups: [[, three, one, , two]],
    _parents: [body],
    _enter: [
      [
        {
          __data__: 'four',
          _next: three,
          _parent: body,
          namespaceURI: 'http://www.w3.org/1999/xhtml',
          ownerDocument: body.ownerDocument
        },
        ,
        ,
        {
          __data__: 'five',
          _next: two,
          _parent: body,
          namespaceURI: 'http://www.w3.org/1999/xhtml',
          ownerDocument: body.ownerDocument
        }
      ]
    ],
    _exit: [[, , ,]]
  });
  test.end();
});

tape(
  'selection.data(values) returns a new selection, and does not modify the original selection',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      root = document.documentElement,
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection0 = d3.select(root).selectAll('h1'),
      selection1 = selection0.data([1, 2, 3]),
      selection2 = selection1.data([1]);
    test.deepEqual(selection0, {
      _groups: [[one, two]],
      _parents: [root]
    });
    test.deepEqual(selection1, {
      _groups: [[one, two]],
      _parents: [root],
      _enter: [
        [
          ,
          ,
          {
            __data__: 3,
            _next: null,
            _parent: root,
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            ownerDocument: document
          }
        ]
      ],
      _exit: [[,]]
    });
    test.deepEqual(selection2, {
      _groups: [[one]],
      _parents: [root],
      _enter: [[,]],
      _exit: [[, two]]
    });
    test.end();
  }
);

tape(
  'selection.data(values, key) does not modify the groups array in-place',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      root = document.documentElement,
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      key = function(d, i) {
        return i;
      },
      selection0 = d3.select(root).selectAll('h1'),
      selection1 = selection0.data([1, 2, 3], key),
      selection2 = selection1.data([1], key);
    test.deepEqual(selection0, {
      _groups: [[one, two]],
      _parents: [root]
    });
    test.deepEqual(selection1, {
      _groups: [[one, two]],
      _parents: [root],
      _enter: [
        [
          ,
          ,
          {
            __data__: 3,
            _next: null,
            _parent: root,
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            ownerDocument: document
          }
        ]
      ],
      _exit: [[,]]
    });
    test.deepEqual(selection2, {
      _groups: [[one]],
      _parents: [root],
      _enter: [[,]],
      _exit: [[, two]]
    });
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.datum() returns the datum on the first selected element',
  function(test) {
    const node = {__data__: 'hello'};
    test.equal(d3.select(node).datum(), 'hello');
    test.equal(d3.selectAll([null, node]).datum(), 'hello');
    test.end();
  }
);

tape('selection.datum(value) sets datum on the selected elements', function(
  test
) {
  const one = {__data__: ''},
    two = {__data__: ''},
    selection = d3.selectAll([one, two]);
  test.equal(selection.datum('bar'), selection);
  test.equal(one.__data__, 'bar');
  test.equal(two.__data__, 'bar');
  test.end();
});

tape(
  'selection.datum(null) clears the datum on the selected elements',
  function(test) {
    const one = {__data__: 'bar'},
      two = {__data__: 'bar'},
      selection = d3.selectAll([one, two]);
    test.equal(selection.datum(null), selection);
    test.equal('__data__' in one, false);
    test.equal('__data__' in two, false);
    test.end();
  }
);

tape(
  'selection.datum(function) sets the value of the datum on the selected elements',
  function(test) {
    const one = {__data__: 'bar'},
      two = {__data__: 'bar'},
      selection = d3.selectAll([one, two]);
    test.equal(
      selection.datum(function(d, i) {
        return i ? 'baz' : null;
      }),
      selection
    );
    test.equal('__data__' in one, false);
    test.equal(two.__data__, 'baz');
    test.end();
  }
);

tape(
  'selection.datum(function) passes the value function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .datum(function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.dispatch(type) dispatches a custom event of the specified type to each selected element in order',
  function(test) {
    let result = [],
      event,
      document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3
        .selectAll([one, two])
        .datum(function(d, i) {
          return 'node-' + i;
        })
        .on('bang', function(d, i, nodes) {
          event = d3.event;
          result.push(this, d, i, nodes);
        });
    test.equal(selection.dispatch('bang'), selection);
    test.deepEqual(result, [
      one,
      'node-0',
      0,
      [one, two],
      two,
      'node-1',
      1,
      [one, two]
    ]);
    test.equal(event.type, 'bang');
    test.equal(event.bubbles, false);
    test.equal(event.cancelable, false);
    test.equal(event.detail, null);
    test.end();
  }
);

tape(
  'selection.dispatch(type, params) dispatches a custom event with the specified constant parameters',
  function(test) {
    let result = [],
      event,
      document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3
        .selectAll([one, two])
        .datum(function(d, i) {
          return 'node-' + i;
        })
        .on('bang', function(d, i, nodes) {
          event = d3.event;
          result.push(this, d, i, nodes);
        });
    test.equal(
      selection.dispatch('bang', {
        bubbles: true,
        cancelable: true,
        detail: 'loud'
      }),
      selection
    );
    test.deepEqual(result, [
      one,
      'node-0',
      0,
      [one, two],
      two,
      'node-1',
      1,
      [one, two]
    ]);
    test.equal(event.type, 'bang');
    test.equal(event.bubbles, true);
    test.equal(event.cancelable, true);
    test.equal(event.detail, 'loud');
    test.end();
  }
);

tape(
  'selection.dispatch(type, function) dispatches a custom event with the specified parameter function',
  function(test) {
    const result = [],
      events = [],
      document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3
        .selectAll([one, two])
        .datum(function(d, i) {
          return 'node-' + i;
        })
        .on('bang', function(d, i, nodes) {
          events.push(d3.event);
          result.push(this, d, i, nodes);
        });
    test.equal(
      selection.dispatch('bang', function(d, i) {
        return {bubbles: true, cancelable: true, detail: 'loud-' + i};
      }),
      selection
    );
    test.deepEqual(result, [
      one,
      'node-0',
      0,
      [one, two],
      two,
      'node-1',
      1,
      [one, two]
    ]);
    test.equal(events[0].type, 'bang');
    test.equal(events[0].bubbles, true);
    test.equal(events[0].cancelable, true);
    test.equal(events[0].detail, 'loud-0');
    test.equal(events[1].type, 'bang');
    test.equal(events[1].bubbles, true);
    test.equal(events[1].cancelable, true);
    test.equal(events[1].detail, 'loud-1');
    test.end();
  }
);

tape('selection.dispatch(type) skips missing elements', function(test) {
  let result = [],
    event,
    document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3
      .selectAll([, one, , two])
      .datum(function(d, i) {
        return 'node-' + i;
      })
      .on('bang', function(d, i, nodes) {
        event = d3.event;
        result.push(this, d, i, nodes);
      });
  test.equal(selection.dispatch('bang'), selection);
  test.deepEqual(result, [
    one,
    'node-1',
    1,
    [, one, , two],
    two,
    'node-3',
    3,
    [, one, , two]
  ]);
  test.equal(event.type, 'bang');
  test.equal(event.detail, null);
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.each(function) calls the specified function for each selected element in order',
  function(test) {
    const result = [],
      document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).datum(function(d, i) {
        return 'node-' + i;
      });
    test.equal(
      selection.each(function(d, i, nodes) {
        result.push(this, d, i, nodes);
      }),
      selection
    );
    test.deepEqual(result, [
      one,
      'node-0',
      0,
      [one, two],
      two,
      'node-1',
      1,
      [one, two]
    ]);
    test.end();
  }
);

tape('selection.each(function) skips missing elements', function(test) {
  const result = [],
    document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3.selectAll([, one, , two]).datum(function(d, i) {
      return 'node-' + i;
    });
  test.equal(
    selection.each(function(d, i, nodes) {
      result.push(this, d, i, nodes);
    }),
    selection
  );
  test.deepEqual(result, [
    one,
    'node-1',
    1,
    [, one, , two],
    two,
    'node-3',
    3,
    [, one, , two]
  ]);
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.empty() return false if the selection is not empty', function(
  test
) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>");
  test.equal(d3.select(document).empty(), false);
  test.end();
});

tape('selection.empty() return true if the selection is empty', function(test) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>");
  test.equal(d3.select(null).empty(), true);
  test.equal(d3.selectAll([]).empty(), true);
  test.equal(d3.selectAll([,]).empty(), true);
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.enter() returns an empty selection before a data-join',
  function(test) {
    const body = jsdom('<h1>hello</h1>').body,
      selection = d3.select(body);
    test.deepEqual(selection.enter(), {_groups: [[]], _parents: [null]});
    test.end();
  }
);

tape('selection.enter() contains EnterNodes', function(test) {
  const body = jsdom().body,
    selection = d3
      .select(body)
      .selectAll('div')
      .data([1, 2, 3]);
  test.equal(selection.enter().node()._parent, body);
  test.end();
});

tape('selection.enter() shares the update selection’s parents', function(test) {
  const body = jsdom('<h1>hello</h1>').body,
    selection = d3.select(body);
  test.equal(selection.enter()._parents, selection._parents);
  test.end();
});

tape('selection.enter() returns the same selection each time', function(test) {
  const body = jsdom('<h1>hello</h1>').body,
    selection = d3.select(body);
  test.deepEqual(selection.enter(), selection.enter());
  test.end();
});

tape('selection.enter() contains unbound data after a data-join', function(
  test
) {
  const body = jsdom("<div id='one'></div><div id='two'></div>").body,
    one = body.querySelector('#one'),
    two = body.querySelector('#two'),
    selection = d3
      .select(body)
      .selectAll('div')
      .data(['foo', 'bar', 'baz']);
  test.deepEqual(selection.enter(), {
    _groups: [
      [
        ,
        ,
        {
          __data__: 'baz',
          _next: null,
          _parent: body,
          namespaceURI: 'http://www.w3.org/1999/xhtml',
          ownerDocument: body.ownerDocument
        }
      ]
    ],
    _parents: [body]
  });
  test.end();
});

tape('selection.enter() uses the order of the data', function(test) {
  const body = jsdom(
      "<div id='one'></div><div id='two'></div><div id='three'></div>"
    ).body,
    one = body.querySelector('#one'),
    two = body.querySelector('#two'),
    three = body.querySelector('#three'),
    selection = d3
      .select(body)
      .selectAll('div')
      .data(['one', 'four', 'three', 'five'], function(d) {
        return d || this.id;
      });
  test.deepEqual(selection.enter(), {
    _groups: [
      [
        ,
        {
          __data__: 'four',
          _next: three,
          _parent: body,
          namespaceURI: 'http://www.w3.org/1999/xhtml',
          ownerDocument: body.ownerDocument
        },
        ,
        {
          __data__: 'five',
          _next: null,
          _parent: body,
          namespaceURI: 'http://www.w3.org/1999/xhtml',
          ownerDocument: body.ownerDocument
        }
      ]
    ],
    _parents: [body]
  });
  test.end();
});

tape('enter.append(…) inherits the namespaceURI from the parent', function(
  test
) {
  const body = d3.select(jsdom().body),
    svg = body.append('svg'),
    g = svg
      .selectAll('g')
      .data(['foo'])
      .enter()
      .append('g');
  test.equal(body.node().namespaceURI, 'http://www.w3.org/1999/xhtml');
  test.equal(svg.node().namespaceURI, 'http://www.w3.org/2000/svg');
  test.equal(g.node().namespaceURI, 'http://www.w3.org/2000/svg');
  test.end();
});

tape('enter.append(…) does not override an explicit namespace', function(test) {
  const body = d3.select(jsdom().body),
    svg = body.append('svg'),
    g = svg
      .selectAll('g')
      .data(['foo'])
      .enter()
      .append('xhtml:g');
  test.equal(body.node().namespaceURI, 'http://www.w3.org/1999/xhtml');
  test.equal(svg.node().namespaceURI, 'http://www.w3.org/2000/svg');
  test.equal(g.node().namespaceURI, 'http://www.w3.org/1999/xhtml');
  test.end();
});

tape(
  'enter.append(…) inserts entering nodes before the next node in the update selection',
  function(test) {
    let document = jsdom(),
      identity = function(d) {
        return d;
      },
      p = d3.select(document.body).selectAll('p');
    p = p.data([1, 3], identity);
    p = p
      .enter()
      .append('p')
      .text(identity)
      .merge(p);
    p = p.data([0, 1, 2, 3, 4], identity);
    p = p
      .enter()
      .append('p')
      .text(identity)
      .merge(p);
    test.equal(
      document.body.innerHTML,
      '<p>0</p><p>1</p><p>2</p><p>3</p><p>4</p>'
    );
    test.end();
  }
);

tape(
  'enter.insert(…, before) inserts entering nodes before the sibling matching the specified selector',
  function(test) {
    let document = jsdom('<hr>'),
      identity = function(d) {
        return d;
      },
      p = d3.select(document.body).selectAll('p');
    p = p.data([1, 3], identity);
    p = p
      .enter()
      .insert('p', 'hr')
      .text(identity)
      .merge(p);
    p = p.data([0, 1, 2, 3, 4], identity);
    p = p
      .enter()
      .insert('p', 'hr')
      .text(identity)
      .merge(p);
    test.equal(
      document.body.innerHTML,
      '<p>1</p><p>3</p><p>0</p><p>2</p><p>4</p><hr>'
    );
    test.end();
  }
);

tape(
  'enter.insert(…, null) inserts entering nodes after the last child',
  function(test) {
    let document = jsdom(),
      identity = function(d) {
        return d;
      },
      p = d3.select(document.body).selectAll('p');
    p = p.data([1, 3], identity);
    p = p
      .enter()
      .insert('p', null)
      .text(identity)
      .merge(p);
    p = p.data([0, 1, 2, 3, 4], identity);
    p = p
      .enter()
      .insert('p', null)
      .text(identity)
      .merge(p);
    test.equal(
      document.body.innerHTML,
      '<p>1</p><p>3</p><p>0</p><p>2</p><p>4</p>'
    );
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.exit() returns an empty selection before a data-join', function(
  test
) {
  const body = jsdom('<h1>hello</h1>').body,
    selection = d3.select(body);
  test.deepEqual(selection.exit(), {_groups: [[]], _parents: [null]});
  test.end();
});

tape('selection.exit() shares the update selection’s parents', function(test) {
  const body = jsdom('<h1>hello</h1>').body,
    selection = d3.select(body);
  test.equal(selection.exit()._parents, selection._parents);
  test.end();
});

tape('selection.exit() returns the same selection each time', function(test) {
  const body = jsdom('<h1>hello</h1>').body,
    selection = d3.select(body);
  test.deepEqual(selection.exit(), selection.exit());
  test.end();
});

tape('selection.exit() contains unbound elements after a data-join', function(
  test
) {
  const body = jsdom("<div id='one'></div><div id='two'></div>").body,
    one = body.querySelector('#one'),
    two = body.querySelector('#two'),
    selection = d3
      .select(body)
      .selectAll('div')
      .data(['foo']);
  test.deepEqual(selection.exit(), {
    _groups: [[, two]],
    _parents: [body]
  });
  test.end();
});

tape('selection.exit() uses the order of the originating selection', function(
  test
) {
  const body = jsdom(
      "<div id='one'></div><div id='two'></div><div id='three'></div>"
    ).body,
    one = body.querySelector('#one'),
    two = body.querySelector('#two'),
    three = body.querySelector('#three'),
    selection = d3
      .select(body)
      .selectAll('div')
      .data(['three', 'one'], function(d) {
        return d || this.id;
      });
  test.deepEqual(selection.exit(), {
    _groups: [[, two]],
    _parents: [body]
  });
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.filter(…) returns a selection', function(test) {
  const document = jsdom('<h1>hello</h1>');
  test.ok(d3.select(document.body).filter('body') instanceof d3.selection);
  test.end();
});

tape(
  'selection.filter(string) retains the selected elements that matches the selector string',
  function(test) {
    const document = jsdom(
        "<h1><span id='one'></span><span id='two'></span></h1><h1><span id='three'></span><span id='four'></span></h1>"
      ),
      one = document.querySelector('#one'),
      three = document.querySelector('#three');
    test.deepEqual(
      d3
        .select(document)
        .selectAll('span')
        .filter('#one,#three'),
      {_groups: [[one, three]], _parents: [document]}
    );
    test.end();
  }
);

tape(
  'selection.filter(function) retains elements for which the given function returns true',
  function(test) {
    const document = jsdom(
        "<h1><span id='one'></span><span id='two'></span></h1><h1><span id='three'></span><span id='four'></span></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four');
    test.deepEqual(
      d3.selectAll([one, two, three, four]).filter(function(d, i) {
        return i & 1;
      }),
      {_groups: [[two, four]], _parents: [null]}
    );
    test.end();
  }
);

tape(
  'selection.filter(function) passes the selector function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .filter(function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);

tape(
  'selection.filter(…) propagates parents from the originating selection',
  function(test) {
    const document = jsdom(
        '<parent><child>1</child></parent><parent><child>2</child></parent>'
      ),
      parents = d3.select(document).selectAll('parent'),
      parents2 = parents.filter(function() {
        return true;
      });
    test.deepEqual(parents, {
      _groups: [document.querySelectorAll('parent')],
      _parents: [document]
    });
    test.deepEqual(parents2, {
      _groups: [document.querySelectorAll('parent')],
      _parents: [document]
    });
    test.ok(parents._parents === parents2._parents); // Not copied!
    test.end();
  }
);

tape(
  'selection.filter(…) can filter elements when the originating selection is nested',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child><span id='three'></span></child></parent><parent id='two'><child><span id='four'></span></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four');
    test.deepEqual(
      d3
        .selectAll([one, two])
        .selectAll('span')
        .filter('*'),
      {_groups: [[three], [four]], _parents: [one, two]}
    );
    test.end();
  }
);

tape(
  'selection.filter(…) skips missing originating elements and does not retain the original indexes',
  function(test) {
    const document = jsdom('<h1>hello</h1>'),
      h1 = document.querySelector('h1');
    test.deepEqual(d3.selectAll([, h1]).filter('*'), {
      _groups: [[h1]],
      _parents: [null]
    });
    test.deepEqual(d3.selectAll([null, h1]).filter('*'), {
      _groups: [[h1]],
      _parents: [null]
    });
    test.deepEqual(d3.selectAll([undefined, h1]).filter('*'), {
      _groups: [[h1]],
      _parents: [null]
    });
    test.end();
  }
);

tape(
  'selection.filter(…) skips missing originating elements when the originating selection is nested',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child></child><child id='three'></child></parent><parent id='two'><child></child><child id='four'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four');
    test.deepEqual(
      d3
        .selectAll([one, two])
        .selectAll('child')
        .select(function(d, i) {
          return i & 1 ? this : null;
        })
        .filter('*'),
      {_groups: [[three], [four]], _parents: [one, two]}
    );
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.html() returns the inner HTML on the first selected element',
  function(test) {
    const node = {innerHTML: 'hello'};
    test.equal(d3.select(node).html(), 'hello');
    test.equal(d3.selectAll([null, node]).html(), 'hello');
    test.end();
  }
);

tape('selection.html(value) sets inner HTML on the selected elements', function(
  test
) {
  const one = {innerHTML: ''},
    two = {innerHTML: ''},
    selection = d3.selectAll([one, two]);
  test.equal(selection.html('bar'), selection);
  test.equal(one.innerHTML, 'bar');
  test.equal(two.innerHTML, 'bar');
  test.end();
});

tape(
  'selection.html(null) clears the inner HTML on the selected elements',
  function(test) {
    const one = {innerHTML: 'bar'},
      two = {innerHTML: 'bar'},
      selection = d3.selectAll([one, two]);
    test.equal(selection.html(null), selection);
    test.equal(one.innerHTML, '');
    test.equal(two.innerHTML, '');
    test.end();
  }
);

tape(
  'selection.html(function) sets the value of the inner HTML on the selected elements',
  function(test) {
    const one = {innerHTML: 'bar'},
      two = {innerHTML: 'bar'},
      selection = d3.selectAll([one, two]);
    test.equal(
      selection.html(function(d, i) {
        return i ? 'baz' : null;
      }),
      selection
    );
    test.equal(one.innerHTML, '');
    test.equal(two.innerHTML, 'baz');
    test.end();
  }
);

tape(
  'selection.html(function) passes the value function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .html(function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('d3.selection() returns a selection of the document element', function(
  test
) {
  const document = (global.document = jsdom());
  try {
    test.equal(d3.selection().node(), document.documentElement);
    test.end();
  } finally {
    delete global.document;
  }
});

tape('d3.selection.prototype can be extended', function(test) {
  const document = jsdom("<input type='checkbox'>"),
    s = d3.select(document.querySelector('[type=checkbox]'));
  try {
    d3.selection.prototype.checked = function(value) {
      return arguments.length
        ? this.property('checked', !!value)
        : this.property('checked');
    };
    test.equal(s.checked(), false);
    test.equal(s.checked(true), s);
    test.equal(s.checked(), true);
    test.end();
  } finally {
    delete d3.selection.prototype.checked;
  }
});

tape('d3.selection() returns an instanceof d3.selection', function(test) {
  const document = (global.document = jsdom());
  try {
    test.ok(d3.selection() instanceof d3.selection);
    test.end();
  } finally {
    delete global.document;
  }
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.insert(name, before) inserts a new element of the specified name before the specified child of each selected element',
  function(test) {
    const document = jsdom(
        "<div id='one'><span class='before'></span></div><div id='two'><span class='before'></span></div>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).insert('span', '.before'),
      three = one.querySelector('span:first-child'),
      four = two.querySelector('span:first-child');
    test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
    test.end();
  }
);

tape(
  'selection.insert(function, function) inserts the returned element before the specified child of each selected element',
  function(test) {
    const document = jsdom(
        "<div id='one'><span class='before'></span></div><div id='two'><span class='before'></span></div>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).insert(
        function() {
          return document.createElement('SPAN');
        },
        function() {
          return this.firstChild;
        }
      ),
      three = one.querySelector('span:first-child'),
      four = two.querySelector('span:first-child');
    test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
    test.end();
  }
);

tape(
  'selection.insert(function, function) inserts the returned element as the last child if the selector function returns null',
  function(test) {
    const document = jsdom(
        "<div id='one'><span class='before'></span></div><div id='two'><span class='before'></span></div>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).insert(
        function() {
          return document.createElement('SPAN');
        },
        function() {
          return;
        }
      ),
      three = one.querySelector('span:last-child'),
      four = two.querySelector('span:last-child');
    test.deepEqual(selection, {_groups: [[three, four]], _parents: [null]});
    test.end();
  }
);

tape(
  'selection.insert(name, function) passes the selector function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .insert('span', function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.join(name) enter-appends elements', function(test) {
  let document = jsdom(),
    p = d3.select(document.body).selectAll('p');
  p = p
    .data([1, 3])
    .join('p')
    .text(d => d);
  test.equal(document.body.innerHTML, '<p>1</p><p>3</p>');
  test.end();
});

tape('selection.join(name) exit-removes elements', function(test) {
  let document = jsdom('<p>1</p><p>2</p><p>3</p>'),
    p = d3.select(document.body).selectAll('p');
  p = p
    .data([1, 3])
    .join('p')
    .text(d => d);
  test.equal(document.body.innerHTML, '<p>1</p><p>3</p>');
  test.end();
});

tape(
  'selection.join(enter, update, exit) calls the specified functions',
  function(test) {
    let document = jsdom('<p>1</p><p>2</p>'),
      p = d3
        .select(document.body)
        .selectAll('p')
        .datum(function() {
          return this.textContent;
        });
    p = p
      .data([1, 3], d => d)
      .join(
        enter =>
          enter
            .append('p')
            .attr('class', 'enter')
            .text(d => d),
        update => update.attr('class', 'update'),
        exit => exit.attr('class', 'exit')
      );
    test.equal(
      document.body.innerHTML,
      '<p class="update">1</p><p class="exit">2</p><p class="enter">3</p>'
    );
    test.end();
  }
);

tape('selection.join(…) reorders nodes to match the data', function(test) {
  let document = jsdom(),
    p = d3.select(document.body).selectAll('p');
  p = p.data([1, 3], d => d).join(enter => enter.append('p').text(d => d));
  test.equal(document.body.innerHTML, '<p>1</p><p>3</p>');
  p = p
    .data([0, 3, 1, 2, 4], d => d)
    .join(enter => enter.append('p').text(d => d));
  test.equal(
    document.body.innerHTML,
    '<p>0</p><p>3</p><p>1</p><p>2</p><p>4</p>'
  );
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.merge(selection) returns a new selection, merging the two selections',
  function(test) {
    const document = jsdom("<h1 id='one'>one</h1><h1 id='two'>two</h1>"),
      body = document.body,
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection0 = d3.select(body).selectAll('h1'),
      selection1 = selection0.select(function(d, i) {
        return i & 1 ? this : null;
      }),
      selection2 = selection0.select(function(d, i) {
        return i & 1 ? null : this;
      });
    test.deepEqual(selection1.merge(selection2), {
      _groups: [[one, two]],
      _parents: [body]
    });
    test.deepEqual(selection1, {_groups: [[, two]], _parents: [body]});
    test.deepEqual(selection2, {_groups: [[one]], _parents: [body]});
    test.end();
  }
);

tape(
  'selection.merge(selection) returns a selection with the same size and parents as this selection',
  function(test) {
    const document0 = jsdom("<h1 id='one'>one</h1><h1 id='two'>two</h1>"),
      document1 = jsdom(
        "<h1 id='one'>one</h1><h1 id='two'>two</h1><h1 id='three'>three</h1>"
      ),
      body0 = document0.body,
      body1 = document1.body,
      one0 = document0.querySelector('#one'),
      one1 = document1.querySelector('#one'),
      two0 = document0.querySelector('#two'),
      two1 = document1.querySelector('#two'),
      three1 = document1.querySelector('#three');
    test.deepEqual(
      d3
        .select(body0)
        .selectAll('h1')
        .merge(d3.select(body1).selectAll('h1')),
      {_groups: [[one0, two0]], _parents: [body0]}
    );
    test.deepEqual(
      d3
        .select(body1)
        .selectAll('h1')
        .merge(d3.select(body0).selectAll('h1')),
      {_groups: [[one1, two1, three1]], _parents: [body1]}
    );
    test.end();
  }
);

tape(
  'selection.merge(selection) reuses groups from this selection if the other selection has fewer groups',
  function(test) {
    const document = jsdom(
        '<parent><child></child><child></child></parent><parent><child></child><child></child></parent>'
      ),
      body = document.body,
      selection0 = d3
        .select(body)
        .selectAll('parent')
        .selectAll('child'),
      selection1 = d3
        .select(body)
        .selectAll('parent:first-child')
        .selectAll('child'),
      selection01 = selection0.merge(selection1),
      selection10 = selection1.merge(selection0);
    test.deepEqual(selection01, selection0);
    test.deepEqual(selection10, selection1);
    test.equal(selection01._groups[1], selection0._groups[1]);
    test.end();
  }
);

tape('selection.merge(selection) reuses this selection’s parents', function(
  test
) {
  const document = jsdom(
      '<parent><child></child><child></child></parent><parent><child></child><child></child></parent>'
    ),
    body = document.body,
    selection0 = d3
      .select(body)
      .selectAll('parent')
      .selectAll('child'),
    selection1 = d3
      .select(body)
      .selectAll('parent:first-child')
      .selectAll('child'),
    selection01 = selection0.merge(selection1),
    selection10 = selection1.merge(selection0);
  test.equal(selection01._parents, selection0._parents);
  test.equal(selection10._parents, selection1._parents);
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.node() returns the first element in a selection', function(
  test
) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two');
  test.equal(d3.selectAll([one, two]).node(), one);
  test.end();
});

tape('selection.node() skips missing elements', function(test) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two');
  test.equal(d3.selectAll([, one, , two]).node(), one);
  test.end();
});

tape('selection.node() skips empty groups', function(test) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two');
  test.equal(
    d3
      .selectAll([one, two])
      .selectAll(function(d, i) {
        return i ? [this] : [];
      })
      .node(),
    two
  );
  test.end();
});

tape('selection.node() returns null for an empty selection', function(test) {
  test.equal(d3.select(null).node(), null);
  test.equal(d3.selectAll([]).node(), null);
  test.equal(d3.selectAll([, ,]).node(), null);
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.nodes() returns an array containing all selected nodes',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two');
    test.deepEqual(d3.selectAll([one, two]).nodes(), [one, two]);
    test.end();
  }
);

tape(
  'selection.nodes() merges nodes from all groups into a single array',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two');
    test.deepEqual(
      d3
        .selectAll([one, two])
        .selectAll(function() {
          return [this];
        })
        .nodes(),
      [one, two]
    );
    test.end();
  }
);

tape('selection.nodes() skips missing elements', function(test) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two');
  test.deepEqual(d3.selectAll([, one, , two]).nodes(), [one, two]);
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.on(type, listener) registers a listeners for the specified event type on each selected element',
  function(test) {
    let clicks = 0,
      document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]);
    test.equal(
      selection.on('click', function() {
        ++clicks;
      }),
      selection
    );
    selection.dispatch('click');
    test.equal(clicks, 2);
    selection.dispatch('tick');
    test.equal(clicks, 2);
    test.end();
  }
);

tape(
  'selection.on(type, listener) observes the specified name, if any',
  function(test) {
    let foo = 0,
      bar = 0,
      document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3
        .selectAll([one, two])
        .on('click.foo', function() {
          ++foo;
        })
        .on('click.bar', function() {
          ++bar;
        });
    selection.dispatch('click');
    test.equal(foo, 2);
    test.equal(bar, 2);
    test.end();
  }
);

tape(
  'selection.on(type, listener, capture) observes the specified capture flag, if any',
  function(test) {
    let result,
      selection = d3.select({
        addEventListener: function(type, listener, capture) {
          result = capture;
        }
      });
    test.equal(
      selection.on('click.foo', function() {}, true),
      selection
    );
    test.deepEqual(result, true);
    test.end();
  }
);

tape(
  'selection.on(type) returns the listener for the specified event type, if any',
  function(test) {
    const clicked = function() {},
      document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).on('click', clicked);
    test.equal(selection.on('click'), clicked);
    test.end();
  }
);

tape('selection.on(type) observes the specified name, if any', function(test) {
  const clicked = function() {},
    document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3.selectAll([one, two]).on('click.foo', clicked);
  test.equal(selection.on('click'), undefined);
  test.equal(selection.on('click.foo'), clicked);
  test.equal(selection.on('click.bar'), undefined);
  test.equal(selection.on('tick.foo'), undefined);
  test.equal(selection.on('.foo'), undefined);
  test.end();
});

tape(
  'selection.on(type, null) removes the listener with the specified name, if any',
  function(test) {
    let clicks = 0,
      document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]).on('click', function() {
        ++clicks;
      });
    test.equal(selection.on('click', null), selection);
    test.equal(selection.on('click'), undefined);
    selection.dispatch('click');
    test.equal(clicks, 0);
    test.end();
  }
);

tape('selection.on(type, null) observes the specified name, if any', function(
  test
) {
  let foo = 0,
    bar = 0,
    fooed = function() {
      ++foo;
    },
    barred = function() {
      ++bar;
    },
    document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3
      .selectAll([one, two])
      .on('click.foo', fooed)
      .on('click.bar', barred);
  test.equal(selection.on('click.foo', null), selection);
  test.equal(selection.on('click.foo'), undefined);
  test.equal(selection.on('click.bar'), barred);
  selection.dispatch('click');
  test.equal(foo, 0);
  test.equal(bar, 2);
  test.end();
});

tape(
  'selection.on(type, null, capture) ignores the specified capture flag, if any',
  function(test) {
    let clicks = 0,
      clicked = function() {
        ++clicks;
      },
      document = jsdom(),
      selection = d3.select(document).on('click.foo', clicked, true);
    selection.dispatch('click');
    test.equal(clicks, 1);
    selection.on('.foo', null, false).dispatch('click');
    test.equal(clicks, 1);
    test.equal(selection.on('click.foo'), undefined);
    test.end();
  }
);

tape(
  'selection.on(name, null) removes all listeners with the specified name',
  function(test) {
    let clicks = 0,
      loads = 0,
      clicked = function() {
        ++clicks;
      },
      loaded = function() {
        ++loads;
      },
      document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3
        .selectAll([one, two])
        .on('click.foo', clicked)
        .on('load.foo', loaded);
    test.equal(selection.on('click.foo'), clicked);
    test.equal(selection.on('load.foo'), loaded);
    selection.dispatch('click');
    selection.dispatch('load');
    test.equal(clicks, 2);
    test.equal(loads, 2);
    test.equal(selection.on('.foo', null), selection);
    test.equal(selection.on('click.foo'), undefined);
    test.equal(selection.on('load.foo'), undefined);
    selection.dispatch('click');
    selection.dispatch('load');
    test.equal(clicks, 2);
    test.equal(loads, 2);
    test.end();
  }
);

tape('selection.on(name, null) can remove a listener with capture', function(
  test
) {
  let clicks = 0,
    clicked = function() {
      ++clicks;
    },
    document = jsdom(),
    selection = d3.select(document).on('click.foo', clicked, true);
  selection.dispatch('click');
  test.equal(clicks, 1);
  selection.on('.foo', null).dispatch('click');
  test.equal(clicks, 1);
  test.equal(selection.on('click.foo'), undefined);
  test.end();
});

tape('selection.on(name, listener) has no effect', function(test) {
  let clicks = 0,
    clicked = function() {
      ++clicks;
    },
    document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3.selectAll([one, two]).on('click.foo', clicked);
  test.equal(
    selection.on('.foo', function() {
      throw new Error();
    }),
    selection
  );
  test.equal(selection.on('click.foo'), clicked);
  selection.dispatch('click');
  test.equal(clicks, 2);
  test.end();
});

tape('selection.on(type) skips missing elements', function(test) {
  const clicked = function() {},
    document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3.selectAll([one, two]).on('click.foo', clicked);
  test.equal(d3.selectAll([, two]).on('click.foo'), clicked);
  test.end();
});

tape('selection.on(type, listener) skips missing elements', function(test) {
  let clicks = 0,
    clicked = function() {
      ++clicks;
    },
    document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3.selectAll([, two]).on('click.foo', clicked);
  selection.dispatch('click');
  test.equal(clicks, 1);
  test.end();
});

tape(
  'selection.on(type, listener) passes the listener data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    const selection = d3
      .selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .on('foo', function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, []);
    selection.dispatch('foo');
    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);

tape(
  'selection.on(type, listener) passes the listener the index as of registration time',
  function(test) {
    let result,
      document = jsdom("<parent id='one'></parent>"),
      one = document.querySelector('#one'),
      selection = d3.selectAll([, one]).on('click', function(d, i) {
        result = i;
      });
    selection.dispatch('click');
    test.deepEqual(selection, {_groups: [[, one]], _parents: [null]});
    test.equal(result, 1);
    selection = selection.sort().dispatch('click');
    test.deepEqual(selection, {_groups: [[one]], _parents: [null]});
    test.equal(result, 1);
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.order() moves selected elements so that they are before their next sibling',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([two, one]);
    test.equal(selection.order(), selection);
    test.equal(one.nextSibling, null);
    test.equal(two.nextSibling, one);
    test.end();
  }
);

tape('selection.order() only orders within each group', function(test) {
  const document = jsdom(
      "<h1><span id='one'></span></h1><h1><span id='two'></span></h1>"
    ),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3
      .select(document)
      .selectAll('h1')
      .selectAll('span');
  test.equal(selection.order(), selection);
  test.equal(one.nextSibling, null);
  test.equal(two.nextSibling, null);
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.property(name) returns the property with the specified name on the first selected element',
  function(test) {
    const node = {foo: 42};
    test.equal(d3.select(node).property('foo'), 42);
    test.equal(d3.selectAll([null, node]).property('foo'), 42);
    test.end();
  }
);

tape(
  'selection.property(name, value) sets property with the specified name on the selected elements',
  function(test) {
    const one = {},
      two = {},
      selection = d3.selectAll([one, two]);
    test.equal(selection.property('foo', 'bar'), selection);
    test.equal(one.foo, 'bar');
    test.equal(two.foo, 'bar');
    test.end();
  }
);

tape(
  'selection.property(name, null) removes the property with the specified name on the selected elements',
  function(test) {
    const one = {foo: 'bar'},
      two = {foo: 'bar'},
      selection = d3.selectAll([one, two]);
    test.equal(selection.property('foo', null), selection);
    test.equal('foo' in one, false);
    test.equal('foo' in two, false);
    test.end();
  }
);

tape(
  'selection.property(name, function) sets the value of the property with the specified name on the selected elements',
  function(test) {
    const one = {foo: 'bar'},
      two = {foo: 'bar'},
      selection = d3.selectAll([one, two]);
    test.equal(
      selection.property('foo', function(d, i) {
        return i ? 'baz' : null;
      }),
      selection
    );
    test.equal('foo' in one, false);
    test.equal(two.foo, 'baz');
    test.end();
  }
);

tape(
  'selection.property(name, function) passes the value function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .property('color', function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.remove() removes selected elements from their parent', function(
  test
) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3.selectAll([two, one]);
  test.equal(selection.remove(), selection);
  test.equal(one.parentNode, null);
  test.equal(two.parentNode, null);
  test.end();
});

tape(
  'selection.remove() skips elements that have already been detached',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([two, one]);
    one.parentNode.removeChild(one);
    test.equal(selection.remove(), selection);
    test.equal(one.parentNode, null);
    test.equal(two.parentNode, null);
    test.end();
  }
);

tape('selection.remove() skips missing elements', function(test) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3.selectAll([, one]);
  test.equal(selection.remove(), selection);
  test.equal(one.parentNode, null);
  test.equal(two.parentNode, document.body);
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.select(…) returns a selection', function(test) {
  const document = jsdom('<h1>hello</h1>');
  test.ok(d3.select(document).select('h1') instanceof d3.selection);
  test.end();
});

tape(
  'selection.select(string) selects the first descendant that matches the selector string for each selected element',
  function(test) {
    const document = jsdom(
        "<h1><span id='one'></span><span id='two'></span></h1><h1><span id='three'></span><span id='four'></span></h1>"
      ),
      one = document.querySelector('#one'),
      three = document.querySelector('#three');
    test.deepEqual(
      d3
        .select(document)
        .selectAll('h1')
        .select('span'),
      {_groups: [[one, three]], _parents: [document]}
    );
    test.end();
  }
);

tape(
  'selection.select(function) selects the return value of the given function for each selected element',
  function(test) {
    const document = jsdom("<span id='one'></span>"),
      one = document.querySelector('#one');
    test.deepEqual(
      d3.select(document).select(function() {
        return one;
      }),
      {_groups: [[one]], _parents: [null]}
    );
    test.end();
  }
);

tape(
  'selection.select(function) passes the selector function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .select(function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);

tape(
  'selection.select(…) propagates data if defined on the originating element',
  function(test) {
    const document = jsdom('<parent><child>hello</child></parent>'),
      parent = document.querySelector('parent'),
      child = document.querySelector('child');
    parent.__data__ = 0; // still counts as data even though falsey
    child.__data__ = 42;
    d3.select(parent).select('child');
    test.equal(child.__data__, 0);
    test.end();
  }
);

tape(
  'selection.select(…) will not propagate data if not defined on the originating element',
  function(test) {
    const document = jsdom('<parent><child>hello</child></parent>'),
      parent = document.querySelector('parent'),
      child = document.querySelector('child');
    child.__data__ = 42;
    d3.select(parent).select('child');
    test.equal(child.__data__, 42);
    test.end();
  }
);

tape(
  'selection.select(…) propagates parents from the originating selection',
  function(test) {
    const document = jsdom(
        '<parent><child>1</child></parent><parent><child>2</child></parent>'
      ),
      parents = d3.select(document).selectAll('parent'),
      childs = parents.select('child');
    test.deepEqual(parents, {
      _groups: [document.querySelectorAll('parent')],
      _parents: [document]
    });
    test.deepEqual(childs, {
      _groups: [document.querySelectorAll('child')],
      _parents: [document]
    });
    test.ok(parents._parents === childs._parents); // Not copied!
    test.end();
  }
);

tape(
  'selection.select(…) can select elements when the originating selection is nested',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child><span id='three'></span></child></parent><parent id='two'><child><span id='four'></span></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four');
    test.deepEqual(
      d3
        .selectAll([one, two])
        .selectAll('child')
        .select('span'),
      {_groups: [[three], [four]], _parents: [one, two]}
    );
    test.end();
  }
);

tape('selection.select(…) skips missing originating elements', function(test) {
  const document = jsdom('<h1><span>hello</span></h1>'),
    h1 = document.querySelector('h1'),
    span = document.querySelector('span');
  test.deepEqual(d3.selectAll([, h1]).select('span'), {
    _groups: [[, span]],
    _parents: [null]
  });
  test.deepEqual(d3.selectAll([null, h1]).select('span'), {
    _groups: [[, span]],
    _parents: [null]
  });
  test.deepEqual(d3.selectAll([undefined, h1]).select('span'), {
    _groups: [[, span]],
    _parents: [null]
  });
  test.end();
});

tape(
  'selection.select(…) skips missing originating elements when the originating selection is nested',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child></child><child><span id='three'></span></child></parent><parent id='two'><child></child><child><span id='four'></span></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four');
    test.deepEqual(
      d3
        .selectAll([one, two])
        .selectAll('child')
        .select(function(d, i) {
          return i & 1 ? this : null;
        })
        .select('span'),
      {
        _groups: [
          [, three],
          [, four]
        ],
        _parents: [one, two]
      }
    );
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.selectAll(…) returns a selection', function(test) {
  const document = jsdom('<h1>hello</h1>');
  test.ok(d3.select(document).selectAll('h1') instanceof d3.selection);
  test.end();
});

tape(
  'selection.selectAll(string) selects all descendants that match the selector string for each selected element',
  function(test) {
    const document = jsdom(
        "<h1 id='one'><span></span><span></span></h1><h1 id='two'><span></span><span></span></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two');
    test.deepEqual(d3.selectAll([one, two]).selectAll('span'), {
      _groups: [one.querySelectorAll('span'), two.querySelectorAll('span')],
      _parents: [one, two]
    });
    test.end();
  }
);

tape(
  'selection.selectAll(function) selects the return values of the given function for each selected element',
  function(test) {
    const document = jsdom("<span id='one'></span>"),
      one = document.querySelector('#one');
    test.deepEqual(
      d3.select(document).selectAll(function() {
        return [one];
      }),
      {_groups: [[one]], _parents: [document]}
    );
    test.end();
  }
);

tape(
  'selection.selectAll(function) passes the selector function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .selectAll(function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);

tape('selection.selectAll(…) will not propagate data', function(test) {
  const document = jsdom('<parent><child>hello</child></parent>'),
    parent = document.querySelector('parent'),
    child = document.querySelector('child');
  parent.__data__ = 42;
  d3.select(parent).selectAll('child');
  test.ok(!('__data__' in child));
  test.end();
});

tape(
  'selection.selectAll(…) groups selected elements by their parent in the originating selection',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child></parent><parent id='two'><child id='four'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four');
    test.deepEqual(
      d3
        .select(document)
        .selectAll('parent')
        .selectAll('child'),
      {_groups: [[three], [four]], _parents: [one, two]}
    );
    test.deepEqual(d3.select(document).selectAll('child'), {
      _groups: [[three, four]],
      _parents: [document]
    });
    test.end();
  }
);

tape(
  'selection.selectAll(…) can select elements when the originating selection is nested',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'><span id='five'></span></child></parent><parent id='two'><child id='four'><span id='six'></span></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      six = document.querySelector('#six');
    test.deepEqual(
      d3
        .selectAll([one, two])
        .selectAll('child')
        .selectAll('span'),
      {_groups: [[five], [six]], _parents: [three, four]}
    );
    test.end();
  }
);

tape('selection.selectAll(…) skips missing originating elements', function(
  test
) {
  const document = jsdom('<h1><span>hello</span></h1>'),
    h1 = document.querySelector('h1'),
    span = document.querySelector('span');
  test.deepEqual(d3.selectAll([, h1]).selectAll('span'), {
    _groups: [[span]],
    _parents: [h1]
  });
  test.deepEqual(d3.selectAll([null, h1]).selectAll('span'), {
    _groups: [[span]],
    _parents: [h1]
  });
  test.deepEqual(d3.selectAll([undefined, h1]).selectAll('span'), {
    _groups: [[span]],
    _parents: [h1]
  });
  test.end();
});

tape(
  'selection.selectAll(…) skips missing originating elements when the originating selection is nested',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child></child><child id='three'><span id='five'></span></child></parent><parent id='two'><child></child><child id='four'><span id='six'></span></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      six = document.querySelector('#six');
    test.deepEqual(
      d3
        .selectAll([one, two])
        .selectAll('child')
        .select(function(d, i) {
          return i & 1 ? this : null;
        })
        .selectAll('span'),
      {_groups: [[five], [six]], _parents: [three, four]}
    );
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape('selection.size() returns the number of selected elements', function(
  test
) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two');
  test.deepEqual(d3.selectAll([]).size(), 0);
  test.deepEqual(d3.selectAll([one]).size(), 1);
  test.deepEqual(d3.selectAll([one, two]).size(), 2);
  test.end();
});

tape('selection.size() skips missing elements', function(test) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two');
  test.deepEqual(d3.selectAll([, one, , two]).size(), 2);
  test.end();
});
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.sort(…) returns a new selection, sorting each group’s data, and then ordering the elements to match',
  function(test) {
    const document = jsdom(
        "<h1 id='one' data-value='1'></h1><h1 id='two' data-value='0'></h1><h1 id='three' data-value='2'></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      selection0 = d3.selectAll([two, three, one]).datum(function() {
        return +this.getAttribute('data-value');
      }),
      selection1 = selection0.sort(function(a, b) {
        return a - b;
      });
    test.deepEqual(selection0, {
      _groups: [[two, three, one]],
      _parents: [null]
    });
    test.deepEqual(selection1, {
      _groups: [[two, one, three]],
      _parents: [null]
    });
    test.equal(two.nextSibling, one);
    test.equal(one.nextSibling, three);
    test.equal(three.nextSibling, null);
    test.end();
  }
);

tape('selection.sort(…) sorts each group separately', function(test) {
  const document = jsdom(
      "<div id='one'><h1 id='three' data-value='1'></h1><h1 id='four' data-value='0'></h1></div><div id='two'><h1 id='five' data-value='3'></h1><h1 id='six' data-value='-1'></h1></div>"
    ),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    three = document.querySelector('#three'),
    four = document.querySelector('#four'),
    five = document.querySelector('#five'),
    six = document.querySelector('#six'),
    selection = d3
      .selectAll([one, two])
      .selectAll('h1')
      .datum(function() {
        return +this.getAttribute('data-value');
      });
  test.deepEqual(
    selection.sort(function(a, b) {
      return a - b;
    }),
    {
      _groups: [
        [four, three],
        [six, five]
      ],
      _parents: [one, two]
    }
  );
  test.equal(four.nextSibling, three);
  test.equal(three.nextSibling, null);
  test.equal(six.nextSibling, five);
  test.equal(five.nextSibling, null);
  test.end();
});

tape('selection.sort() uses natural ascending order', function(test) {
  const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
    one = document.querySelector('#one'),
    two = document.querySelector('#two'),
    selection = d3.selectAll([two, one]).datum(function(d, i) {
      i;
    });
  test.deepEqual(selection.sort(), {_groups: [[two, one]], _parents: [null]});
  test.equal(one.nextSibling, null);
  test.equal(two.nextSibling, one);
  test.end();
});

tape(
  'selection.sort() puts missing elements at the end of each group',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([two, one]).datum(function(d, i) {
        return i;
      });
    test.deepEqual(d3.selectAll([, one, , two]).sort(), {
      _groups: [[two, one, ,]],
      _parents: [null]
    });
    test.equal(two.nextSibling, one);
    test.equal(one.nextSibling, null);
    test.end();
  }
);

tape(
  'selection.sort(function) puts missing elements at the end of each group',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([two, one]).datum(function(d, i) {
        return i;
      });
    test.deepEqual(
      d3.selectAll([, one, , two]).sort(function(a, b) {
        return b - a;
      }),
      {_groups: [[one, two, ,]], _parents: [null]}
    );
    test.equal(one.nextSibling, two);
    test.equal(two.nextSibling, null);
    test.end();
  }
);

tape(
  'selection.sort(function) uses the specified data comparator function',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([two, one]).datum(function(d, i) {
        return i;
      });
    test.deepEqual(
      selection.sort(function(a, b) {
        return b - a;
      }),
      {_groups: [[one, two]], _parents: [null]}
    );
    test.equal(one.nextSibling, two);
    test.equal(two.nextSibling, null);
    test.end();
  }
);

tape(
  'selection.sort(function) returns a new selection, and does not modify the groups array in-place',
  function(test) {
    const document = jsdom("<h1 id='one'></h1><h1 id='two'></h1>"),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection0 = d3.selectAll([one, two]).datum(function(d, i) {
        return i;
      }),
      selection1 = selection0.sort(function(a, b) {
        return b - a;
      }),
      selection2 = selection1.sort();
    test.deepEqual(selection0, {_groups: [[one, two]], _parents: [null]});
    test.deepEqual(selection1, {_groups: [[two, one]], _parents: [null]});
    test.deepEqual(selection2, {_groups: [[one, two]], _parents: [null]});
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'd3.style(node, name) returns the inline value of the style property with the specified name on the first selected element, if present',
  function(test) {
    const node = {
      style: {
        getPropertyValue: function(name) {
          return name === 'color' ? 'red' : '';
        }
      }
    };
    test.equal(d3.style(node, 'color'), 'red');
    test.end();
  }
);

tape(
  'd3.style(node, name) returns the computed value of the style property with the specified name on the first selected element, if there is no inline style',
  function(test) {
    var style = {
        getPropertyValue: function(name) {
          return name === 'color' ? 'rgb(255, 0, 0)' : '';
        }
      },
      node = {
        style: {
          getPropertyValue: function() {
            return '';
          }
        },
        ownerDocument: {
          defaultView: {
            getComputedStyle: function(n) {
              return n === node ? style : null;
            }
          }
        }
      };
    test.equal(d3.style(node, 'color'), 'rgb(255, 0, 0)');
    test.end();
  }
);

tape(
  'selection.style(name) returns the inline value of the style property with the specified name on the first selected element, if present',
  function(test) {
    const node = {
      style: {
        getPropertyValue: function(name) {
          return name === 'color' ? 'red' : '';
        }
      }
    };
    test.equal(d3.select(node).style('color'), 'red');
    test.equal(d3.selectAll([null, node]).style('color'), 'red');
    test.end();
  }
);

tape(
  'selection.style(name) returns the computed value of the style property with the specified name on the first selected element, if there is no inline style',
  function(test) {
    var style = {
        getPropertyValue: function(name) {
          return name === 'color' ? 'rgb(255, 0, 0)' : '';
        }
      },
      node = {
        style: {
          getPropertyValue: function() {
            return '';
          }
        },
        ownerDocument: {
          defaultView: {
            getComputedStyle: function(n) {
              return n === node ? style : null;
            }
          }
        }
      };
    test.equal(d3.select(node).style('color'), 'rgb(255, 0, 0)');
    test.equal(d3.selectAll([null, node]).style('color'), 'rgb(255, 0, 0)');
    test.end();
  }
);

tape(
  'selection.style(name, value) sets the value of the style property with the specified name on the selected elements',
  function(test) {
    const document = jsdom(
        "<h1 id='one' class='c1 c2'>hello</h1><h1 id='two' class='c3'></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]);
    test.equal(selection.style('color', 'red'), selection);
    test.equal(one.style.getPropertyValue('color'), 'red');
    test.equal(one.style.getPropertyPriority('color'), '');
    test.equal(two.style.getPropertyValue('color'), 'red');
    test.equal(two.style.getPropertyPriority('color'), '');
    test.end();
  }
);

tape(
  'selection.style(name, value, priority) sets the value and priority of the style property with the specified name on the selected elements',
  function(test) {
    const document = jsdom(
        "<h1 id='one' class='c1 c2'>hello</h1><h1 id='two' class='c3'></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]);
    test.equal(selection.style('color', 'red', 'important'), selection);
    test.equal(one.style.getPropertyValue('color'), 'red');
    test.equal(one.style.getPropertyPriority('color'), 'important');
    test.equal(two.style.getPropertyValue('color'), 'red');
    test.equal(two.style.getPropertyPriority('color'), 'important');
    test.end();
  }
);

tape(
  'selection.style(name, null) removes the attribute with the specified name on the selected elements',
  function(test) {
    const document = jsdom(
        "<h1 id='one' style='color:red;' class='c1 c2'>hello</h1><h1 id='two' style='color:red;' class='c3'></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]);
    test.equal(selection.style('color', null), selection);
    test.equal(one.style.getPropertyValue('color'), '');
    test.equal(one.style.getPropertyPriority('color'), '');
    test.equal(two.style.getPropertyValue('color'), '');
    test.equal(two.style.getPropertyPriority('color'), '');
    test.end();
  }
);

tape(
  'selection.style(name, function) sets the value of the style property with the specified name on the selected elements',
  function(test) {
    const document = jsdom(
        "<h1 id='one' class='c1 c2'>hello</h1><h1 id='two' class='c3'></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]);
    test.equal(
      selection.style('color', function(d, i) {
        return i ? 'red' : null;
      }),
      selection
    );
    test.equal(one.style.getPropertyValue('color'), '');
    test.equal(one.style.getPropertyPriority('color'), '');
    test.equal(two.style.getPropertyValue('color'), 'red');
    test.equal(two.style.getPropertyPriority('color'), '');
    test.end();
  }
);

tape(
  'selection.style(name, function, priority) sets the value and priority of the style property with the specified name on the selected elements',
  function(test) {
    const document = jsdom(
        "<h1 id='one' class='c1 c2'>hello</h1><h1 id='two' class='c3'></h1>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      selection = d3.selectAll([one, two]);
    test.equal(
      selection.style(
        'color',
        function(d, i) {
          return i ? 'red' : null;
        },
        'important'
      ),
      selection
    );
    test.equal(one.style.getPropertyValue('color'), '');
    test.equal(one.style.getPropertyPriority('color'), '');
    test.equal(two.style.getPropertyValue('color'), 'red');
    test.equal(two.style.getPropertyPriority('color'), 'important');
    test.end();
  }
);

tape(
  'selection.style(name, function) passes the value function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .style('color', function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('../jsdom'),
  d3 = require('../../');

tape(
  'selection.text() returns the text content on the first selected element',
  function(test) {
    const node = {textContent: 'hello'};
    test.equal(d3.select(node).text(), 'hello');
    test.equal(d3.selectAll([null, node]).text(), 'hello');
    test.end();
  }
);

tape(
  'selection.text(value) sets text content on the selected elements',
  function(test) {
    const one = {textContent: ''},
      two = {textContent: ''},
      selection = d3.selectAll([one, two]);
    test.equal(selection.text('bar'), selection);
    test.equal(one.textContent, 'bar');
    test.equal(two.textContent, 'bar');
    test.end();
  }
);

tape(
  'selection.text(null) clears the text content on the selected elements',
  function(test) {
    const one = {textContent: 'bar'},
      two = {textContent: 'bar'},
      selection = d3.selectAll([one, two]);
    test.equal(selection.text(null), selection);
    test.equal(one.textContent, '');
    test.equal(two.textContent, '');
    test.end();
  }
);

tape(
  'selection.text(function) sets the value of the text content on the selected elements',
  function(test) {
    const one = {textContent: 'bar'},
      two = {textContent: 'bar'},
      selection = d3.selectAll([one, two]);
    test.equal(
      selection.text(function(d, i) {
        return i ? 'baz' : null;
      }),
      selection
    );
    test.equal(one.textContent, '');
    test.equal(two.textContent, 'baz');
    test.end();
  }
);

tape(
  'selection.text(function) passes the value function data, index and group',
  function(test) {
    const document = jsdom(
        "<parent id='one'><child id='three'></child><child id='four'></child></parent><parent id='two'><child id='five'></child></parent>"
      ),
      one = document.querySelector('#one'),
      two = document.querySelector('#two'),
      three = document.querySelector('#three'),
      four = document.querySelector('#four'),
      five = document.querySelector('#five'),
      results = [];

    d3.selectAll([one, two])
      .datum(function(d, i) {
        return 'parent-' + i;
      })
      .selectAll('child')
      .data(function(d, i) {
        return [0, 1].map(function(j) {
          return 'child-' + i + '-' + j;
        });
      })
      .text(function(d, i, nodes) {
        results.push([this, d, i, nodes]);
      });

    test.deepEqual(results, [
      [three, 'child-0-0', 0, [three, four]],
      [four, 'child-0-1', 1, [three, four]],
      [five, 'child-1-0', 0, [five]]
    ]);
    test.end();
  }
);
