var tape = require('tape'),
  jsdom = require('./jsdom'),
  d3 = require('../');

tape('d3.create(name) returns a new HTML element with the given name', function(
  test
) {
  global.document = jsdom('');
  try {
    const h1 = d3.create('h1');
    test.equal(h1._groups[0][0].namespaceURI, 'http://www.w3.org/1999/xhtml');
    test.equal(h1._groups[0][0].tagName, 'H1');
    test.deepEqual(h1._parents, [null]);
    test.end();
  } finally {
    delete global.document;
  }
});

tape('d3.create(name) returns a new SVG element with the given name', function(
  test
) {
  global.document = jsdom('');
  try {
    const svg = d3.create('svg');
    test.equal(svg._groups[0][0].namespaceURI, 'http://www.w3.org/2000/svg');
    test.equal(svg._groups[0][0].tagName, 'svg');
    test.deepEqual(svg._parents, [null]);
    test.end();
  } finally {
    delete global.document;
  }
});
var tape = require('tape'),
  jsdom = require('./jsdom'),
  d3 = require('../');

tape(
  'd3.creator(name).call(element) returns a new element with the given name',
  function(test) {
    const document = jsdom("<body class='foo'>");
    test.deepEqual(type(d3.creator('h1').call(document.body)), {
      namespace: 'http://www.w3.org/1999/xhtml',
      name: 'H1'
    });
    test.deepEqual(type(d3.creator('xhtml:h1').call(document.body)), {
      namespace: 'http://www.w3.org/1999/xhtml',
      name: 'H1'
    });
    test.deepEqual(type(d3.creator('svg').call(document.body)), {
      namespace: 'http://www.w3.org/2000/svg',
      name: 'svg'
    });
    test.deepEqual(type(d3.creator('g').call(document.body)), {
      namespace: 'http://www.w3.org/1999/xhtml',
      name: 'G'
    });
    test.end();
  }
);

tape(
  'd3.creator(name).call(element) can inherit the namespace from the given element',
  function(test) {
    const document = jsdom("<body class='foo'><svg></svg>"),
      svg = document.querySelector('svg');
    test.deepEqual(type(d3.creator('g').call(document.body)), {
      namespace: 'http://www.w3.org/1999/xhtml',
      name: 'G'
    });
    test.deepEqual(type(d3.creator('g').call(svg)), {
      namespace: 'http://www.w3.org/2000/svg',
      name: 'g'
    });
    test.end();
  }
);

function type(element) {
  return {namespace: element.namespaceURI, name: element.tagName};
}
var tape = require('tape'),
  jsdom = require('./jsdom'),
  d3 = require('../');

tape(
  'd3.event is set exactly during the callback of an event listener',
  function(test) {
    let event,
      document = jsdom("<h1 id='one'></h1>"),
      one = document.querySelector('#one'),
      selection = d3.selectAll([one]).on('click', function() {
        event = d3.event;
      });
    test.equal(d3.event, null);
    selection.dispatch('click');
    test.equal(d3.event, null);
    test.equal(event.type, 'click');
    test.equal(event.target, one);
    test.end();
  }
);

tape(
  'd3.event is restored to its previous value during reentrant events',
  function(test) {
    var event1,
      event2,
      event3,
      document = jsdom("<h1 id='one'></h1>"),
      one = document.querySelector('#one'),
      selection = d3
        .selectAll([one])
        .on('foo', function() {
          event1 = d3.event;
          selection.dispatch('bar');
          event3 = d3.event;
        })
        .on('bar', function() {
          event2 = d3.event;
        });
    test.equal(d3.event, null);
    selection.dispatch('foo');
    test.equal(d3.event, null);
    test.equal(event1.type, 'foo');
    test.equal(event2.type, 'bar');
    test.equal(event3, event1);
    test.end();
  }
);
var jsdom = require('jsdom');

module.exports = function(html) {
  return new jsdom.JSDOM(html).window.document;
};
var tape = require('tape'),
  jsdom = require('./jsdom'),
  d3 = require('../');

