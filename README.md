simplegraph
============

Makes a *fairly* simple graph structure (used to be "simple-graph")


__[ 19 DEC 2013 ~ REFACTORING WITH BREAKING CHANGES IN PROGRESS ]__


Thanks to Ferry Boender
-----------------------

...for his post on the 
[dependency resolving algorithm]
(http://www.electricmonk.nl/log/2008/08/07/dependency-resolving-algorithm/),
and for his ongoing encouragement in this exploration.

travis
------

[![Build Status](https://travis-ci.org/dfkaye/simplegraph.png)](https://travis-ci.org/dfkaye/simplegraph)

testling
--------

[![browser support](https://ci.testling.com/dfkaye/simplegraph.png)](https://ci.testling.com/dfkaye/simplegraph)

rawgithub
---------

__View the generated test-bundle page on 
<a href='//rawgithub.com/dfkaye/simplegraph/master/browser-test/suite.html' 
   target='_new' title='opens in new tab or window'>rawgithub</a>.__

   
install
-------

    npm install simplegraph
    
    git clone git://github.com/dfkaye/simplegraph.git
    
use
---

node.js

    var simplegraph = require('../simplegraph');

browser

    window.simplegraph
    
    
justify
-------

Everyone should figure out at least one directed acyclic graph data structure in 
JavaScript.  Here's mine.

I'm using this for learning tests in order to work out dependency-loading trivia 
in another project.

what makes it simple?
---------------------

There is no concept of a *node* or node lookup map.  Rather, every object on a 
graph is a graph instance whose *edges* are other graph instances.  Nothing 
special, but traversal is required by several methods, and making *that* simple 
has been a challenge.
   
structure
---------

A graph contains a map of `edges` (other graphs) by their id. The required 
constructor argument is a string `id`.  The constructor can be called with or 
without the `new` keyword. 

    var main = simplegraph('main');
    var main = new simplegraph('main');

That returns an object with the following fields:

    main.id      // string 'main'
    main.edges   // map of graphs {}
    
These are the only constructor-created properties. 

No graph data element is stored in a graph element - __final answer__

traversal
---------

Some graph child methods use procedural code (for-loops) rather than iterator 
functions in order to support IE6-8 -- and execute a little faster (iterators 
run just under an order of magnitude slower).

The *resolve* (traversal) methods use visitor iteration methods internally.  The 
pattern looks like this:

    graphInstance.resolve
      visitor
        iteratorFunction
      and/or 
        visitor.postProcessFunction

__resolve(visitor?)__

Any graph object can be resolved independently with the `resolve()` method.  The 
`resolve()` method __optionally__ accepts a `visitor` object.  If one is *not* 
specified, `resolve()` creates one for use internally from the graph on which 
`resolve()` is first called.  The visitor is a collecting parameter which lets 
you manage results, terminate processing at specified points, and so on.

__If the `resolve()` method detects a cycle, it will throw an error.__

If no cycle or other error occurs, `resolve()` returns a `visitor` object.


__[ API/DOC IN PROGRESS ]__


__visitor(fn?)__

Any graph object can create a `visitor` object. A visitor has an `id` set to the 
creating graph's id, an `ids` array, `visited` and `visiting` maps, a `results` 
array, and a `done()` method.  

The `visitor()` method can optionally take a `visit` function argument. The 
visit function will run on the current graph being visited *before* descending 
to edges. The function takes a graph param representing a child or edge.

The visitor *object* is used internally by the `resolve()` method for tracking 
visited subgraphs, and for throwing an `error` if a cycle is detected.


__[ API/DOC IN PROGRESS ]__
  
  
The following snippet from the `remove(id)` method demonstrates a visitor usage. 
It calls `detach` internally and pushes detached edges to the visitor's results 
array:

    var visitor = this.visitor(function(edge) {
      // uses closure on id param
      if (edge.detach(id)) {
        // *this* is the visitor
        this.results.push(edge);
      }
    });
    
    return this.resolve(visitor);

    
__[ API/DOC IN PROGRESS ]__


    // inspect visitor
    id: graph.id  // in this case it will be 'main'
    ids: []       // ids of each graph element visited
    results: []   // collecting array of results 
    visited: {}   // internal use for cycle detection
    visiting: {}  // internal use for cycle detection
    done: function () {
      this.exit = true;
    },        
    visit: fn   // optional iteration function to run visiting a graph element
    after: null   // optional post-processing function to run when graph's 
                  //  depth traversal is completed
  



methods
-------

__attach(graph)__

`attach()` accepts a graph object as a child in the current graph.

If adding a graph that is __not__ already a child, `attach()` returns the added 
child; else it returns __false__.

    var main = simplegraph('main')
    
    var a = simplegraph('a');
    
    main.attach(a);
    // => a
    
    main.attach(a); // again
    // => false
    
<del>
WARNING: The `attach()` method uses `resolve()` internally, which throws an 
error if a cycle is detected. __To avoid cycles, always use `attach()` to modify the graph.__
</del>

__detach(id)__

`detach()` accepts a string id for the child in the current graph.

If a child matching the id is found, `detach()` returns returns the detached 
child; else it returns __false__.

The graph is removed from the child's `parents` array.  The child's `root` is 
set to itself if the `parents` array is empty. 

    main.detach('a');
    // => a
    
    main.detach('a'); // again
    // => false

__indexOf(id)__

__[ deprecated and removed ]__

`indexOf()` accepts a string id for the target child of a graph. If a child is 
found matching the id, the child is returned; else indexOf() returns __-1__.

    main.attach(a);
    // => a
    main.indexOf('a')
    // 0
    
    main.detach('a');
    // => a
    main.indexOf('a')
    // -1
    
__find(id)__

`find()` accepts a string id for the target descendant of a graph. If a child or 
descendant is found matching the id, the found target is returned; else `find()` 
returns __false__.

    // main -> a -> b -> c
    main.find('c');
    // => c
    
__remove(id)__

`remove()` accepts a string id for the target as a child in the current graph or 
as a descendant within any subgraph.

`remove()` visits every child and descendant of the current graph. If a 
descendant's id matches the given argument, the item is detached from its graph.  

`remove()` returns a visitor with a `results` array of all __parent__ graphs 
from which the target item has been detached. This allows for graph "refreshes" 
or migrations as necessary.

    // main -> a -> b -> c -> d
    // a -> c -> e

    var visitor = main.remove('c');
    visitor.results
    // => ['a', 'b']
    
__parents(id) - aka 'fan-in'__

`parents()` accepts a string id for an item in the graph, and finds all 
graphs in subgraph that depend on graph with given id. Found graphs are returned 
in the `visitor.results` array.

`parents()` always returns a `visitor` object with a `visitor.results' array.

    // main -> a -> b -> c -> d
    // a -> c -> e

    var visitor = main.parents('c');
    visitor.results
    // => ['a', 'b']
    
__subgraph() - aka 'fan-out'__

`subgraph()` traverses a graph's edges and their edges recursively, and returns 
all graphs visited in the `visitor.results` array. The current graph is __not__ 
included as a dependency in the subgraph.  

`subgraph()` always returns a `visitor` object with a `visitor.results' array.

    // main -> a -> b
    //              b -> d    
    //         a -> c -> e
    
    var visitor = main.subgraph();
    visitor.results
    // => ['a', 'b', 'd', 'c', 'e']
    
__size()__

`size()` returns the number of edges in the subgraph.

    // main -> a -> b
    //              b -> d -> e
    //         a -> c -> d -> e
    //              c -> e
    
    main.size();
    // => 8 arrows
    
__list(depth?)__

[ 5 AUG 2013 ] -- `list()` is currently a 'just for show' method. There's a 
straight-forward implementation commented out, and a visitor-based impl that 
adds [ 27 SEPT 2013 ] a `visitor.after()` method - meaning some AOP is creeping 
into the `resolve()` algorithm, so that definitely needs re-visiting (pun - sorry).

`list()` iterates over a graph and returns a string showing the graph and its 
subgraph, indented, something like:

    main.list()
    // =>
    
<pre>
 + main
   + a
     + b
       + c
         - d
         - e
       - d
     + c
       - d
       - e
   + b
     + c
       - d
       - e
     - d
   + c
     - d
     - e
</pre>


__sort()__

[16 DEC 2013] -- `sort()` uses `visitor` internally, and returns an array of ids 
found from the current graph being 'sorted' in depth-first order.

Call sort() on any graph element to retrieve the topo-sort for that element's 
subgraph.

    var main = simplegraph('main');
    var c = simplegraph('c');
    main.attach(c);
    
    // etc.
    
    var results;
    // either
    results = c.sort()
    // or
    results = main.find('c').sort();
    
    
tests
-----

Using [tape](https://github.com/substack/tape) to run tests from the node.js 
command line, and in order to use [testling](http://ci.testling.com/) from the
github service hook.

tape from the command line
--------------------------

    cd ./simplegraph
    
and either of these:

    npm test
    node ./test/suite.js
    
which will run both of these:

    node ./test/simple-test.js
    node ./test/big-fixture-test.js

The `big-fixture-test` generates over *2 million* graph items (currently 
2,001,001 items).  Though it's optimized to run fast, you can avoid it by 
running just the simple test:

    npm run simple

rawgithub test page
-------------------

In order to verify that the test suite runs locally or on rawgithub - and rather 
than re-create the tests using jasmine, QUnit, or what-have-you, I now [use 
browserify](http://browserify.org) to create a test-bundle starting with the 
test suite file itself.  This pulls in the `tape` module and its dependencies 
(there are many many many of them), plus the graph module and tests:

    cd ./simplegraph
    browserify ./test/suite.js -o ./browser-test/bundle.js
    
Use the alias for that command as defined in package.json:

    npm run bundle

The rawgithub page includes a `dom-console.js` shim that outputs console 
statements in the DOM, useful because tape outputs its results to 
`console.log()`.

__View the generated test-bundle page on 
<a href='//rawgithub.com/dfkaye/simplegraph/master/browser-test/suite.html' 
   target='_new' title='opens in new tab or window'>rawgithub</a>.__
   
TODO
----

+ __recursion by resolve/visitor is a huge problem with this implementation ~ 
    using it in attach() for root and parent checking has doubled creation times 
    for large graphs (15 seconds for 1 million items) ~ removing attach() from 
    big fixture setup altogether cuts creation time from 8 or 9 seconds down to 
    0.6 (!) ~ using new inside big fixture reduces time by another 100ms ~ using 
    it in size() takes 50x longer than procedural looping ~ look to convert 
    visitor recursion to iteration instead__ 
    (see http://blog.moertel.com/posts/2013-06-03-recursion-to-iteration-3.html)
+ refactor resolve() to take a properties object, a visit function, maybe an 
    after function, to reduce verbose visitor creation gack everywhere
+ add bulk attach capability ~ possibly a `load` method that runs attachment on 
    a (dare I say it) separate process or worker or iframe... or maybe an excuse 
    to try promises or streams...
+ add serialize() (and deserialize ?) support as part of that *(maybe)*    
+ _add code snippets for each method in the README (especially for visitor)_
+ _split up the tests into smaller method-specific files_
+ get off testling ~ testling is unreliable ~ shouldn't have to keep fixing
    their car, just rent another one
+ get off of tape, go with jasmine ~ travis works with jasmine-node
+ <del>_add topological sort_</del>
+ <del>rename `require`'d graph function to `simplegraph`</del>
+ <del>massive speed up of big-fixture setup using edges directly rather than 
    attach()</del>
+ <del>rename `dependants()` (items that depend on certain node) as `parents`</del>

__constructor__

+ unique ID constraint at Graph(id) ? (requires a map of ids on graph fn, or 
    another closure) -- __maybe a second param for the attach() method__

+ <del>remove `root` and `parent` support - *gad, what a mistake*</del>
+ <del>support a `root` field so we can `sort()` from the top by default</del>
+ <del>call resolve() on each attach() call for early cycle detection - needed 
    for root/parents</del>
+ <del>add the root property and attach/detach logic to reassign it</del>
+ <del>reformat the README markdown</del>
+ <del>npm publish - [done as simplegraph 12 DEC 2013] 
    [27 SEPT 2013] - simple-graph name was still available in 
    July, but is now taken... renaming to nested-graph [7 OCT 2013]
+ <del>rename nested-graph to simplegraph (no hyphen) [12 DEC 2103]</del>
+ <del>add data element support - </del> __won't do that - final answer__
+ <del>rethink the remove() method - id vs. graph  now uses id</del>
+ <del>reconsider visitor(), resolve() and fn argument. detached post-processing fn</del>
+ <del>better visitor pattern for resolve __done__</del>
+ <del>evict() - remove all occurrences of item from graph and dependants.  added</del>
+ <del>rethink success v error -- do we need both ?  only adds error field</del>
+ <del>reconsider the apply() method -- needed ? detached</del>
+ <del>evict() - revisit the arg type - graph vs. id?</del>
+ <del>evict() - revisit the return array - make use of the visitor()</del>
+ <del>fanIn() - no exception throwing - make better use of visitor, resolve</del>
+ <del>rename fanIn() as dependants()</del>
+ <del>add dependencies() method 'fan out'</del>
+ <del>add size() method</del>
+ <del>print() or toString() method for graph and edges only (else big fixture issue)</del>
+ <del>rename dependencies() to subgraph()</del>
+ <del>rename add() to attach()</del>
+ <del>rename remove() to detach()</del>
+ <del>rename evict() to delete()</del>
+ <del>rename delete() to remove()</del> - because delete is a keyword in certain browsers...

__visitor__

+ some AOP before/after/done is creeping in ~ need to re-examine this api

+ <del>refactor the visitor - set visitor.id to creating graph.id by default</del> 
+ <del>refactor the visitor, resolve the visitor.walk vs graph.resolve quarrel</del> 
  - decided in favor of graph.resolve() with a visitor which is really a 
    collecting parameter plus one or two utility methods
+ <del>add a done() method to terminate traversals instead of visitor.match</del>
+ <del>add an error() method to send visitor.errors to</del>
  - not implemented - opted to throw Errors on cycles after all.
+ <del>add a before/after distinction, or preprocess-depthprocess-postprocess chain</del>
  - done but may re-visit due to creeping AOP and/or inelegant API.

+ <del>6/2/13 - possible refactoring to try out</del> __24/06/13 - NO - these are bad ideas__

+ <del>let visitor have oncycle or onerror method</del>
+ <del>let delete, fanIn and others (cycle?) create a visitor with this method and decide what to do</del>
+ <del>then call resolve which will check visitor for oncycle and add error or call it if necessary.</del>
+ <del>rename resolve as visit; name cycle as resolve;</del>
