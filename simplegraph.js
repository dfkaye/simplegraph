
// wrapped so we could try it in firebug/browser
if (typeof module != 'undefined' && module.exports) {
  module.exports = Graph;
}

/*
 * Graph constructor (new is optional)
 * param string id - required
 */
function Graph(id) {

  if (!(this instanceof Graph)) {
    return new Graph(id)
  }
  
  if (!id || typeof id != 'string') {
    throw new Error('Graph() requires non-empty string id argument.')
  }
  
  var graph = this;

  graph.id = id;
  graph.edges = [];
  graph.parents = [];
  graph.root = graph;  
}

/*
 * attach child to current graph
 */
Graph.prototype.attach = attach;
function attach(edge) {

  var graph = this;
  
  if (graph.indexOf(edge.id) === -1) {
  
    graph.edges.push(edge)
    
    if (edge.indexOf(graph.id) === -1) {
      edge.parents.push(graph.id);
    }
    
    var visitor = edge.visitor(function (edge) {
      edge.root = graph.root;
    });
    
    edge.resolve(visitor);
    
    return edge
  }
  
  return false;
}

/*
 * return index of child with matching id
 */
Graph.prototype.indexOf = indexOf;
function indexOf(id) {

  var graph = this;
  
  for (var i = 0; i < graph.edges.length; ++i) {
    if (graph.edges[i].id === id) {
      return i;
    }
  }
  
  return -1;
}

/*
 * detach child with matching id
 */
Graph.prototype.detach = detach;
function detach(id) {

  var graph = this;
  var edge = false;
  var i = graph.indexOf(id);

  if (i !== -1) {
  
    edge = graph.edges.splice(i, 1)[0];
    
    var visitor = graph.visitor(function (child) {
    
      child.parents = child.parents.splice(child.parents.indexOf(graph.id), 1);
      
      if (child.parents.length === 1) {
      
        child.root = edge;
        
        if (child.root === child) {
          child.parents = [];
        }        
      }
    });
    
    edge.resolve(visitor);
  }
  
  return edge;
}

// TRAVERSAL METHODS WITH RESOLVE AND VISITOR

/*
* @method remove detaches all occurrences of subgraph from the graph and its descendants.
* param string id - required id of the subgraph to be detachd
* returns an array of graphs from which the target has been detachd.
*/
Graph.prototype.remove = remove;
function remove(id) {

  var graph = this;
  
  var visitor = graph.visitor(function(graph) {
  
    // uses closure on id param
    
    if (graph.detach(id)) {
      visitor.results.push(graph);
    }
  });
  
  return graph.resolve(visitor);
}

/*
 * @method dependants finds all graphs in subgraph that depend on graph with given id.
 * @param string id - required id for the target graph.
 * @returns a visitor with the results field as array of ids of graphs that depend on the 
 *  target subgraph.
 */
Graph.prototype.dependants = dependants;
function dependants(id) {

  var graph = this;
  
  var visitor = graph.visitor(function(graph) {
  
    // uses closure on id param

    if (!visitor.visited[graph.id] && graph.indexOf(id) !== -1) {
      visitor.results.push(graph);
    }
  });
    
  return graph.resolve(visitor);
}

/*
 * @method subgraph finds all graphs in subgraph that the graph with given id depends on.
 * @returns a visitor with the results field as array of ids of graphs under the target 
 *  subgraph.
 */
Graph.prototype.subgraph = subgraph;
function subgraph() {

  var graph = this;

  var visitor = graph.visitor(function(graph) {
  
    // visitor.id is graph.id on which visitor was created
    
    if (!visitor.visited[graph.id] && visitor.id !== graph.id) {
      visitor.results.push(graph);
    }
  });
  
  return graph.resolve(visitor);
}

/*
 * @method size counts all graphs in subgraph, and includes the current graph.
 * @returns the number of results.
 */
Graph.prototype.size = size;
function size() {

  var graph = this;
 
  return graph.subgraph().results.length + 1;
}

/*
 * @method find locates child or descendant with matching id in the graph or its subgraph.
 *  Uses the visitor in order to avoid throwing errors.  First match terminates search.
 * @returns first matching child or descendant graph
 */
