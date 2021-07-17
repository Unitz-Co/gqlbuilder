const _ = require('lodash');
const { GqlBuilder } = require('../index');

describe('gqlbuilder', () => {
  const query = GqlBuilder.from('QueryNewUsers');

  test('update alias', () => {
    console.snapshot(query.clone().update('user.presence', { alias: 'newalPre' }).toString());

    console.snapshot(query.clone().update('user', { alias: 'myuser' }).toString());

    console.snapshot(query.clone().update({ alias: 'rootuser' }).toString());
  });

  test('set selection', () => {
    console.snapshot(query.clone().update({ selections: 'user { id }' }).toString());

    console.snapshot(query.clone().update({ selections: 'user { id profile { id display_name } }' }).toString());

    console.snapshot(
      query
        .clone()
        .update({ selections: () => 'user { id profile { id display_name } }' })
        .toString(),
    );

    console.snapshot(query.clone().update('user', { selections: 'user_by_pk { id }' }).toString());

    console.snapshot(
      query.clone().update('user', { selections: 'user_by_pk { id profile { id display_name } }' }).toString(),
    );

    console.snapshot(query.clone().update('user', { selections: 'user_by_pk(id: "user_id") { id }' }).toString());

    console.snapshot(
      query
        .clone()
        .update('user', { selections: 'user_by_pk(id: "user_id") { id profile { id display_name } }' })
        .toString(),
    );

    console.snapshot(
      query
        .clone()
        .update('user', { selections: () => 'user_by_pk(id: "user_id") { id profile { id display_name } }' })
        .toString(),
    );

    console.snapshot(query.clone().update('user.profile', { selections: 'id display_name avatar_url' }).toString());

    console.snapshot(
      query.clone().update('user.profile', { selections: 'id display_name avatar_url(limit: 1)' }).toString(),
    );

    console.snapshot(
      query
        .clone()
        .update('user.profile', { selections: () => 'id display_name avatar_url(limit: 1)' })
        .toString(),
    );
  });

  // test('update alias nested selection', () => {
  //   // expect(sum(1, 2)).toMatchSnapshot();
  //   const myQuery = query.clone()
  //     .update('user.presence', { alias: 'newalPre' })
  //   console.snapshot(myQuery.toString());

  //   const myQuery = query.clone()
  //     .update('user', { alias: 'myuser' })

  //     console.snapshot(myQuery.toString());

  // });
});

// const myQuery = query.clone()
//   .update('user.presence', { alias: 'newalPre' })
//   .update('user', { alias: 'newUser' })
//   .update('user', { arguments: ({ node }) => node.merge(`where: {uid: "123123", presence: {status: {_eqt: "newxasd", _ne: "masdbcsdc", _if: { _t: "123213" }}}}`) })
//   .update('user', { arguments: ({ node }) => node.remove(`where.presence.status._eqt`) })
//   // .update('user', { arguments: ({ node }) => node.remove(`where`) })
//   // .update('user', { arguments: ({ node }) => node.set(`where`) })
//   // .update('user', { arguments: ({ node }) => node.set('where.presence', `presencexy: { status: "12332" }`)
//   .update('user', { arguments: ({ node }) => node.merge(({ presencexxx: { x: 1, y: 234 }})) })
//   // .update('user', { arguments: ({ node }) => node.set('where.presence', ({
//   //   presence: {
//   //     status: "12341234",
//   //     boolTrue: true,
//   //     boolFalse: false,
//   //     number0: 0,
//   //     numberAny: 1234,
//   //     stringQuote: 'quote',
//   //     stringDoubleQuote: "quoqoq",
//   //     numberText: '1',
//   //     numberText0: '0',
//   //     arr: [1, 2, "b", "d", { cstr: "cst", cnum: 1 }],
//   //     nestedObj: {
//   //       nestProp: '1',
//   //     }
//   //   },
//   //   sibling: "number",
//   // })) })

//   .update('user.presence', { arguments: `order: "ast"` })
//   .update('user.presence', { arguments: ({ node }) => node.merge(`sort: "xyz"`) })
//   .update('user.presence', 'arguments', ({ node }) => node.merge(`sort: "xyzt"`))
//   // .update('user.presence', { selections: ({ node }) => node.merge(`id, name, status`) })
//   // .update('user.presence', { selections: ({ node }) => node.merge(`id, name`) })
//   .update('user.presence', 'selections', ({ node }) => node.merge(`id, name`) )
//   .update('user.presence', { selections: ({ node }) => node.merge(`name`) })
//   // .update('user.presence', { selections: ({ node }) => node.merge(`id, status`) })
//   .update('user.presence', { selections: ({ node }) => node.merge(`status { lastUpdate }`) })
//   .update('user.presence', { selections: ({ node }) => node.merge(`status { isOffline }`) })
//   .update('user.presence', { selections: ({ node }) => node.merge(`node1 {id, name, status}`) })
//   .update('user.presence', { selections: ({ node }) => node.merge(`node2 {id, name}`) })
//   .update('user.presence', { selections: ({ node }) => node.merge(`node2 {status}`) })
//   // .update('user', { selections: ({ node }) => node.remove(`presence.name`) })
//   .update('user', { selections: ({ node }) => node.remove(`presence { id }`) })
//   .update('user', { selections: ({ node }) => node.remove(`presence { node2 { id, name } }`) })
//   .update('user.presence', { selections: ({ node }) => node.set('node1', `node1 { new }`) })
//   // .update('user', { selections: ({ node }) => node.add(`newobjec.id`) })

// console.log('myQuerymyQuery', myQuery.toString());
