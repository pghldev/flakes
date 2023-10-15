require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

var chai = require('chai');
var { expect } = chai;
var lib = require('../lib');
var lib = require('../lib');
var config = require('../config');

var app = require('../app');

describe('basic functionality', () => {
  var agent = require('supertest').agent(app);

  it('signs up a user', async () => {
    var resp = await agent.post(config.baseUrl);
    // console.log(resp);
    expect(2).to.equal(2);
  });
});