tape(
  'd3.matcher(selector).call(element) returns true if the element matches the selector',
  function(test) {
    const document = jsdom("<body class='foo'>");
    test.equal(d3.matcher('body').call(document.body), true);
    test.equal(d3.matcher('.foo').call(document.body), true);
    test.equal(d3.matcher('body.foo').call(document.body), true);
    test.equal(d3.matcher('h1').call(document.body), false);
    test.equal(d3.matcher('body.bar').call(document.body), false);
    test.end();
  }
);
var tape = require('tape'),
  d3 = require('../');

tape(
  'd3.namespace(name) returns name if there is no namespace prefix',
  function(test) {
    test.equal(d3.namespace('foo'), 'foo');
    test.equal(d3.namespace('foo:bar'), 'bar');
    test.end();
  }
);

tape('d3.namespace(name) coerces name to a string', function(test) {
  test.equal(
    d3.namespace({
      toString: function() {
        return 'foo';
      }
    }),
    'foo'
  );
  test.deepEqual(
    d3.namespace({
      toString: function() {
        return 'svg';
      }
    }),
    {space: 'http://www.w3.org/2000/svg', local: 'svg'}
  );
  test.end();
});

tape(
  'd3.namespace(name) returns the expected values for built-in namespaces',
  function(test) {
    test.deepEqual(d3.namespace('svg'), {
      space: 'http://www.w3.org/2000/svg',
      local: 'svg'
    });
    test.deepEqual(d3.namespace('xhtml'), {
      space: 'http://www.w3.org/1999/xhtml',
      local: 'xhtml'
    });
    test.deepEqual(d3.namespace('xlink'), {
      space: 'http://www.w3.org/1999/xlink',
      local: 'xlink'
    });
    test.deepEqual(d3.namespace('xml'), {
      space: 'http://www.w3.org/XML/1998/namespace',
      local: 'xml'
    });
    test.deepEqual(d3.namespace('svg:g'), {
      space: 'http://www.w3.org/2000/svg',
      local: 'g'
    });
    test.deepEqual(d3.namespace('xhtml:b'), {
      space: 'http://www.w3.org/1999/xhtml',
      local: 'b'
    });
    test.deepEqual(d3.namespace('xlink:href'), {
      space: 'http://www.w3.org/1999/xlink',
      local: 'href'
    });
    test.deepEqual(d3.namespace('xml:lang'), {
      space: 'http://www.w3.org/XML/1998/namespace',
      local: 'lang'
    });
    test.end();
  }
);

tape(
  'd3.namespace("xmlns:…") treats the whole name as the local name',
  function(test) {
    test.deepEqual(d3.namespace('xmlns:xlink'), {
      space: 'http://www.w3.org/2000/xmlns/',
      local: 'xmlns:xlink'
    });
    test.end();
  }
);

tape('d3.namespace(name) observes modifications to d3.namespaces', function(
  test
) {
  d3.namespaces.d3js = 'https://d3js.org/2016/namespace';
  test.deepEqual(d3.namespace('d3js:pie'), {
    space: 'https://d3js.org/2016/namespace',
    local: 'pie'
  });
  delete d3.namespaces.d3js;
  test.equal(d3.namespace('d3js:pie'), 'pie');
  test.end();
});
var tape = require('tape'),
  d3 = require('../');

tape('d3.namespaces is the expected map', function(test) {
  test.deepEqual(d3.namespaces, {
    svg: 'http://www.w3.org/2000/svg',
    xhtml: 'http://www.w3.org/1999/xhtml',
    xlink: 'http://www.w3.org/1999/xlink',
    xml: 'http://www.w3.org/XML/1998/namespace',
    xmlns: 'http://www.w3.org/2000/xmlns/'
  });
  test.end();
});
var tape = require('tape'),
  jsdom = require('./jsdom'),
  d3 = require('../');

tape('d3.select(…) returns an instanceof d3.selection', function(test) {
  const document = jsdom('<h1>hello</h1>');
  test.ok(d3.select(document) instanceof d3.selection);
  test.end();
});

