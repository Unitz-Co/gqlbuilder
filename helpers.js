function invariant(cond, msg) {
  if (!cond) {
    throw Error(msg);
  }
}
module.exports.invariant = invariant;

function checkDocument(doc) {
  invariant(
    doc && doc.kind === 'Document',
    `Expecting a parsed GraphQL document. Perhaps you need to wrap the query
string in a "gql" tag? http://docs.apollostack.com/apollo-client/core.html#gql`
  );

  const operations = doc.definitions
    .filter((d) => d.kind !== 'FragmentDefinition')
    .map((definition) => {
      if (definition.kind !== 'OperationDefinition') {
        throw new Error(`Schema type definitions not allowed in queries. Found: "${definition.kind}"`);
      }
      return definition;
    });

  invariant(operations.length <= 1, `Ambiguous GraphQL document: contains ${operations.length} operations`);

  return doc;
}
module.exports.checkDocument = checkDocument;

function getMainDefinition(queryDoc) {
  checkDocument(queryDoc);

  let fragmentDefinition;

  for (const definition of queryDoc.definitions) {
    if (definition.kind === 'OperationDefinition') {
      const { operation } = definition;
      if (operation === 'query' || operation === 'mutation' || operation === 'subscription') {
        return definition;
      }
    }
    if (definition.kind === 'FragmentDefinition' && !fragmentDefinition) {
      // we do this because we want to allow multiple fragment definitions
      // to precede an operation definition.
      fragmentDefinition = definition;
    }
  }

  if (fragmentDefinition) {
    return fragmentDefinition;
  }

  throw new Error('Expected a parsed GraphQL query with a query, mutation, subscription, or a fragment.');
}

module.exports.getMainDefinition = getMainDefinition;
