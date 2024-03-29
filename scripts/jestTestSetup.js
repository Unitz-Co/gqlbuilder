// import _ from 'lodash';
const gql = require('graphql-tag');
const { GqlBuilder } = require('../index');


if (!console.snapshot) {
  console.snapshot = (...args) => {
    console.log(...args);
    expect({ args }).toMatchSnapshot();
  };
}

GqlBuilder.loadDocument({
  QueryNewUsers: gql(`
    query QueryNewUsers {
      user(where: { presence: { status: { _eq: "new" } } }) {
        id
        presence {
          id
          status
        }
        profile {
          id
          display_name
        }
      }
    }
  `)
});

// change timeout
jest.setTimeout(10 * 1000);
