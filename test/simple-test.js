// simple-test
var test = require('tape');
var simplegraph = require('../simplegraph');

/*** FIXTURES ***/

function fixture(id) {

  var main = simplegraph(id);
  
  var a = simplegraph('a');
  var b = simplegraph('b');
  var c = simplegraph('c');
  var d = simplegraph('d');
  var e = simplegraph('e');

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

  var b = main.descendant('b');
  var d = main.descendant('d');
  
  // b -> c -> d -> b for the cycle 
  d.attach(b);
}

/*** TESTS ***/

test('smoke test', function (t) {

  t.plan(1);

  t.equal(typeof simplegraph, 'function');
});

test('instance', function (t) {
  
  t.plan(16);

  var main = simplegraph('main');

  t.ok(main instanceof simplegraph, 'main instanceof simplegraph');
  t.ok(main.id === 'main', 'main.id');
  t.ok(main.edges, 'main.edges');

  t.equal(typeof main.attach, 'function', 'attach');
  t.equal(typeof main.detach, 'function', 'detach');
  t.equal(typeof main.empty, 'function', 'empty');
  t.equal(typeof main.has, 'function', 'has');
  t.equal(typeof main.size, 'function', 'size');

  t.equal(typeof main.resolve, 'function', 'resolve');
  t.equal(typeof main.visitor, 'function', 'visitor');
  
  t.equal(typeof main.remove, 'function', 'remove');
  t.equal(typeof main.parents, 'function', 'parents');
  t.equal(typeof main.subgraph, 'function', 'subgraph');
  t.equal(typeof main.descendant, 'function', 'find');
  t.equal(typeof main.list, 'function', 'list');
  t.equal(typeof main.sort, 'function', 'sort');
});

test('constructor throws on empty string id', function (t) {

  t.plan(1);

  function emptyString() {
    simplegraph('');
  }
  
  t.throws(emptyString, 'emptyString', 'simplegraph requires id param as string');
});

test('constructor throws on empty argument', function (t) {

  t.plan(1);
  
  function empty() {
    simplegraph();
  }
  
  t.throws(empty, 'empty', 'simplegraph requires id param as string');
});

test('attach, empty, has, and detach', function (t) {

  t.plan(7);
  
  var id = 'b';
  var a = simplegraph('a');
  var b = simplegraph(id);
  var child;
  
  t.equal(a.has(id), false, 'should not have b');
  t.equal(a.empty(), true, 'should be empty');
  
  a.attach(b);
  
  t.ok(a.has(id), 'has b');
  t.equal(a.empty(), false, 'should not be empty');

  child = a.detach(id);
  
  t.equal(a.has(id), false, 'detached b');
  t.equal(a.empty(), true, 'should be empty');
  t.equal(child, b, 'should be b');
});

test('attach() with non-graph object throws error', function (t) {

  t.plan(1);
  
  function exec() {
    simplegraph('root').attach({ id: 'fake' });
  }
  
  t.throws(exec, 'should complain about non-graph object');
});

test('visitor instance', function (t) {

  t.plan(4);

  var main = fixture('main');
  var visitor = main.visitor();
    
  t.equal(visitor.id, main.id, 'visitor id should be graph id');
  t.equal(visitor.ids.length, 0, 'ids array');
  t.ok(visitor.visited, 'visited');
  t.ok(visitor.visiting, 'visiting');
});

test('resolve', function (t) {

  t.plan(1);

  var main = simplegraph('main');
  var visitor = main.resolve();
      
  t.equal(visitor.ids.length, 1, 'should visit 1');
});

test('resolve with visit callback', function (t) {

  t.plan(2);

  var main = fixture('main');
  var visitor;
  
  function visit(edge) {
    if (edge.id === main.id) {
      visitor.count++;
    }
  }
  
  visitor = main.visitor(visit);
  
  t.ok(visitor.visit === visit, 'should map visit to visitor');
  
  // nonce property to be updated by visit
  visitor.count = 0;
  
  main.resolve(visitor);
  
  t.equal(visitor.count, 1, 'should count only one main');
});

test('done() halts resolve() processing', function (t) {

  t.plan(1);

  var main = fixture('main');
  var visitor;
  
  function visit(edge) {
    if (edge.id === main.id) {      
      visitor.done();
    }
  }
  
  visitor = main.visitor(visit);
  main.resolve(visitor);
  
  t.equal(visitor.ids.length, 1, 'should visit 1 item');
});

test('resolve all subgraphs in graph', function (t) {

  t.plan(1);

  var ids = ['main', 'a', 'b'];
  var main = simplegraph(ids[0]);
  var a = simplegraph(ids[1]);
  var b = simplegraph(ids[2]);
  var visitor;
  
  a.attach(b);
  main.attach(a);

  visitor = main.resolve();

  t.equal(visitor.ids.length, ids.length, 'should have ' + ids.length + ' entries');
});