Graph.prototype.find = find;
function find(id) {

  var graph = this;
  var edge = false;
  
  var visitor = graph.visitor(function(graph) {
                        
    var index = graph.indexOf(id);
    
    if (index !== -1) {
      edge = graph.edges[index];
      
      // this terminates the search in resolve()
      visitor.done();
    }
  })
  
  graph.resolve(visitor);

  return edge;
}

// recursive print, copied+modified from Processing to JavaScript
// ch. 7 of Visualizing Data by Ben Fry, O'Reilly, 2007
/*Graph.prototype.list = list;
function list(depth) {
  
  var out = [];
  
  (typeof depth == 'number' && depth >= 0) || (depth = 0)
  
  for (var i = 0; i < depth; i++) {
      out.push('  '); // console
  }
  
  out.push(this.id); // console
  
  if (this.edges.length) {
  
    out.push(':\n');
    
    for (var i = 0; i < this.edges.length; i++) {
      out.push(this.edges[i].list(depth + 1)); // ye olde recursion...
    }

  } else {
    out.push('\n');
  }
  
  return out.join('');
}
*/

/*
 * @method list - alternate version of list iterator - shows deficiency of depth-first 
 *  traversal - uses the visitor.after() post-process callback approach.
 * @returns results array of visited graphs
 */
Graph.prototype.list = list;
function list() {

  var graph = this;
  var id = graph.id;

  var visitor = graph.visitor();

  visitor.depth = -1;
  
  visitor.process = function (graph) {
  
    visitor.depth += 2; // unset this after() visiting...
    
    for (var i = 0; i < visitor.depth; i++) {
      visitor.results.push(' ');
    }

    if (graph.edges.length > 0) {
      visitor.results.push('+');
    } else {
      visitor.results.push('-');
    }
    
    visitor.results.push(' ' + graph.id + '\n');
  }
  
  // post-processing
  visitor.after = function (graph) {
    visitor.depth -= 2;
  }
  
  return graph.resolve(visitor).results.join('');
}

/*
* @method resolve - performs a recursive visit through graph and subgraphs. Sets an error 
*   field with an Error instance if a cycle is detected.
* @param object visitor - optional - collector with interface provided by graph#visitor() 
*   method.
* @returns visitor
*/
Graph.prototype.resolve = resolve;
function resolve(visitor) {

  var graph = this;
  var id = graph.id;
  
  visitor = visitor || graph.visitor();
  
  if (!visitor.visited[id]) {

    visitor.ids.push(id);
    
    if (visitor.visiting[id]) {
      throw new Error('Circular reference detected: ' + visitor.ids.join(' -> '));
    }
  }

  // happy path
  
  visitor.visiting[id] = 1;

  if (typeof visitor.process == 'function') {
    visitor.process(graph);
  }
  
  // descend if didn't call done() 
  
  if (!visitor.exit) {
    for (var i = 0; i < graph.edges.length; ++i) {
      graph.edges[i].resolve(visitor);
    }
  }
  
  // post-processing
  
  if (typeof visitor.after == 'function') {
    visitor.after(graph);
  }
  
  visitor.visited[id] = 1;
  visitor.visiting[id] = 0;
  
  return visitor;
}

/*
 * @method visitor - creates a visitor for use by the resolve() method
 * @returns visitor object
 *
 * TODO - looks like visitor wants to emerge as its own type
 * - not sure if visitor should be an external object with visitor.visit(graph) api,
 * - or should continue with graph.resolve(visitor)...
 */
Graph.prototype.visitor = visitor;
function visitor(fn) {

  var graph = this;

  return {
    id: graph.id,
    ids: [],
    results: [],
    visited: {},
    visiting: {},
    done: function () {
      this.exit = true;
    },        
    process: fn,
    after: null
  };
}

/*
    {
      ...
      after: fn(fn) {
        this.postprocess || (this.postprocess = []);
        this.postprocess.push(fn);
    }
    
    // assignment:
    
    visitor.after(fn);
    
    // then in resolve():
    
    if (visitor.postprocess) {
      for (var i = 0; i < visitor.postprocess.length; ++i) {
        visitor.postprocess[i](graph);
      }
    }

*/