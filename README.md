simplegraph
============

make a simple graph structure (used to be "simple-graph")

justify
-------

Everyone should figure out at least one directed acyclic graph data structure in 
JavaScript.  Here's mine.

__Thanks to Ferry Boender__ for his post on the 
[dependency resolving algorithm](http://www.electricmonk.nl/log/2008/08/07/dependency-resolving-algorithm/),
and for his ongoing encouragement in this exploration.

what makes it simple?
---------------------

What makes this implementation of the graph *simple* is that there is no concept
of a *node* - that is, every graph contains edges which is an array of other 
*graphs*.

travis
------

[![Build Status](https://travis-ci.org/dfkaye/simplegraph.png)](https://travis-ci.org/dfkaye/simplegraph)

testling
--------

[![browser support](https://ci.testling.com/dfkaye/simplegraph.png)](https://ci.testling.com/dfkaye/simplegraph)

Using [tape](https://github.com/substack/tape) to run tests from the node.js 
command line, and in order to use [testling](http://ci.testling.com/) from the
github service hook.

tape from the command line
--------------------------

    cd ./simplegraph
    
and either of these:

    npm test
    node ./test/suite.js
    
rawgithub test page
-------------------

Testling has become unreliable for reasons I'm no longer interested in solving, 
and I shouldn't have to bug them about it, or clone the service and fix it.  

Sometimes the car should just drive, and if it can't, rent another one.  

In this case, __*don't ask why; use browserify.*__

In order to verify that the test suite runs locally or on rawgithub - and rather 
than re-create the tests using jasmine, QUnit, or what-have-you, I now [use 
browserify](http://browserify.org) to create a test-bundle starting with the 
test suite file itself.  This pulls in the tape module and its dependencies 
(there are many), plus the graph module and tests:

    cd ./simplegraph
    browserify test/suite.js -o browser/test-bundle.js
    
Use the alias for that command as in package.json:

    npm run-script 'bundle'

__View the generated test-bundle page on <a href='//rawgithub.com/dfkaye/simplegraph/master/browser/test-bundle.html' 
     target='_new' title='opens in new tab or window'>
  rawgithub</a>.__
  
goals
-----

Needed this to work out some dependency loading trivia.  Also need it to be fast.

The graph children methods use procedural code (for-loops) rather than iterator 
functions in order to support IE6-8 -- and execute a little faster (iterators 
run just under an order of magnitude slower).  

The resolve (traversal) methods use visitor iteration methods internally.

structure
---------

A graph contains an array of *edges* (other graphs).  The required constructor 
argument is a string *id*.  *may be adding a root property*

These are the only constructor-created properties. 
The constructor can be called with or without the *new* keyword. 

No graph data element stored in a graph element - __final answer__

methods
-------

__attach(graph)__

attach() accepts a graph object as a child in the current graph.

If adding a graph that is already a child, attach() returns __false__; else it returns 
the added child.

__detach(id)__

detach() accepts a string id for the child in the current graph.

If a child matching the id is not found, detach() returns __false__; else it returns
the detached child.

__indexOf(id)__

indexOf() accepts a string id for the target child of a graph.  If a child is 
found matching the id, the child is returned; else indexOf() returns __-1__.

__find(id)__

find() accepts a string id for the target descendant of a graph. If a child or 
descendant is found matching the id, the found target is returned; else find() 
returns __false__.

__remove(id)__

remove() accepts a string id for the target as a child in the current graph or as 
a descendant within any subgraph.

remove() visits every child and descendant of the current graph.  If a descendant's id
matches the given argument, the item is detached from its graph.  

remove() returns an array of all *parent* graphs from which the target item has been detached.
This allows for graph "refreshes" or migrations as necessary.

__visitor(fn?)__

Any graph object can create a visitor() object. A visitor will have an *ids* 
array, *visited* map and *visiting* map, an empty results array, and a *done* 
method by default.  

The visitor method can optionally take a *process* function argument.  The process 
will run on the current graph being visited, before descending to edges.

The visitor object is used internally by the resolve() method for tracking visited
subgraphs, and throwing an *error* if a cycle is detected.

__resolve(visitor?)__

Any graph object can be resolved independently with the resolve() method.  The 
resolve() method optionally accepts a visitor object.  If one is not specified,
resolve() creates one for use internally from the graph on which the resolve() 
method is first called.

__about cycle detection:__

The resolve() method returns a visitor object, unless it throws an error when a 
cycle is detected.

__dependants(id) - aka 'fan-in'__

dependants() accepts a string id for an item in the graph, and finds all graphs 
in subgraph that depend on graph with given id.  Found graphs are returned in the 
visitor*.results* array.

dependants() always returns a visitor object with a visitor*.results* field array.

__subgraph() - aka 'fan-out'__

subgraph() traverses a graph's edges and their edges recursively, and returns 
all graphs visited in the visitor.*results* array.  The current graph is *not* 
included as a dependency in the subgraph.  

subgraph() always returns a visitor object with a visitor*.results* field array.

__size()__

size() uses subgraph() internally and returns the number of subgraph plus
the current graph itself.

__list(depth?)__

[ 5 AUG 2013 ] -- list() is currently a 'just for show' method. There's a 
straight-forward implementation commented out, and a visitor-based impl that 
adds [ 27 SEPT 2013 ] a visitor.after() method -- meaning some AOP is creeping 
into the resolve() algorithm, so that definitely needs re-visiting (pun - sorry).

list() iterates over a graph and returns a string showing the graph and its 
subgraph - indented, something like:

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
  
TODO
----

+ reformat the README markdown
+ rename dependants() - items that depend on certain node
+ npm publish - [27 SEPT 2013] - simple-graph name was still available in July, 
    but is now taken... renaming to simplegraph [7 OCT 2013]
+ add serialize and deserialize support ?
+ add topological sorting !!

__constructor__
+ call resolve() on each attach() call for early cycle detection ?
+ unique ID constraint at Graph(id) ?
+ support a *root* field so we can always start at the top ?

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