test('resolve each subgraph', function (t) {
 
  var main = fixture('main');
  var length = 0;
  var visitor;
  
  // enforce that each edge gets one test, so we don't need to call t.end()
  for (var k in main.edges) {
    length += 1;
  }
  
  t.plan(length);
  
  for (var k in main.edges) {
    visitor = main.edges[k].resolve();
    
    t.equal(visitor.ids[0], main.edges[k].id, 'first id should be ' + main.edges[k].id);
  }
});

test('resolve cycle throws Error(): main -> main', function (t) {
  
  t.plan(1);
  
  var msg = 'main -> main';
  var main = simplegraph('main');

  function exec() {
    main.attach(main);
    main.resolve();
  }
    
  t.throws(exec, 'resolve should detect cycle', msg);
})

test('resolve cycle throws Error(): b -> c -> d -> b', function (t) {

  t.plan(1);

  var msg = 'b -> c -> d -> b';
  var main = fixture('main');

  function exec() {
    main.resolve();
  }

  bdbCycle(main);
   
  t.throws(exec, msg, msg, 'should detect cycle');
});

test('remove all occurrences of item in subgraph', function (t) {

  t.plan(1);
  
  var main = fixture('main');
  var id = 'c';
  var visitor = main.remove(id);
  
  t.equal(visitor.results.length, 3, 'should remove\'c\' from 3 graphs');
});

test('remove with cycle', function (t) {

  t.plan(2);
  
  var main = fixture('main');
  var visitor;
  
  function exec() {
    visitor = main.remove('b');
  }
  
  bdbCycle(main);

  t.doesNotThrow(exec, 'should not throw on cycle');
  t.equal(visitor.results.length, 3, 'should be removed from 3 graphs');
});

test('parents finds all graphs that depend on specified graph id', function (t) {
  
  t.plan(1);
  
  var main = fixture('main');
  var id = 'c';
  var visitor = main.parents(id);
  
  t.equal(visitor.results.length, 3, 'should find 3 graphs');
});

test('parents with cycle', function (t) {

  t.plan(1);

  var main = fixture('main');
  var visitor;

  function exec() {
    visitor = main.parents('b');
  }
  
  bdbCycle(main);
  
  t.throws(exec, 'should throw on cycle');
});

test('parents with empty or non-string param', function (t) {
  
  t.plan(2);
  
  var main = fixture('main');

  function execBlank() {
    main.parents('');
  }
  
  t.throws(execBlank, 'should throw on blank id');
  
  function execNonString() {
    main.parents(13);
  }
  
  t.throws(execNonString, 'should throw on non-string id');
});

test('subgraph finds all graphs under the specified graph id', function (t) {

  t.plan(1);
    
  var names = ['a', 'b', 'c', 'd', 'e'];
  var size = names.length;
  
  var main = fixture('main');
  var visitor = main.subgraph();
  
  t.equal(visitor.results.length, size, 'should find ' + size + ' graphs') ;
})

test('size of leaf should be 0', function (t) {

  t.plan(1);
  
  t.equal(simplegraph('leaf').size(), 0, 'should be 0');
});

test('size returns number of edges', function (t) {

  t.plan(1);
  
  var names = ['a', 'b', 'c', 'd', 'e'];
  var main = simplegraph('main');
  var size = 0;
  var child;
  var edge;
  
  for (var i = 0; i < names.length; ++i) {
  
    edge = simplegraph(names[i]);
    size += 1;
    main.attach(edge);
    
    for (var j = i + 1; j < names.length; ++j ) {
      child = simplegraph(names[j]);
      size += 1;
      edge.attach(child);
    }
  }
  
  t.equal(main.size(), size, 'should find [' + size + '] edges');
});

test('descendant finds child', function (t) {

  t.plan(1);
  
  var main = fixture('main');
  var id;
  
  for (var k in main.edges) {
    id = main.edges[k].id;
    break;
  }
  
  var child = main.descendant(id);
  
  t.equal(child.id, id, 'should find child');
});

test('descendant finds descendant', function (t) {

  t.plan(1);
  
  var main = fixture('main');
  var id = 'e';
  var descendant = main.descendant(id);
  
  t.equal(descendant.id, id, 'should find \'e\'');
});

test('descendant non-existent', function (t) {

  t.plan(1);
  
  var main = fixture('main');
  var bonk = main.descendant('bonk');
  
  t.notOk(bonk, 'should return no value for \'bonk\'');
});

