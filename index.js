const _ = require('lodash');
const { getMainDefinition } = require('./helpers');

const utils = require('./utils');

const isRootPath = path => path !== 0 && !path;

class GqlBuilder {
  static from(doc) {
    // for string doc, try to load from queryContainer
    if (_.isString(doc)) {
      try {
        return GqlBuilder.loadDocument(doc);
      } catch (err) {
        console.log('Invalid document input');
      }
    }
    const instance = new GqlBuilder();
    instance.doc = doc;
    return instance;
  }

  clone() {
    return GqlBuilder.from(_.cloneDeep(this.doc));
  }

  gql() {
    return this.doc;
  }

  toString() {
    return utils.print(this.doc);
  }

  getDefinition() {
    return getMainDefinition(this.doc);
  }

  // Gets/Sets to manupulate the gql doc
  getOperation() {
    return _.get(this.getDefinition(), 'operation');
  }

  setOperation(operation) {
    _.set(this.getDefinition(), 'operation', operation);
    return this;
  }

  update(path, ...values) {
    const childrenKey = 'selectionSet.selections';
    let [val] = values;
    if (values.length >= 2 && _.isString(values[0])) {
      // support prop, value format
      val = { [values[0]]: values[1] };
    }
    let target;
    // let parent = null;
    const definition = this.getDefinition();
    // support root path update
    if (values.length === 0) {
      target = _.first(_.get(definition, childrenKey, []));
      val = path;
    } else if (isRootPath(path)) {
      target = _.first(_.get(definition, childrenKey, []));
    } else {
      // navigate to a path
      target = definition;
      const paths = _.toPath(path);
      for (const level of paths) {
        const selections = _.get(target, childrenKey, []);
        const selection = _.find(selections, item => level === _.get(item, 'name.value'));
        if (selection) {
          // found node
          // parent = target;
          target = selection;
        } else {
          // not found
          console.log('not found');
        }
      }
    }
    if (!target) {
      throw Error('Could ot find ast node to apply change');
    }
    utils.updateSelection(
      target,
      utils.resolveValue(val, () => this),
    );
    return this;
  }
  // Gets/Sets to manupulate the gql doc

  static loadDocument = (() => {
    const queryContainer = new Map();
    return (...args) => {
      const [name, doc] = args;
      if (doc) {
        // for setting doc
        queryContainer.set(name, doc);
        return this;
      }
      // load doc via object[name: doc] array
      if (_.isArray(name)) {
        // _.pick style load support
        return name.map(key => GqlBuilder.loadDocument(key));
      } if (_.isObject(name)) {
        _.map(name, (val, key) => {
          GqlBuilder.loadDocument(key, val);
        });
        return this;
      }
      if (queryContainer.has(name)) {
        return GqlBuilder.from(queryContainer.get(name));
      } if (_.isString(name)) {
        // allow to use string gql format
        try {
          const doc = utils.parse(name);
          return GqlBuilder.from(doc);
        } catch (err) {}
      }
      throw Error(`Document [${name}] is not loaded`);
    };
  })();

  static utils = utils;
}

exports.GqlBuilder = GqlBuilder;