tape(
  'd3.select(string) selects the first element that matches the selector string',
  function(test) {
    const document = (global.document = jsdom(
      "<h1 id='one'>foo</h1><h1 id='two'>bar</h1>"
    ));
    try {
      test.deepEqual(d3.select('h1'), {
        _groups: [[document.querySelector('h1')]],
        _parents: [document.documentElement]
      });
      test.end();
    } finally {
      delete global.document;
    }
  }
);

tape('d3.select(element) selects the given element', function(test) {
  const document = jsdom('<h1>hello</h1>');
  test.deepEqual(d3.select(document.body), {
    _groups: [[document.body]],
    _parents: [null]
  });
  test.deepEqual(d3.select(document.documentElement), {
    _groups: [[document.documentElement]],
    _parents: [null]
  });
  test.end();
});

tape('d3.select(window) selects the given window', function(test) {
  const document = jsdom('<h1>hello</h1>');
  test.deepEqual(d3.select(document.defaultView), {
    _groups: [[document.defaultView]],
    _parents: [null]
  });
  test.end();
});

tape('d3.select(document) selects the given document', function(test) {
  const document = jsdom('<h1>hello</h1>');
  test.deepEqual(d3.select(document), {
    _groups: [[document]],
    _parents: [null]
  });
  test.end();
});

tape('d3.select(null) selects null', function(test) {
  const document = jsdom('<h1>hello</h1><null></null><undefined></undefined>');
  test.deepEqual(d3.select(null), {_groups: [[null]], _parents: [null]});
  test.deepEqual(d3.select(undefined), {
    _groups: [[undefined]],
    _parents: [null]
  });
  test.deepEqual(d3.select(), {_groups: [[undefined]], _parents: [null]});
  test.end();
});

tape('d3.select(object) selects an arbitrary object', function(test) {
  const object = {};
  test.deepEqual(d3.select(object), {_groups: [[object]], _parents: [null]});
  test.end();
});
var tape = require('tape'),
  jsdom = require('./jsdom'),
  d3 = require('../');

tape('d3.selectAll(…) returns an instanceof d3.selection', function(test) {
  const document = jsdom('<h1>hello</h1>');
  test.ok(d3.selectAll([document]) instanceof d3.selection);
  test.end();
});

tape(
  'd3.selectAll(string) selects all elements that match the selector string, in order',
  function(test) {
    const document = (global.document = jsdom(
      "<h1 id='one'>foo</h1><h1 id='two'>bar</h1>"
    ));
    try {
      test.deepEqual(d3.selectAll('h1'), {
        _groups: [document.querySelectorAll('h1')],
        _parents: [document.documentElement]
      });
      test.end();
    } finally {
      delete global.document;
    }
  }
);

tape('d3.selectAll(nodeList) selects a NodeList of elements', function(test) {
  const document = jsdom('<h1>hello</h1><h2>world</h2>');
  test.deepEqual(d3.selectAll(document.querySelectorAll('h1,h2')), {
    _groups: [document.querySelectorAll('h1,h2')],
    _parents: [null]
  });
  test.end();
});

tape('d3.selectAll(array) selects an array of elements', function(test) {
  const document = jsdom('<h1>hello</h1><h2>world</h2>'),
    h1 = document.querySelector('h1'),
    h2 = document.querySelector('h2');
  test.deepEqual(d3.selectAll([h1, h2]), {
    _groups: [[h1, h2]],
    _parents: [null]
  });
  test.end();
});

tape('d3.selectAll(array) can select an empty array', function(test) {
  test.deepEqual(d3.selectAll([]), {_groups: [[]], _parents: [null]});
  test.end();
});

tape('d3.selectAll(null) selects an empty array', function(test) {
  test.deepEqual(d3.selectAll(), {_groups: [[]], _parents: [null]});
  test.deepEqual(d3.selectAll(null), {_groups: [[]], _parents: [null]});
  test.deepEqual(d3.selectAll(undefined), {_groups: [[]], _parents: [null]});
  test.end();
});

tape('d3.selectAll(null) selects a new empty array each time', function(test) {
  const one = d3.selectAll()._groups[0],
    two = d3.selectAll()._groups[0];
  test.equal(one === two, false);
  one.push('one');
  test.deepEqual(d3.selectAll()._groups[0], []);
  test.end();
});