test('descendant finds descendant in cycle', function (t) {

  t.plan(2);
  
  var main = fixture('main');
  var id;
  
  main.attach(main);
  
  var edge = main.edges['a'];
    
  for (k in edge.edges) {
    id = edge.edges[k].id;
    break;
  }
  
  var descendant;
  
  function exec() {
    descendant = main.descendant(id);
  }
  
  t.doesNotThrow(exec);
  t.equal(descendant.id, id, 'should find in cycle');
});

test('descendant non-existent in cycle', function (t) {

  t.plan(2);
  
  var main = fixture('main');
  var bonk;
  
  function exec() {
    bonk = main.descendant('bonk');
  }
  
  main.attach(main);

  t.throws(exec, 'should throw error');
  t.notOk(bonk, 'should return no value');
});

test('print list', function (t) {

  t.plan(8);
  
  var main = fixture('main');
  var list = main.list();
  
  console.log(list);

  t.equal(list.match(/[\+][\s]*main\b/g).length, 1, 'should be 1 "+ main"  entry');
  
  //should be indented
  t.equal(list.match(/[\+][\s]*a\b/g).length, 1, 'should be 1 "+ a" entry');
  t.equal(list.match(/[\+][\s]*b\b/g).length, 2, 'should be 2 "+ b" entries');
  t.equal(list.match(/[\+][\s]*c\b/g).length, 4, 'should be 4 "+ c" entries');
  
  //no edges, no pluses
  t.equal(list.match(/(^([\+][\s]*d\b))/g), null, 'should be no "+ d" entries');
  t.equal(list.match(/(^([\+][\s]*e\b))/g), null, 'should be no "+ e" entries');
  
  //no edges, use minuses
  t.equal(list.match(/[\-][\s]d/g).length, 6, 'should be 6 "- d" entries');
  t.equal(list.match(/[\-][\s]e/g).length, 4, 'should be 4 "- e" entries');
});

test('sort', function (t) {

  t.plan(1);
  
  var main = fixture('main');
  var expected = ['e','d','c','b','a','main'];
  var results = main.sort();
  
  t.equal(results.join(' '), expected.join(' '));
});

test('sort subgraph', function (t) {

  t.plan(1);

  var main = fixture('main');
  var expected = ['e','d','c'];
  var results = main.descendant('c').sort();
  
  t.equal(results.join(' '), expected.join(' ')); 
});

test('sort b-fixture', function (t) {

  t.plan(1);
  
  var a = simplegraph('a');
  var b = simplegraph('b');
  var c = simplegraph('c');
  var d = simplegraph('d');
  var e = simplegraph('e');
  
  d.attach(c);
  d.attach(e);
  
  a.attach(c);
  a.attach(d);
  
  b.attach(a);
  b.attach(d);
  
  // c and e are leaf items req'd by d
  // unshift c <- a
  // unshift e <- d <- a <- b  
  // then push each d <- a <- b
  var expected = ['e', 'c', 'd', 'a', 'b'];
  
  var results = b.sort();
  
  t.equal(results.join(' '), expected.join(' '));   
});

test('sort complex fixture', function (t) {

  t.plan(1);
  
  var fixture = simplegraph('fixture');
  var ids = 'zyxwvutsrqponm'.split('');
  var edges = {};
  var expected = [];
  
  for (var i = 0, key; i < ids.length; ++i) {
    key = ids[i];
    edges[key] = simplegraph(key);
  }
  
  // build out the connections
  fixture.attach(edges['m']);
  fixture.attach(edges['n']);
  fixture.attach(edges['o']);
  fixture.attach(edges['p']);

  edges['m'].attach(edges['q']);
  edges['m'].attach(edges['r']);
  edges['m'].attach(edges['x']);
 
  edges['n'].attach(edges['q']);
  edges['n'].attach(edges['u']);
  edges['n'].attach(edges['o']);

  edges['p'].attach(edges['o']);
  edges['p'].attach(edges['s']);
  edges['p'].attach(edges['z']);
  
  edges['o'].attach(edges['r']);
  edges['o'].attach(edges['v']);
  edges['o'].attach(edges['s']);

  edges['q'].attach(edges['t']);
  
  edges['s'].attach(edges['r']);

  edges['r'].attach(edges['u']);
  edges['r'].attach(edges['y']);
  
  edges['u'].attach(edges['t']);

  edges['y'].attach(edges['v']);

  edges['v'].attach(edges['x']);
  edges['v'].attach(edges['w']);
  
  edges['w'].attach(edges['z']);
  
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

  // FINALLY - LET'S RUN THIS TEST
  t.equal(fixture.sort().join(' '), expected.join(' '))
});