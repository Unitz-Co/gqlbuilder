const _ = require('lodash');
const { print, parse } = require('graphql/language');

const resolveValue = (val, ctx) => {
  if(_.isFunction(val)) {
    const cbCtx = resolveValue(ctx);
    return val.call(cbCtx, cbCtx);
  }
  return val;
};


const _mergeNode = (node, other, utils) => {
  const customizer = (objValue, srcValue) => {
    if (_.isArray(objValue)) {
      const rtn = [...objValue];
      const matcher = (node, otherNode) => {
        return (
          true
          && (_.get(node, 'kind') === _.get(otherNode, 'kind'))
          && (_.get(node, 'name.value') === _.get(otherNode, 'name.value'))
        )
      };
      const matchNode = (node) => {
        for(let index = 0; index < objValue.length; index++) {
          const item = objValue[index];
          if(matcher(node, item)) {
            return [item, index];
          }
        }
      }
      if(_.isArray(srcValue)) {
        for(const item of srcValue) {
          const found = matchNode(item);
          if(found) {
            const [foundNode, index] = found;
            // apply merging
            const merged = _mergeNode(foundNode, item, utils);
            rtn[index] = merged;
          } else {
            // new node, just push to the rtn
            rtn.push(item);
          }
        }
      }
      return rtn;
    }
  };
  const mergedData = _.mergeWith({ node } , { node: other }, customizer);
  return  mergedData.node;
};

const findNodeByPath = (node, path, childrenKey) => {
  // navigate to a path
  let target = node;
  let parent = null;
  let selectionIndex = -1;
  const foundPaths = [];
  const paths = _.toPath(path);
  childrenKey = childrenKey || 'selectionSet.selections';

  for(const level of paths) {
    const selections = _.get(target, childrenKey, []);
    selectionIndex = _.findIndex(selections, (item) => level === _.get(item, 'name.value'));
    if(selectionIndex > -1) {
      const selection = selections[selectionIndex];
      // found node
      parent = target;
      target = selection;
      foundPaths.push(..._.toPath(childrenKey), selectionIndex);
    } else {
      return null;
    }
  }
  return [target, parent, foundPaths];
};

const listLeafNodePaths = (node, childrenKey) => {
  const selections = _.get(node, childrenKey);
  const nodeName = _.get(node, 'name.value');
  if(_.get(selections, 'length')) {
    const subPathsWithNodeName = selections.map(node => {
      const subPaths = listLeafNodePaths(node, childrenKey);
      return subPaths.map(item => [nodeName, ..._.castArray(item || [])]);
    });
    return _.flatten(subPathsWithNodeName);
  } else {
    // this is the leaf node, just return the name of the node
    return [nodeName];
  }
};

const createContainerNode = (node, childrenKey) => {
  const containerNode = {};
  _.set(containerNode, childrenKey, node);
  return containerNode;
};

const isSelectionString = (str) => {
  // @TODO: update regex
  return ((str.indexOf('{') > -1) && (str.indexOf('}') > -1));
};

function stringify(obj_from_json) {
  if (false && obj_from_json instanceof EnumType) {
      return obj_from_json.value;
  }
  // variables should be prefixed with dollar sign and not quoted
  // else if (obj_from_json instanceof VariableType) {
  //     return `$${obj_from_json.value}`;
  // }
  // Cheers to Derek: https://stackoverflow.com/questions/11233498/json-stringify-without-quotes-on-properties
  else if (typeof obj_from_json !== 'object' || obj_from_json === null) {
      // not an object, stringify using native function
      return JSON.stringify(obj_from_json);
  }
  else if (Array.isArray(obj_from_json)) {
      return `[${obj_from_json.map((item) => stringify(item)).join(', ')}]`;
  }
  // Implements recursive object serialization according to JSON spec
  // but without quotes around the keys.
  const props = Object
      .keys(obj_from_json)
      .map((key) => `${key}: ${stringify(obj_from_json[key])}`)
      .join(', ');

  return `{${props}}`;
}

const objToArgsNode = (obj) => {  
  let rtn = _.trim(stringify(obj));
  rtn = rtn.slice(1, rtn.length - 1);
  return rtn;
}


