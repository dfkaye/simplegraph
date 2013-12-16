// simple-test
var test = require('tape');
var graph = require('../simplegraph');

/*** FIXTURES ***/

function fixture(id) {

  var main = graph(id);
  
  var a = graph('a');
  var b = graph('b');
  var c = graph('c');
  var d = graph('d');
  var e = graph('e');

  a.attach(b);    // a depends on b
  a.attach(c);   // a depends on c
  
  b.attach(c);    // b depends on c
  b.attach(d);    // b depends on d
  
  c.attach(d);    // c depends on d
  c.attach(e);    // c depends on e
  
  main.attach(a);
  main.attach(b);
  main.attach(c);
  
  return main;
}

function bdbCycle(main) {

  var b = main.find('b');
  var d = main.find('d');
  
  // b -> c -> d -> b for the cycle
  // manually push b on d for the cycle
  // avoiding attach which uses resolve internally
  d.edges.push(b);
}

/*** TESTS ***/

test('smoke test', function (t) {

  t.equal(typeof graph, 'function');
  
  t.end();
});

test('instance', function (t) {
  
  var main = graph('main');

  t.ok(main instanceof graph, 'main instanceof graph');
  t.ok(main.id === 'main', 'main.id');
  t.ok(main.edges, 'main.edges');
  
  t.ok(main.root === main, 'main root');
  
  t.equal(typeof main.attach, 'function', 'attach');
  t.equal(typeof main.indexOf, 'function', 'indexOf');
  t.equal(typeof main.detach, 'function', 'detach');
  
  t.equal(typeof main.remove, 'function', 'remove');
  t.equal(typeof main.dependants, 'function', 'dependants');
  t.equal(typeof main.subgraph, 'function', 'subgraph');
  t.equal(typeof main.find, 'function', 'find');
  t.equal(typeof main.size, 'function', 'size');

  t.equal(typeof main.resolve, 'function', 'resolve');
  t.equal(typeof main.visitor, 'function', 'visitor');
  
  t.end();
});

test('constructor throws on empty string id', function (t) {

  function emptyString() {
    graph('');
  }
  
  t.throws(emptyString, 'emptyString', 'graph requires id param as string');

  t.end();
});

test('constructor throws on empty argument', function (t) {
  
  function empty() {
    graph();
  }
  
  t.throws(empty, 'empty', 'graph requires id param as string');
 
  t.end();
});

test('attach, indexOf, and detach child graph', function (t) {
  
  var id = 'b';
  var a = graph('a');
  var b = graph(id);
  var child;
  
  t.equal(a.indexOf(id), -1, 'no b');
    
  a.attach(b);
  t.ok(a.indexOf(id) > -1, 'indexOf b');
  t.equal(b.root, a, 'b.root should be a');

  child = a.detach(id);
  t.equal(a.indexOf(id), -1, 'detached b');
  t.equal(child.id, id, 'should be b');
  t.equal(b.root, b, 'b.root should be b');

  t.end();
});

test('attach and detach subgraph', function (t) {

  var ids = ['main', 'a', 'b'];
  var main = graph(ids[0]);
  var a = graph(ids[1]);
  var b = graph(ids[2]);
  var visitor;
  
  a.attach(b);
  t.equal(b.root, a, 'b.root should be a');
  
  main.attach(a);
  t.equal(a.root, main, 'a.root should be main');
  t.equal(b.root, main, 'b.root should be main');
  
  a = main.detach(a.id);
  t.equal(a.root, a, 'a.root should be a');
  t.equal(main.edges.length, 0, 'main should have no edges');
  t.equal(b.root, a, 'b.root should be a');

  a.detach(b.id);
  t.equal(b.root, b, 'b.root should be b');
  t.equal(a.edges.length, 0, 'a should have no edges');

  t.end();
});

test('attach() with cycle throws Error(): main -> main', function (t) {

  var msg = 'main -> main';
  var main = graph('main');
  var visitor;

  function exec() {
    main.attach(main);
  }
  
  t.throws(exec, 'attach should detect cycle', msg);
    
  t.end();
});

test('visitor instance', function (t) {

  var main = fixture('main');
  var visitor = main.visitor();
    
  t.equal(visitor.id, main.id, 'visitor id should be graph id');
  t.equal(visitor.ids.length, 0, 'ids array');
  t.ok(visitor.visited, 'visited');
  t.ok(visitor.visiting, 'visiting');
  
  t.end();
});

test('resolve', function (t) {
    
  var main = graph('main')
  var visitor = main.resolve()
      
  t.equal(visitor.ids.length, 1, 'should visit 1')
  
  t.end()
});

test('resolve with process callback', function (t) {
  
  var main = fixture('main');
  var visitor;
  
  function process(graph) {
    if (graph.id === main.id) {
      visitor.count++;
    }
  }
  
  visitor = main.visitor(process);
  
  t.ok(visitor.process === process, 'should map process to visitor');
  
  // nonce property to be updated by process
  visitor.count = 0;
  
  main.resolve(visitor);
  
  t.equal(visitor.count, 1, 'should count only one main');
  
  t.end();
});

