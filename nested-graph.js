
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
        return new Graph(id);
    }
    
    if (!id || typeof id != 'string') {
        throw new Error('Graph() requires non-empty string id argument.');
    }
    
    var graph = this;

    graph.id = id;
    graph.edges = [];
}

/*
 * attach child to current graph
 */
Graph.prototype.attach = attach;
function attach(node) {

    var graph = this;
    
    if (!(~graph.indexOf(node.id))) {
    
        graph.edges.push(node);
        return node;
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
    var node = false;
    var i = graph.indexOf(id);

    if (~i) {
        node = graph.edges.splice(i, 1)[0];
    }
    
    return node;
}


// traversal methods with resolve and visitor

/*
* detaches all occurrences of subgraph from the graph and its descendants.
* param string id - required id of the subgraph to be detachd
* returns an array of graphs from which the target has been detachd.
*/
Graph.prototype.remove = remove;
function remove(id) {

    var graph = this;
    
    var visitor = graph.visitor(function(graph) {
        
        if (graph.detach(visitor.id)) {
            visitor.results.push(graph);
        }
    });
    
    visitor.id = id;
    
    return graph.resolve(visitor);
}

/*
 * find all graphs in subgraph that depend on graph with given id.
 * param string id - required id for the target graph.
 * return a visitor with the results field as array of ids of graphs that depend on the target subgraph.
 */
Graph.prototype.dependants = dependants;
function dependants(id) {

    var graph = this;
    
    var visitor = graph.visitor(function(graph) {
        
        if (!visitor.visited[graph.id] && ~graph.indexOf(visitor.id)) {
            visitor.results.push(graph);
        }
    });
    
    visitor.id = id;
    
    return graph.resolve(visitor);
}

/*
 * find all graphs in subgraph that the graph with given id depends on.
 * return a visitor with the results field as array of ids of graphs under the target subgraph.
 */
Graph.prototype.subgraph = subgraph;
function subgraph() {

    var graph = this;
    var id = graph.id;

    var visitor = graph.visitor(function(graph) {
        
        if (!visitor.visited[graph.id] && visitor.id !== graph.id) {
            visitor.results.push(graph);
        }
    });
    
    visitor.id = id;
    
    return graph.resolve(visitor);
}

/*
 * size returns the number of results in the current graph *including the current graph*
 */
Graph.prototype.size = size;
function size() {

    var graph = this;
   
    return graph.subgraph().results.length + 1;
}

/*
 * find child or descendant with matching id
 * uses the visitor in order to avoid throwing errors
 * a single match terminates search
 */
Graph.prototype.find = find;
function find(id) {

    var graph = this;
    var node = false;
    
    var visitor = graph.visitor(function(graph) {
                            
        var index = graph.indexOf(id);
        
        if (~index) {
            node = graph.edges[index];
            
            // this terminates the search in resolve()
            visitor.done();
        }
    })
    
    graph.resolve(visitor);

    return node;
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
 * alternate version of list iterator - shows deficiency of depth first traversal
 * uses the visitor.after() post-process callback approach
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
* recursive visit through graph and subgraphs.
* sets an error field with an Error instance if a cycle is detected.
* param object visitor - optional - collector with interface provided by graph#visitor() method.
* returns visitor
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
 * return a visitor for use by the resolve() method
 *
 * TODO - looks like visitor wants to emerge as its own type
 *          not sure if visitor should be an external object with visitor.visit(graph) api,
 *          or should continue with graph.resolve(visitor)...
 */
Graph.prototype.visitor = visitor;
function visitor(fn) {

    return {
       
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
    
    assignment:
    
    visitor.after(fn);
    
    
    then in resolve():
    
    if (visitor.postprocess) {
        for (var i = 0; i < visitor.postprocess.length; ++i) {
            visitor.postprocess[i](graph);
        }
    }

*/