tape('d3.selectAll(array) can select an array that contains null', function(
  test
) {
  const document = jsdom('<h1>hello</h1><h2>world</h2>'),
    h1 = document.querySelector('h1');
  test.deepEqual(d3.selectAll([null, h1, null]), {
    _groups: [[null, h1, null]],
    _parents: [null]
  });
  test.end();
});

tape(
  'd3.selectAll(array) can select an array that contains arbitrary objects',
  function(test) {
    const object = {};
    test.deepEqual(d3.selectAll([object]), {
      _groups: [[object]],
      _parents: [null]
    });
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('./jsdom'),
  d3 = require('../');

tape(
  'd3.selector(selector).call(element) returns the first element that matches the selector',
  function(test) {
    const document = jsdom("<body class='foo'>");
    test.equal(
      d3.selector('body').call(document.documentElement),
      document.body
    );
    test.equal(
      d3.selector('.foo').call(document.documentElement),
      document.body
    );
    test.equal(
      d3.selector('body.foo').call(document.documentElement),
      document.body
    );
    test.equal(d3.selector('h1').call(document.documentElement), null);
    test.equal(d3.selector('body.bar').call(document.documentElement), null);
    test.end();
  }
);

tape('d3.selector(null).call(element) always returns undefined', function(
  test
) {
  const document = jsdom(
    "<body class='foo'><undefined></undefined><null></null>"
  );
  test.equal(d3.selector().call(document.documentElement), undefined);
  test.equal(d3.selector(null).call(document.documentElement), undefined);
  test.equal(d3.selector(undefined).call(document.documentElement), undefined);
  test.end();
});
var tape = require('tape'),
  jsdom = require('./jsdom'),
  d3 = require('../');

tape(
  'd3.selectorAll(selector).call(element) returns all elements that match the selector',
  function(test) {
    const document = jsdom("<body class='foo'><div class='foo'>"),
      body = document.body,
      div = document.querySelector('div');
    test.deepEqual(d3.selectorAll('body').call(document.documentElement), [
      body
    ]);
    test.deepEqual(d3.selectorAll('.foo').call(document.documentElement), [
      body,
      div
    ]);
    test.deepEqual(d3.selectorAll('div.foo').call(document.documentElement), [
      div
    ]);
    test.deepEqual(d3.selectorAll('div').call(document.documentElement), [div]);
    test.deepEqual(d3.selectorAll('div,body').call(document.documentElement), [
      body,
      div
    ]);
    test.deepEqual(d3.selectorAll('h1').call(document.documentElement), []);
    test.deepEqual(
      d3.selectorAll('body.bar').call(document.documentElement),
      []
    );
    test.end();
  }
);

tape(
  'd3.selectorAll(null).call(element) always returns the empty array',
  function(test) {
    const document = jsdom(
      "<body class='foo'><undefined></undefined><null></null>"
    );
    test.deepEqual(d3.selectorAll().call(document.documentElement), []);
    test.deepEqual(d3.selectorAll(null).call(document.documentElement), []);
    test.deepEqual(
      d3.selectorAll(undefined).call(document.documentElement),
      []
    );
    test.end();
  }
);

tape(
  'd3.selectorAll(null).call(element) returns a new empty array each time',
  function(test) {
    const one = d3.selectorAll()(),
      two = d3.selectorAll()();
    test.equal(one === two, false);
    one.push('one');
    test.deepEqual(d3.selectorAll()(), []);
    test.end();
  }
);
var tape = require('tape'),
  jsdom = require('./jsdom'),
  d3 = require('../');

tape('d3.window(node) returns node.ownerDocument.defaultView', function(test) {
  const document = jsdom();
  test.equal(d3.window(document.body), document.defaultView);
  test.end();
});

tape('d3.window(document) returns document.defaultView', function(test) {
  const document = jsdom();
  test.equal(d3.window(document), document.defaultView);
  test.end();
});

tape('d3.window(window) returns window', function(test) {
  const window = jsdom().defaultView;
  test.equal(d3.window(window), window);
  test.end();
});