const utils = {
  // utils functions for alias node
  alias: {
    strToAst: (str) => {
      try {
        const queryDoc = parse(`query args { args (${str}){ id } }`);
        return _.get(queryDoc, 'definitions.0.selectionSet.selections.0.arguments');  
      } catch (err) {
        throw Error(`Parsing alias string "${str}" error`);
      }
    },
    astToStr: (ast) => {

    },
  },
  // utils functions for arguments node
  arguments: {
    isAst: (val) => {
      return (true
        && _.isArray(val)
        && (!val.length || _.every(val, item => _.has(item, 'name')))
      );
    },
    toAst: (val) => {
      if(!val) return [];
      if(_.isString(val)) {
        return utils.arguments.strToAst(val);
      } else if(_.isPlainObject(val)) {
        return utils.arguments.strToAst(objToArgsNode(val));
      } else if(utils.arguments.isAst(val)) {
        return val;
      }
      throw Error(`Unknown arguments input: ${val}`);
    },
    strToAst: (str) => {
      try {
        const queryDoc = parse(`query args { args (${str}){ id } }`);
        return _.get(queryDoc, 'definitions.0.selectionSet.selections.0.arguments');
      } catch(err) {
        throw Error(`Parsing arguments string "${str}" error`);
      }
    },
    astToStr: (ast) => {
      try {
        const queryDoc = parse(`query args { args }`);
        _.set(queryDoc, 'definitions.0.selectionSet.selections.0.arguments', ast);
        let str = print(queryDoc);
        str = str.slice((`query args {`.length), -2);
        str = str.trim();
        str = str.slice((`args(`.length), -1);
        return str;
      } catch (err) {
        throw Error(`Parsing arguments ast "${ast}" error`);
      }
    },
    // merge 2 arguments nodes
    merge: (node, other) => {
      node = utils.arguments.toAst(node);
      other = utils.arguments.toAst(other);

      const merged = utils.mergeNode(node, other);
      return merged;
    },

    remove: (node, path) => {
      const childrenKey = 'value.fields';
      const containerNode = createContainerNode(node, childrenKey);
      _.set(containerNode, childrenKey, node);
      // normalize path
      if(isSelectionString(path)) {
        // generate array of paths from path selection node
        const pathSelectionNode = createContainerNode(utils.selections.toAst(path), childrenKey);
        const pathsList = listLeafNodePaths(pathSelectionNode, childrenKey);
        // apply remove node for each item in pathsList
        pathsList.map(item => {
          // skip first item cause it is the container name which is undefined
          const itemPath = _.slice(item, 1);
          if(itemPath.length) {
            utils.arguments.remove(node, itemPath);
          }
        })
        return node;
      }
      const found = findNodeByPath(containerNode, path, childrenKey);

      if(found) {
        const [, , foundPaths] = found;
        const index = foundPaths.pop();
        if(index > -1) {
          _.update(containerNode, foundPaths, items => {
            items.splice(index, 1);
            return items;
          });  
          // auto remove parent args if empty
          if(!_.get(containerNode, [...foundPaths, 'length'])) {
            const parentPath = _.toPath(path);
            parentPath.pop();
            if(parentPath.length) {
              utils.arguments.remove(node, parentPath);
            }
          }
        }
      } else {
        // not found, show warning?
        console.warn(`Could not find args path [${path}]. No changes are applied`);
      }
      return node;
    },

    set: (node, ...args) => {
      const childrenKey = 'value.fields';
      if(!args.length) {
        throw Error('set selection error: missing value argument');
      }
      if(args.length === 1) {
        const [value] = args;
        const newVal = utils.arguments.toAst(value);
        // set value to current selection
        node.splice(0, node.length, ...newVal);
        return node;  
      } else {
        const [path, value] = args;
        const newVal = utils.arguments.toAst(value);
    
        const containerNode = createContainerNode(node, childrenKey);
        const found = findNodeByPath(containerNode, path, childrenKey);
        if(found) {
          const [, , foundPaths] = found;
          const index = foundPaths.pop();
          if(index > -1) {
            _.set(containerNode, [...foundPaths, index], newVal);
          }
        } else {
          console.log(`Arguments for "${path}" not found`);
        }
      }
      return node;
    },

  },
  // utils functions for selections node
  selections: {
    isAst: (val) => {
      return (true
        && _.isArray(val)
        && (!val.length || _.every(val, item => _.has(item, 'name')))
      );
    },
    toAst: (val) => {
      if(!val) return [];
      if(_.isString(val)) {
        return utils.selections.strToAst(val);
      } else if(utils.selections.isAst(val)) {
        return val;
      } else if(_.isArray(val)) {
        // array of selection in string, join then concat
        return _.flatten(val.map(item => utils.selections.toAst(item)));
      }
      throw Error(`Unknown selections input: ${val}`);
    },
    strToAst: (str) => {
      try {
        const queryDoc = parse(`query selections { selections { ${str} } }`);
        return _.get(queryDoc, 'definitions.0.selectionSet.selections.0.selectionSet.selections');  
      } catch (err) {
        throw Error(`Parsing selections string "${str}" error`);
      }
    },
    astToStr: (ast) => {
      try {
        const queryDoc = parse(`query selections { selections }`);
        _.set(queryDoc, 'definitions.0.selectionSet.selections', ast);
        let str = print(queryDoc);
        str = str.slice((`query selections {`.length - 1), -1);
        return str;
      } catch (err) {
        throw Error(`Parsing selections ast "${ast}" error`);
      }
    },
    // merge 2 selections nodes
    merge: (node, other) => {
      node = utils.selections.toAst(node);
      other = utils.selections.toAst(other);

      const merged = utils.mergeNode(node, other);
      return merged;
    },

    remove: (node, path) => {
      const childrenKey = 'selectionSet.selections';
      const containerNode = createContainerNode(node, childrenKey);
      _.set(containerNode, childrenKey, node);
      // normalize path
      if(isSelectionString(path)) {
        // generate array of paths from path selection node
        const pathSelectionNode = createContainerNode(utils.selections.toAst(path), childrenKey);
        const pathsList = listLeafNodePaths(pathSelectionNode, childrenKey);
        // apply remove node for each item in pathsList
        pathsList.map(item => {
          // skip first item cause it is the container name which is undefined
          const itemPath = _.slice(item, 1);
          if(itemPath.length) {
            utils.selections.remove(node, itemPath);
          }
        })
        return node;
      }
      const found = findNodeByPath(containerNode, path, childrenKey);
      if(found) {
        const [, , foundPaths] = found;
        const index = foundPaths.pop();
        if(index > -1) {
          _.update(containerNode, foundPaths, items => {
            items.splice(index, 1);
            return items;
          });  
        }
      } else {
        // not found, show warning?
      }
      return node;
    },

    set: (node, ...args) => {
      const childrenKey = 'selectionSet.selections';
      if(!args.length) {
        throw Error('set selection error: missing value argument');
      }
      if(args.length === 1) {
        const [value] = args;
        const newVal = utils.selections.toAst(value);
        // set value to current selection
        node.splice(0, node.length, ...newVal);
        return node;  
      } else {
        const [path, value] = args;
        const newVal = utils.selections.toAst(value);

        const containerNode = createContainerNode(node, childrenKey);
        const found = findNodeByPath(containerNode, path, childrenKey);
        if(found) {
          const [, , foundPaths] = found;
          const index = foundPaths.pop();
          if(index > -1) {
            _.set(containerNode, [...foundPaths, index], newVal);
          }
        } else {
          console.log(`Selection for path "${path}" not found`);
        }
      }
      return node;  
    },

  },

  updateSelection: (sel, prop, val) => {
    if(_.isString(prop)) {
      if(prop === 'alias') {
        const getContext = () => ({
          node: sel[prop],
          value: _.get(sel, [prop, 'value']),
        });
        _.set(sel, prop, { kind: 'Name', value: resolveValue(val, getContext) });
      } else if(prop === 'name') {
        const getContext = () => ({
          node: sel[prop],
          value: _.get(sel, [prop, 'value']),
        });
        _.set(sel, [prop, 'value'], resolveValue(val, getContext));
      } else if(prop === 'arguments') {
        let node = _.get(sel, 'arguments', []);
        let updatedVal = val;
        if(_.isFunction(updatedVal)) {
          const getContext = () => ({
            value: utils.arguments.astToStr(node),
            node: {
              merge: (...args) => utils.arguments.merge(node, ...args),
              set: (...args) => utils.arguments.set(node, ...args),
              remove: (...args) => utils.arguments.remove(node, ...args),
              node,
            }
          });
          updatedVal = resolveValue(updatedVal, getContext);
        }
        // build arguments node
        updatedVal = utils.arguments.toAst(updatedVal);

        _.set(sel, 'arguments', updatedVal);
      } else if(prop === 'selections') {
        let node = _.get(sel, 'selectionSet.selections', []);
        let updatedVal = val;

        if(_.isFunction(updatedVal)) {
          const getContext = () => ({
            value: utils.selections.astToStr(node),
            node: {
              merge: (...args) => utils.selections.merge(node, ...args),
              set: (...args) => utils.selections.set(node, ...args),
              remove: (...args) => utils.selections.remove(node, ...args),
              node,
            },
          });
          updatedVal = resolveValue(updatedVal, getContext);
        }

        updatedVal = utils.selections.toAst(updatedVal);

        _.set(sel, 'selectionSet.selections', updatedVal);
      }
    } else if(_.isPlainObject(prop)){
      Object.keys(prop).map((key) => {
        const val = prop[key];
        utils.updateSelection(sel, key, val);
      });
    } 
  },
  resolveValue,
  print,
  parse,

  mergeNode: (node, other) => {
    const customizer = (objValue, srcValue) => {
      if (_.isArray(objValue)) {
        const rtn = [...objValue];
        const matcher = (node, otherNode) => {
          return (
            true
            && (_.get(node, 'kind') === _.get(otherNode, 'kind'))
            && (_.get(node, 'name.value') === _.get(otherNode, 'name.value'))
          )
        };
        const matchNode = (node) => {
          for(let index = 0; index < objValue.length; index++) {
            const item = objValue[index];
            if(matcher(node, item)) {
              return [item, index];
            }
          }
        }
        if(_.isArray(srcValue)) {
          for(const item of srcValue) {
            const found = matchNode(item);
            if(found) {
              const [foundNode, index] = found;
              // apply merging
              const merged = utils.mergeNode(foundNode, item);
              rtn[index] = merged;
            } else {
              // new node, just push to the rtn
              rtn.push(item);
            }
          }
        }
        return rtn;
      }
    };
    const mergedData = _.mergeWith({ node } , { node: other }, customizer);
    return  mergedData.node;
  },
  
};

module.exports = utils;