test('done() halts resolve() processing', function (t) {
  
  var main = fixture('main');
  var visitor;
  
  function process(graph) {
    if (graph.id === main.id) {      
      visitor.done();
    }
  }
  
  visitor = main.visitor(process);
  main.resolve(visitor);
  
  t.equal(visitor.ids.length, 1, 'should visit 1 item');
  
  t.end();
});

test('resolve all subgraphs in graph', function (t) {

  var ids = ['main', 'a', 'b'];
  var main = graph(ids[0]);
  var a = graph(ids[1]);
  var b = graph(ids[2]);
  var visitor;
  
  a.attach(b);
  main.attach(a);

  visitor = main.resolve();

  t.equal(visitor.ids.length, ids.length, 'should have ' + ids.length + ' entries');
  
  t.end();
});

test('resolve each subgraph', function (t) {
 
  var main = fixture('main');
  var visitor;
  
  // enforce that each edge gets one test, so we don't need to call t.end()
  t.plan(main.edges.length);
  
  for (var i = 0; i < main.edges.length; ++i) {
  
    visitor = main.edges[i].resolve();
    t.equal(visitor.ids[0], main.edges[i].id, 'first id should be ' + main.edges[i].id);
  }
});

test('resolve cycle throws Error(): main -> main', function (t) {

  var msg = 'main -> main';
  var main = graph('main');
  var visitor;

  function exec() {
    // manually push main onto edges to avoid calling attach() which uses resolve()...
    main.edges.push(main);
    visitor = main.resolve();
  }
    
  t.throws(exec, 'resolve should detect cycle', msg);
    
  t.end();
})

test('resolve cycle throws Error(): b -> c -> d -> b', function (t) {

  var msg = 'b -> c -> d -> b';
  var main = fixture('main');
  var visitor;

  function exec() {
    visitor = main.resolve();
  }

  bdbCycle(main);
   
  t.throws(exec, msg, msg, 'should detect cycle');
  
  t.end();
});

test('remove all occurrences of item in subgraph', function (t) {

  var main = fixture('main');
  var id = 'c';
  var visitor = main.remove(id);
  
  t.equal(visitor.results.length, 3, 'should remove\'c\' from 3 graphs');
  
  t.end();
});

test('remove with cycle', function (t) {

  var main = fixture('main');
  var visitor;
  
  function exec() {
    visitor = main.remove('b');
  }
  
  bdbCycle(main);

  t.throws(exec, 'should throw on cycle');
  //t.equal(visitor.results.length, 3, 'should be removed from 3 graphs');
  
  t.end();
});

test('dependants finds all graphs that depend on specified graph id', function (t) {

  var main = fixture('main');
  var id = 'c';
  var visitor = main.dependants(id);
  
  t.equal(visitor.results.length, 3, 'should find 3 graphs');
  
  t.end();
})

test('dependants with cycle', function (t) {

  var main = fixture('main');
  var visitor;

  function exec() {
    visitor = main.dependants('b');
  }
  
  bdbCycle(main);
  
  t.throws(exec, 'should not throw on cycle');

  t.end();
});

test('subgraph finds all graphs under the specified graph id', function (t) {

  var names = ['a', 'b', 'c', 'd', 'e'];
  var size = names.length;
  
  var main = fixture('main');
  var visitor = main.subgraph();
  
  t.equal(visitor.results.length, size, 'should find ' + size + ' graphs') ;
  
  t.end();
})

test('size returns count of subgraph items plus graph in visitor.results', function (t) {

  var names = ['a', 'b', 'c', 'd', 'e'];

  t.equal(fixture('main').size(), names.length + 1, 'should find 6 graphs');
  
  t.end();
});

test('size of leaf should be 1', function (t) {

  t.equal(graph('leaf').size(), 1, 'should be 1');
  
  t.end();
});

test('find child', function (t) {

  var main = fixture('main');
  var id = main.edges[0].id;
  var child = main.find(id);
  
  t.equal(child.id, id, 'should find child');

  t.end();
});

test('find descendant', function (t) {

  var main = fixture('main');
  var id = 'e';
  var descendant = main.find(id);
  
  t.equal(descendant.id, id, 'should find \'e\'');
  
  t.end();
});

test('find non-existent', function (t) {

  var main = fixture('main');
  var bonk = main.find('bonk');
  
  t.notOk(bonk, 'should return no value for \'bonk\'');
  
  t.end();
});

test('find descendant in cycle', function (t) {

  var main = fixture('main');
  
  main.edges.push(main);
  
  var id = main.edges[0].edges[0].id;
  var descendant;
  
  function exec() {
    descendant = main.find(id);
  }
  
  t.doesNotThrow(exec);
  t.equal(descendant.id, id, 'should find in cycle');
  
  t.end();
});

