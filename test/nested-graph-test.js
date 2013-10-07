// nested-graph-test
var test = require('tape');
var graph = require('../nested-graph');

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
  d.attach(b);
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
  
  child = a.detach(id);
  t.equal(a.indexOf(id), -1, 'detached b');
  t.equal(child.id, id, 'should be b');

  t.end();
});

test('visitor instance', function (t) {

  var main = fixture('main');
  var visitor = main.visitor();
    
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

test('resolve with process', function (t) {
    
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
           
            // halt processing/descent
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
    visitor = main.resolve();
  }
  
  main.attach(main);
  
  t.throws(exec, 'should detect cycle', msg);
    
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
  
  t.equal(visitor.results.length, 3, 'should be removed from 3 graphs');
  
  t.end();
});

test('remove with cycle', function (t) {

  var main = fixture('main');
  var visitor;
  
  function exec() {
    visitor = main.remove('b');
  }
  
  bdbCycle(main);

  t.doesNotThrow(exec, 'should not throw on cycle');
  t.equal(visitor.results.length, 3, 'should be removed from 3 graphs');
  
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

test('size returns the number of subgraph the in visitor.results field array plus the graph itself', function (t) {
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
  var id = main.edges[0].edges[0].id;
  var descendant = main.find(id);
  
  t.equal(descendant.id, id, 'should find descendant');
  
  t.end();
});

test('find non-existent', function (t) {

  var main = fixture('main');
  var bonk = main.find('bonk');
  
  t.notOk(bonk, 'should return no value');
  
  t.end();
});

test('find descendant in cycle', function (t) {

  var main = fixture('main');
  
  main.attach(main); // attach main to itself
  
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
  
  main.attach(main);

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