test('find non-existent in cycle', function (t) {

  var main = fixture('main');
  var bonk;
  
  function exec() {
    bonk = main.find('bonk');
  }
  
  main.edges.push(main);

  t.throws(exec, 'should throw error');
  t.notOk(bonk, 'should return no value');
  
  t.end();
});

test('print list', function (t) {

  var main = fixture('main');
  var list = main.list();
  
  console.log(list)

  t.equal(list.match(/[\+][\s]*main\b/g).length, 1, 'should be 1 "+ main"  entry');
  
  // should be indented
  t.equal(list.match(/[\+][\s]*a\b/g).length, 1, 'should be 1 "+ a" entry');
  t.equal(list.match(/[\+][\s]*b\b/g).length, 2, 'should be 2 "+ b" entries');
  t.equal(list.match(/[\+][\s]*c\b/g).length, 4, 'should be 4 "+ c" entries');
  
  // no edges, no pluses
  t.equal(list.match(/(^([\+][\s]*d\b))/g), null, 'should be no "+ d" entries');
  t.equal(list.match(/(^([\+][\s]*e\b))/g), null, 'should be no "+ e" entries');
  
  // no edges, use minuses
  t.equal(list.match(/[\-][\s]d/g).length, 6, 'should be 6 "- d" entries');
  t.equal(list.match(/[\-][\s]e/g).length, 4, 'should be 4 "- e" entries');
  
  t.end();
});

// sort
test('sort fixture', function (t) {

  t.plan(1)
  
  var main = fixture('main');
  var expected = ['e','d','c','b','a','main'];
  var results = main.sort();
  
  t.equal(results.join(' '), expected.join(' '));
});

test('sort fixture subgraph', function (t) {

  t.plan(1)

  var main = fixture('main');
  var expected = ['e','d','c'];
  
  results = main.find('c').sort();
  
  t.equal(results.join(' '), expected.join(' ')); 
});

test('sort b-fixture', function (t) {

  t.plan(1)
  
  var a = graph('a')
  var b = graph('b')
  var c = graph('c')
  var d = graph('d')
  var e = graph('e')
  
  d.attach(c)
  d.attach(e)
  
  a.attach(c)
  a.attach(d)
  
  b.attach(a)
  b.attach(d)
  
  var expected = ['e','c','d', 'a', 'b'];
  
  results = b.sort();
  
  t.equal(results.join(' '), expected.join(' '));   
});

test('sort complex fixture', function (t) {

  t.plan(1)
  
  var fixture = graph('fixture');
  var ids = 'zyxwvutsrqponm'.split('');
  var edges = {};
  var expected = [];
  
  for (var i = 0, key; i < ids.length; ++i) {
    key = ids[i];
    edges[key] = graph(key);
  }
  
  // build out the connections
  fixture.attach(edges['m']);
  fixture.attach(edges['n']);
  fixture.attach(edges['o']);
  fixture.attach(edges['p']);

  edges['m'].attach(edges['q'])
  edges['m'].attach(edges['r'])
  edges['m'].attach(edges['x'])
 
  edges['n'].attach(edges['q'])
  edges['n'].attach(edges['u'])
  edges['n'].attach(edges['o'])

  edges['p'].attach(edges['o'])
  edges['p'].attach(edges['s'])
  edges['p'].attach(edges['z'])
  
  edges['o'].attach(edges['r'])
  edges['o'].attach(edges['v'])  
  edges['o'].attach(edges['s'])

  edges['q'].attach(edges['t'])
  
  edges['s'].attach(edges['r'])

  edges['r'].attach(edges['u'])
  edges['r'].attach(edges['y'])
  
  edges['u'].attach(edges['t'])

  edges['y'].attach(edges['v'])

  edges['v'].attach(edges['x'])
  edges['v'].attach(edges['w'])
  
  edges['w'].attach(edges['z'])
  
  // Build out expected ids array
  
  // fixture-m paths depth first
  // leaf edges
  // z: m-r-y-v-w-z
  expected.push('z');
  // x: m-r-y-v-x
  expected.push('x');
  // t: m-r-u-t)
  expected.push('t');
  // parent/owner edges
  // q: m-q
  expected.push('q');
  // u: m-r-u
  expected.push('u');
  // w: m-r-y-v-w
  expected.push('w');
  // v: m-r-y-v
  expected.push('v');
  // y: m-r-y
  expected.push('y');
  // r: m-r
  expected.push('r');
  // m: fixture-m
  expected.push('m');  
  
  // fixture-n paths depth first
  // no leaf edges
  // parent/owner edges  
  // s: n-o-s
  expected.push('s');
  // o: n-o
  expected.push('o'); 
  // n: fixture-n
  expected.push('n');
  
  // fixture-p depth first (nothing left)
  expected.push('p');  

  // depth 0 [fixture] (done)
  expected.push('fixture');
    
  var results = fixture.sort()

  t.equal(results.join(' '), expected.join(' '))
});


